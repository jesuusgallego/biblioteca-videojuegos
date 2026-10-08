const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const {
  getProfile, getStats, updateProfile, updateEmail, updatePassword, deleteAccount,
} = require('../controllers/profileController');

// Todo el perfil exige haber iniciado sesión
router.use(verifyToken);

router.get('/', getProfile);
router.get('/stats', getStats);
router.patch('/', updateProfile);
router.patch('/email', updateEmail);
router.patch('/password', updatePassword);
router.delete('/', deleteAccount);

module.exports = router;
