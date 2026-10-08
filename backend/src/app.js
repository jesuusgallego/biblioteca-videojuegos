require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const verifyToken = require('./middleware/authMiddleware');
const gameRoutes = require('./routes/gameRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/games', gameRoutes);

// Compruebo a la vez el servidor y la base de datos: si la BD no responde, devuelvo 500
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      server_time: new Date(),
      db_time: result.rows[0].now,
    });
  } catch (err) {
    console.error('Error en /health:', err);
    res.status(500).json({ status: 'error', message: 'No se pudo conectar a la base de datos' });
  }
});

app.get('/auth/me', verifyToken, (req, res) => {
  res.json({ message: 'Token válido', user: req.user });
});

app.use('/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
