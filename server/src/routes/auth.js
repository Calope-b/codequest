// server/routes/auth.js
// Wires up POST /api/auth/register, POST /api/auth/login,
// and GET /api/auth/me (protected) to read the currently logged-in user.

const express = require('express');
const { register, login } = require('../controllers/authController');
const { verifyToken } = require('../middlewares/auth');
const User = require('../models/User');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

// Returns the current user. Used by the React client after a refresh
// to confirm the token is still valid and get fresh user info (email, role)
// instead of relying on whatever was cached at login time.
router.get('/me', verifyToken, async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        // Token is valid but the user has been deleted in the meantime.
        // Treat as unauthenticated so the client clears its session.
        return res.status(401).json({ error: 'User no longer exists' });
    }
    return res.status(200).json({ user });
});

module.exports = router;
