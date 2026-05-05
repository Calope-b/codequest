// server/controllers/authController.js
// Handles registration and login
// Validate input, hashes/verifies passwords, issues a JWT

const bcrypt = require('bcrypt');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');

const ALLOWED_ROLES_AT_REGISTER = ['student', 'teacher'];
const SALT_ROUNDS = 12;

async function register(req, res) {
    const { email, password, role} = req.body;

    // --- Input validation ---
    if (!email || !password || !role) {
        return res.status(400).json({
            error: 'email, password and role are required',
        });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({
            error: 'Invalid email format'
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            error: 'Password must be at least 8 characters long'
        });
    }

    if (!ALLOWED_ROLES_AT_REGISTER.includes(role)) {
        return res.status(400).json({
            error: 'role must be either "student" or "teacher"'
        });
    }

    // --- Reject duplicate emails ---
    const existing = await User.findByEmail(email);
    if (existing) {
        return res.status(409).json({
            error: 'Email already registered'
        });
    }

    // --- Hash the password, create the user ---
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({email, passwordHash, role});

    // --- Issue a JWT ---
    const token = signToken({id:user.id, role: user.role});

    return res.status(201).json({
        token,
        user: {id: user.id, email: user.email, role: user.role},
    });
}

async function login(req, res) {
    const { email, password} = req.body;
    if (!email || !password) {
        return res
            .status(400)
            .json({ error: 'email and password are required'});
    }

    const user = await User.findByEmail(email);
    // Same generic error whether the email is unknown or the password
    // is wrong, to prevent account enumeration
    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
        return res.status(401).json({error: 'Invalid email or password' });
    }

    const token = signToken({ id: user.id, role: user.role});

    return res.status(200).json({
        token,
        user: {id: user.id, email: user.email, role : user.role},
    });
}
module.exports = { register, login };