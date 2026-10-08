const axios = require('axios');
const { getAccessToken } = require('./igdbAuth');

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

module.exports = { searchGames, getGameDetails };
