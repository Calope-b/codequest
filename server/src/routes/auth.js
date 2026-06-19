// server/routes/auth.js
// Wires up POST /api/auth/register, POST /api/auth/login,
// GET /api/auth/me (protected), and the account self-service PATCH routes.

const express = require('express');
const { register, login } = require('../controllers/authController');
const { changeEmail, changePassword } = require('../controllers/accountController');
const { verifyToken } = require('../middlewares/auth');
const User = require('../models/User');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

// Returns the current user. Used by the React client after a refresh
// to confirm the token is still valid and get fresh user info (email, role).
router.get('/me', verifyToken, async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        return res.status(401).json({ error: 'User no longer exists' });
    }
    return res.status(200).json({ user });
});

// Account self-service. Both require a valid token and the current
// password (verified in the controller), so a borrowed session cannot
// silently take over the account.
router.patch('/email', verifyToken, changeEmail);
router.patch('/password', verifyToken, changePassword);

module.exports = router;