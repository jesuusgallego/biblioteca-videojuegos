const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { limitadorLogin, limitadorRegistro } = require('../middleware/limitadores');

router.post('/register', limitadorRegistro, register);
router.post('/login', limitadorLogin, login);

module.exports = router;
