const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { addGame, listGames, updateGame, deleteGame, search, details } = require('../controllers/gameController');

// Todas las rutas de juegos exigen haber iniciado sesión
router.use(verifyToken);

router.post('/', addGame);
router.get('/', listGames);
router.get('/search', search);
router.get('/details/:igdbId', details);
router.patch('/:id', updateGame);
router.delete('/:id', deleteGame);

module.exports = router;
