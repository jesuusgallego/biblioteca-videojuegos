const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { listAccounts, linkSteam, unlinkSteam, syncSteam, getGameAchievements } = require('../controllers/accountController');

// Todo lo de cuentas vinculadas exige haber iniciado sesión
router.use(verifyToken);

router.get('/', listAccounts);
router.put('/steam', linkSteam);
router.delete('/steam', unlinkSteam);
router.post('/steam/sync', syncSteam);
router.get('/steam/games/:id/achievements', getGameAchievements);

module.exports = router;
