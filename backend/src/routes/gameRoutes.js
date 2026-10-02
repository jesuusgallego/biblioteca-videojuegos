const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { addGame, listGames, updateGame, deleteGame, search } = require('../controllers/gameController');

router.use(verifyToken); // aplica a TODAS las rutas de este archivo

router.post('/', addGame);
router.get('/', listGames);
router.get('/search', search);
router.patch('/:id', updateGame);
router.delete('/:id', deleteGame);

module.exports = router;
