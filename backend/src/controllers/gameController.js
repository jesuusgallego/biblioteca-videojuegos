const pool = require('../config/db');
const { searchGames, getGameDetails, getArtworks } = require('../services/igdbService');

// Monto la URL de una imagen de IGDB. "tamano" es una plantilla de IGDB:
// t_cover_big (portada), t_screenshot_big (captura), t_1080p (captura grande)...
function urlImagen(imageId, tamano) {
  return `https://images.igdb.com/igdb/image/upload/${tamano}/${imageId}.jpg`;
}

// Mensajes legibles para los CHECK de user_games (los defino en schema.sql)
const MENSAJES_CHECK = {
  user_games_status_check: 'status debe ser: jugando, completado, abandonado o pendiente',
  user_games_rating_check: 'rating debe ser un entero entre 1 y 10',
};

// Si el error de Postgres lo causan los datos del cliente respondo 400 y no 500.
// Devuelve true si ya he respondido.
function responderErrorDeValidacion(err, res) {
  if (err.code === '23514') {
    // Se ha violado un CHECK (status o rating fuera de rango)
    const error = MENSAJES_CHECK[err.constraint] || 'Algún valor no cumple las restricciones permitidas';
    res.status(400).json({ error });
    return true;
  }
  if (err.code === '22P02' || err.code === '22003') {
    // Texto que no es un número (rating "abc") o número fuera de rango
    res.status(400).json({ error: 'Algún valor numérico no es válido' });
    return true;
  }
  return false;
}

// POST /games — añadir un juego a la biblioteca del usuario autenticado
async function addGame(req, res) {
  const userId = req.user.id;
  const { igdb_id, name, cover_url, status, rating, review, platform } = req.body;

  if (!igdb_id || !name) {
    return res.status(400).json({ error: 'igdb_id y name son obligatorios' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO user_games (user_id, igdb_id, name, cover_url, status, rating, review, platform)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'pendiente'), $6, $7, $8)
       RETURNING *`,
      [userId, igdb_id, name, cover_url, status, rating, review, platform]
    );

    res.status(201).json({ game: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      // Salta el UNIQUE (user_id, igdb_id): el juego ya estaba
      return res.status(409).json({ error: 'Ese juego ya está en tu biblioteca' });
    }
    if (responderErrorDeValidacion(err, res)) return;
    console.error('Error en addGame:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// GET /games — listar los juegos del usuario autenticado
async function listGames(req, res) {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'SELECT * FROM user_games WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ games: result.rows });
  } catch (err) {
    console.error('Error en listGames:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// PATCH /games/:id — actualizar un juego del usuario autenticado
async function updateGame(req, res) {
  const userId = req.user.id;
  const gameId = req.params.id;
  const { status, rating, review, platform } = req.body;

  // Distingo entre campo ausente (no lo toco) y campo enviado como null (lo borro).
  // Por eso uso has() y el CASE WHEN del SQL. status no admite NULL.
  const has = (field) => Object.prototype.hasOwnProperty.call(req.body, field);

  if (has('status') && status === null) {
    return res.status(400).json({ error: 'status no puede ser null' });
  }

  // Filtro siempre por user_id además de por id: así nadie toca juegos de otro usuario
  try {
    const result = await pool.query(
      `UPDATE user_games
       SET status = CASE WHEN $1 THEN $2 ELSE status END,
           rating = CASE WHEN $3 THEN $4::integer ELSE rating END,
           review = CASE WHEN $5 THEN $6 ELSE review END,
           platform = CASE WHEN $7 THEN $8 ELSE platform END,
           updated_at = NOW()
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [
        has('status'), status,
        has('rating'), rating,
        has('review'), review,
        has('platform'), platform,
        gameId, userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Juego no encontrado en tu biblioteca' });
    }

    res.json({ game: result.rows[0] });
  } catch (err) {
    if (responderErrorDeValidacion(err, res)) return;
    console.error('Error en updateGame:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// DELETE /games/:id — eliminar un juego del usuario autenticado
async function deleteGame(req, res) {
  const userId = req.user.id;
  const gameId = req.params.id;

  // Igual que en updateGame, filtro por user_id para borrar solo juegos propios
  try {
    const result = await pool.query(
      'DELETE FROM user_games WHERE id = $1 AND user_id = $2 RETURNING id',
      [gameId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Juego no encontrado en tu biblioteca' });
    }

    res.json({ message: 'Juego eliminado', id: result.rows[0].id });
  } catch (err) {
    if (responderErrorDeValidacion(err, res)) return;
    console.error('Error en deleteGame:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// GET /games/search?q=... — buscar juegos en IGDB
async function search(req, res) {
  const query = req.query.q;

  // Con ?q=a&q=b Express me daría una lista en vez de un texto
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Falta el parámetro de búsqueda "q"' });
  }

  try {
    const results = await searchGames(query);

    const simplified = results.map((game) => ({
      igdb_id: game.id,
      name: game.name,
      cover_url: game.cover ? urlImagen(game.cover.image_id, 't_cover_big') : null,
      platforms: game.platforms ? game.platforms.map((p) => p.name) : [],
    }));

    res.json({ results: simplified });
  } catch (err) {
    console.error('Error en search:', err.response?.data || err.message);
    res.status(500).json({ error: 'Error al buscar en IGDB' });
  }
}

// GET /games/details/:igdbId — ficha completa de un juego, sacada de IGDB
async function details(req, res) {
  const igdbId = Number(req.params.igdbId);

  if (!Number.isInteger(igdbId) || igdbId <= 0) {
    return res.status(400).json({ error: 'igdbId debe ser un número entero positivo' });
  }

  try {
    const game = await getGameDetails(igdbId);

    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado en IGDB' });
    }

    // De [{ id, name }, ...] me quedo solo con los nombres
    const nombres = (lista) => (lista ?? []).map((item) => item.name);
    // Una misma empresa puede ser developer y publisher a la vez, y a veces falta
    // el dato de la empresa, por eso filtro por rol y por ic.company
    const empresasConRol = (rol) =>
      (game.involved_companies ?? [])
        .filter((ic) => ic[rol] && ic.company)
        .map((ic) => ic.company.name);

    res.json({
      game: {
        igdb_id: game.id,
        name: game.name,
        summary: game.summary ?? null,
        // IGDB da la fecha en segundos Unix; la paso a "AAAA-MM-DD"
        release_date: game.first_release_date
          ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10)
          : null,
        developers: empresasConRol('developer'),
        publishers: empresasConRol('publisher'),
        genres: nombres(game.genres),
        platforms: nombres(game.platforms),
        game_modes: nombres(game.game_modes),
        // Nota media de IGDB (0-100) y cuánta gente la ha puntuado
        rating: game.total_rating ? Math.round(game.total_rating) : null,
        rating_count: game.total_rating_count ?? 0,
        cover_url: game.cover ? urlImagen(game.cover.image_id, 't_cover_big') : null,
        // Máximo 6 capturas, en tamaño medio; el visor del frontend pide la de 1080p
        screenshots: (game.screenshots ?? [])
          .slice(0, 6)
          .map((s) => urlImagen(s.image_id, 't_screenshot_big')),
        igdb_url: game.url ?? null,
      },
    });
  } catch (err) {
    console.error('Error en details:', err.response?.data || err.message);
    res.status(500).json({ error: 'Error al obtener la información del juego en IGDB' });
  }
}

// GET /games/artworks — ilustraciones oficiales de los juegos de mi biblioteca
// (para elegir una como foto de perfil). Solo salen los juegos que tienen alguna.
async function artworks(req, res) {
  try {
    const guardados = await pool.query(
      'SELECT igdb_id, name FROM user_games WHERE user_id = $1 ORDER BY name',
      [req.user.id]
    );

    const porJuego = await getArtworks(guardados.rows.map((j) => j.igdb_id));

    const games = guardados.rows
      .map((j) => ({
        igdb_id: j.igdb_id,
        name: j.name,
        // Máximo 12 por juego. La miniatura es para la rejilla y "url" es la
        // imagen grande que el frontend recorta para hacer el avatar.
        artworks: (porJuego.get(j.igdb_id) ?? []).slice(0, 12).map((imageId) => ({
          thumb_url: urlImagen(imageId, 't_screenshot_med'),
          url: urlImagen(imageId, 't_720p'),
        })),
      }))
      .filter((j) => j.artworks.length > 0);

    res.json({ games });
  } catch (err) {
    console.error('Error en artworks:', err.response?.data || err.message);
    res.status(500).json({ error: 'Error al obtener las ilustraciones en IGDB' });
  }
}

module.exports = { addGame, listGames, updateGame, deleteGame, search, details, artworks };
