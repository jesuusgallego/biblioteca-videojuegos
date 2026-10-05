const pool = require('../config/db');
const { searchGames } = require('../services/igdbService');

// Mensajes para las restricciones CHECK de user_games (ver models/sql/schema.sql)
const MENSAJES_CHECK = {
  user_games_status_check: 'status debe ser: jugando, completado, abandonado o pendiente',
  user_games_rating_check: 'rating debe ser un entero entre 1 y 10',
};

// Errores de Postgres causados por datos del cliente → 400 en vez de 500.
// Devuelve true si respondió.
function responderErrorDeValidacion(err, res) {
  if (err.code === '23514') {
    // violación de un CHECK (status o rating fuera de rango)
    const error = MENSAJES_CHECK[err.constraint] || 'Algún valor no cumple las restricciones permitidas';
    res.status(400).json({ error });
    return true;
  }
  if (err.code === '22P02' || err.code === '22003') {
    // texto no convertible a número, o número fuera de rango (p. ej. rating "abc" o id "abc")
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
      // violación de la restricción UNIQUE (user_id, igdb_id)
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

  // Un campo ausente no se toca; un campo enviado como null sí se borra
  // (rating, review y platform admiten NULL; status no).
  const has = (field) => Object.prototype.hasOwnProperty.call(req.body, field);

  if (has('status') && status === null) {
    return res.status(400).json({ error: 'status no puede ser null' });
  }

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

  if (!query) {
    return res.status(400).json({ error: 'Falta el parámetro de búsqueda "q"' });
  }

  try {
    const results = await searchGames(query);

    const simplified = results.map((game) => ({
      igdb_id: game.id,
      name: game.name,
      cover_url: game.cover
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
        : null,
      platforms: game.platforms ? game.platforms.map((p) => p.name) : [],
    }));

    res.json({ results: simplified });
  } catch (err) {
    console.error('Error en search:', err.response?.data || err.message);
    res.status(500).json({ error: 'Error al buscar en IGDB' });
  }
}

module.exports = { addGame, listGames, updateGame, deleteGame, search };
