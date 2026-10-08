const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  // Espero la cabecera "Authorization: Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Dejo el usuario en req.user para que lo lean los controladores
    req.user = { id: decoded.userId, username: decoded.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = verifyToken;
