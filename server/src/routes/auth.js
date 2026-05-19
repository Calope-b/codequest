// server/routes/auth.js
// Wires up POST /api/auth/register and POST /api/auth/login.

const express = require('express');
const { register, login } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

module.exports = router;