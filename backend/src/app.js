require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const verifyToken = require('./middleware/authMiddleware');
const gameRoutes = require('./routes/gameRoutes');
const profileRoutes = require('./routes/profileRoutes');
const accountRoutes = require('./routes/accountRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
// La foto de perfil viaja en el JSON como texto (base64), así que subo el límite
// por defecto de 100 KB. El frontend la reduce a ~256 px antes de enviarla.
app.use(express.json({ limit: '1mb' }));
app.use('/games', gameRoutes);
app.use('/profile', profileRoutes);
app.use('/accounts', accountRoutes);

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
