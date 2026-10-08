const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const SALT_ROUNDS = 10;

// POST /auth/register
async function register(req, res) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    // Compruebo antes de insertar para poder avisar con un 409 claro
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'El email o username ya está en uso' });
    }

    // Nunca guardo la contraseña: solo su hash con bcrypt
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username, email, passwordHash]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error('Error en register:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// POST /auth/login
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const result = await pool.query(
      'SELECT id, username, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Si falla el email o la contraseña doy el mismo error, para no revelar qué emails están registrados
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // El token lleva el id y el nombre del usuario y caduca a los 7 días
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { register, login };
