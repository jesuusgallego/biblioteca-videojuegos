const axios = require('axios');
const { getAccessToken } = require('./igdbAuth');

// Envía una consulta (en el lenguaje "Apicalypse" de IGDB) a un endpoint de IGDB
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
  return igdbPost(
    'games',
    `search "${query}"; fields name, cover.image_id, platforms.name, first_release_date; limit 10;`
  );
}

// "empresa.campo" le dice a IGDB que expanda la relación y traiga ese dato (igual
// que un JOIN en SQL). involved_companies une el juego con sus empresas y lleva
// dos booleanos: developer y publisher.
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

// Caché en memoria: los datos de un juego casi nunca cambian, así que no hace
// falta preguntar a IGDB cada vez que se abre la misma ficha. Además IGDB limita
// a 4 peticiones por segundo. Se vacía al reiniciar el servidor.
const DURACION_CACHE_MS = 60 * 60 * 1000; // 1 hora
const MAX_CACHE = 200;
const cacheDetalles = new Map(); // igdbId -> { game, caducaEn }

// igdbId debe llegar ya validado como entero (se interpola en la consulta)
async function getGameDetails(igdbId) {
  const guardado = cacheDetalles.get(igdbId);
  if (guardado && Date.now() < guardado.caducaEn) {
    return guardado.game;
  }

  const resultados = await igdbPost('games', `fields ${CAMPOS_DETALLE}; where id = ${igdbId};`);
  const game = resultados[0] ?? null;

  if (game) {
    if (cacheDetalles.size >= MAX_CACHE) {
      // Un Map recuerda el orden de inserción: la primera clave es la más antigua
      cacheDetalles.delete(cacheDetalles.keys().next().value);
    }
    cacheDetalles.set(igdbId, { game, caducaEn: Date.now() + DURACION_CACHE_MS });
  }

  return game;
}

module.exports = { searchGames, getGameDetails };
