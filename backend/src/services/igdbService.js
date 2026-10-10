const axios = require('axios');
const { getAccessToken } = require('./igdbAuth');

// Monto la URL de una imagen de IGDB. "tamano" es una plantilla de IGDB:
// t_cover_big (portada), t_screenshot_big (captura), t_1080p (captura grande)...
function urlImagen(imageId, tamano) {
  return `https://images.igdb.com/igdb/image/upload/${tamano}/${imageId}.jpg`;
}

// Mando una consulta en Apicalypse (el lenguaje de IGDB) a un endpoint de IGDB
async function igdbPost(endpoint, body) {
  const accessToken = await getAccessToken();

  const response = await axios.post(`https://api.igdb.com/v4/${endpoint}`, body, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'text/plain',
    },
  });

  return response.data;
}

async function searchGames(query) {
  // El texto va entre comillas dentro de la consulta: escapo \ y " para que lo que
  // escriba el usuario no pueda cerrar la cadena ni meter instrucciones propias
  const texto = query.replace(/[\\"]/g, '\\$&');

  return igdbPost(
    'games',
    `search "${texto}"; fields name, cover.image_id, platforms.name, first_release_date; limit 10;`
  );
}

// "empresa.campo" hace que IGDB expanda la relación y me traiga ese dato, como un
// JOIN en SQL. involved_companies une el juego con sus empresas y trae dos
// booleanos: developer y publisher.
const CAMPOS_DETALLE = [
  'name',
  'summary',
  'first_release_date',
  'cover.image_id',
  'genres.name',
  'platforms.name',
  'game_modes.name',
  'involved_companies.developer',
  'involved_companies.publisher',
  'involved_companies.company.name',
  'total_rating',
  'total_rating_count',
  'screenshots.image_id',
  'url',
].join(', ');

// Cacheo las fichas en memoria: los datos de un juego casi nunca cambian y IGDB
// limita a 4 peticiones por segundo. La caché se vacía al reiniciar el servidor.
const DURACION_CACHE_MS = 60 * 60 * 1000; // 1 hora
const MAX_CACHE = 200;
const cacheDetalles = new Map(); // igdbId -> { game, caducaEn }

// Interpolo igdbId en la consulta, así que el controlador tiene que validarlo
// antes como entero
async function getGameDetails(igdbId) {
  const guardado = cacheDetalles.get(igdbId);
  if (guardado && Date.now() < guardado.caducaEn) {
    return guardado.game;
  }

  const resultados = await igdbPost('games', `fields ${CAMPOS_DETALLE}; where id = ${igdbId};`);
  const game = resultados[0] ?? null;

  if (game) {
    if (cacheDetalles.size >= MAX_CACHE) {
      // Si está llena borro la entrada más antigua (un Map conserva el orden de inserción)
      cacheDetalles.delete(cacheDetalles.keys().next().value);
    }
    cacheDetalles.set(igdbId, { game, caducaEn: Date.now() + DURACION_CACHE_MS });
  }

  return game;
}

// Ilustraciones oficiales (artworks) de varios juegos a la vez. Una sola consulta
// con "where id = (1,2,3)" en vez de una por juego, porque IGDB limita a 4
// peticiones por segundo. Devuelve un Map igdbId -> lista de image_id (vacía si
// el juego no tiene ilustraciones). Cacheo cada juego una hora, como las fichas.
// Las ids se interpolan en la consulta: el controlador tiene que pasarlas ya como
// enteros.
const cacheArtworks = new Map(); // igdbId -> { imageIds, caducaEn }
const MAX_CACHE_ARTWORKS = 1000;
const LOTE_ARTWORKS = 500; // IGDB devuelve como máximo 500 resultados por consulta

async function getArtworks(igdbIds) {
  const resultado = new Map();
  const pendientes = [];

  for (const id of igdbIds) {
    const guardado = cacheArtworks.get(id);
    if (guardado && Date.now() < guardado.caducaEn) {
      resultado.set(id, guardado.imageIds);
    } else {
      pendientes.push(id);
    }
  }

  for (let i = 0; i < pendientes.length; i += LOTE_ARTWORKS) {
    const lote = pendientes.slice(i, i + LOTE_ARTWORKS);
    const juegos = await igdbPost(
      'games',
      `fields artworks.image_id; where id = (${lote.join(',')}); limit ${LOTE_ARTWORKS};`
    );

    // IGDB no devuelve la clave "artworks" si el juego no tiene: lo trato como []
    const porId = new Map(juegos.map((j) => [j.id, (j.artworks ?? []).map((a) => a.image_id)]));

    for (const id of lote) {
      const imageIds = porId.get(id) ?? [];
      if (cacheArtworks.size >= MAX_CACHE_ARTWORKS) {
        cacheArtworks.delete(cacheArtworks.keys().next().value);
      }
      cacheArtworks.set(id, { imageIds, caducaEn: Date.now() + DURACION_CACHE_MS });
      resultado.set(id, imageIds);
    }
  }

  return resultado;
}

// IGDB devuelve como máximo 500 resultados por consulta
const LOTE_IGDB = 500;


// Empareja ids de juegos de Steam (appid) con juegos de IGDB. IGDB guarda en
// "external_games" los identificadores de cada juego en otras tiendas;
// external_game_source = 1 es Steam y "uid" el appid (como texto).
// Devuelve un Map appid -> igdbId (los juegos sin equivalente en IGDB no salen).
// Los appid se interpolan en la consulta: los paso por Number.isInteger antes.
async function getIgdbIdsDeSteam(appids) {
  const resultado = new Map();
  const validos = appids.filter((id) => Number.isInteger(id) && id > 0);

  for (let i = 0; i < validos.length; i += LOTE_IGDB) {
    const lote = validos.slice(i, i + LOTE_IGDB);
    const filas = await igdbPost(
      'external_games',
      `fields game, uid; where external_game_source = 1 & uid = (${lote.map((id) => `"${id}"`).join(',')}); limit ${LOTE_IGDB};`
    );

    for (const fila of filas) {
      if (fila.game) resultado.set(Number(fila.uid), fila.game);
    }
  }

  return resultado;
}

// Género, empresas, fecha y nota de varios juegos a la vez, para filtrar y ordenar la
// biblioteca: Map igdbId -> { genres, developers, publishers, release_date, rating }.
// Un juego que IGDB no devuelve (id retirado) no sale en el Map: quien llama decide
// qué hacer. Igual que en las demás, las ids se interpolan: tienen que ser enteros.
async function getMetadatos(igdbIds) {
  const resultado = new Map();
  const validos = igdbIds.filter((id) => Number.isInteger(id) && id > 0);

  for (let i = 0; i < validos.length; i += LOTE_IGDB) {
    const lote = validos.slice(i, i + LOTE_IGDB);
    const juegos = await igdbPost(
      'games',
      `fields genres.name, involved_companies.developer, involved_companies.publisher, involved_companies.company.name, first_release_date, total_rating; where id = (${lote.join(',')}); limit ${LOTE_IGDB};`
    );

    for (const juego of juegos) {
      const empresas = juego.involved_companies ?? [];
      const conRol = (rol) => empresas.filter((e) => e[rol] && e.company).map((e) => e.company.name);

      resultado.set(juego.id, {
        genres: (juego.genres ?? []).map((g) => g.name),
        developers: conRol('developer'),
        publishers: conRol('publisher'),
        // IGDB da la fecha en segundos Unix; la paso a "AAAA-MM-DD"
        release_date: juego.first_release_date
          ? new Date(juego.first_release_date * 1000).toISOString().slice(0, 10)
          : null,
        rating: juego.total_rating ? Math.round(juego.total_rating) : null,
      });
    }
  }

  return resultado;
}

// Nombre y portada de varios juegos a la vez: Map igdbId -> { name, imageId }.
// Igual que en getArtworks, las ids se interpolan: tienen que llegar como enteros.
async function getJuegosBasicos(igdbIds) {
  const resultado = new Map();
  const validos = igdbIds.filter((id) => Number.isInteger(id) && id > 0);

  for (let i = 0; i < validos.length; i += LOTE_IGDB) {
    const lote = validos.slice(i, i + LOTE_IGDB);
    const juegos = await igdbPost(
      'games',
      `fields name, cover.image_id; where id = (${lote.join(',')}); limit ${LOTE_IGDB};`
    );

    for (const juego of juegos) {
      resultado.set(juego.id, { name: juego.name, imageId: juego.cover?.image_id ?? null });
    }
  }

  return resultado;
}

module.exports = { urlImagen, searchGames, getGameDetails, getArtworks, getIgdbIdsDeSteam, getJuegosBasicos, getMetadatos };
