// server/controllers/authController.js
// Handles registration and login
// Validate input, hashes/verifies passwords, issues a JWT

const bcrypt = require('bcrypt');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');

const ALLOWED_ROLES_AT_REGISTER = ['student', 'teacher'];
const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;  // bcrypt silently truncates beyond 72 bytes
const MAX_EMAIL_LENGTH = 254;    // RFC 3696 practical limit, also matches our VARCHAR(255)

async function register(req, res) {
    try {
        // --- 1. Type and presence ---
        let { email, password, role } = req.body;
        if (typeof email !== 'string' || typeof password !== 'string' || typeof role !== 'string') {
            return res.status(400).json({
                error: 'email, password and role are required',
            });
        }

        // --- 2. Normalize ---
        // Email is case-insensitive in practice (RFC 5321), so we canonicalise
        // to lowercase + trim. Prevents Alice@x.com and alice@x.com from being
        // treated as two different accounts.
        email = email.trim().toLowerCase();
        role = role.trim().toLowerCase();

        // --- 3. Non-empty after trim ---
        // Catches empty strings AND whitespace-only inputs ('   ').
        if (!email || !password || !role) {
            return res.status(400).json({
                error: 'email, password and role cannot be empty',
            });
        }

        // --- 4. Length bounds ---
        if (email.length > MAX_EMAIL_LENGTH) {
            return res.status(400).json({
                error: `Email cannot exceed ${MAX_EMAIL_LENGTH} characters`,
            });
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({
                error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
            });
        }
        if (password.length > MAX_PASSWORD_LENGTH) {
            return res.status(400).json({
                error: `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`,
            });
        }

        // --- 5. Whitespace-only password ---
        // '        ' (8 spaces) passes the length check above; reject explicitly.
        if (password.trim().length === 0) {
            return res.status(400).json({
                error: 'Password cannot be only whitespace',
            });
        }

        // --- 6. Email format ---
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // --- 7. Role whitelist ---
        if (!ALLOWED_ROLES_AT_REGISTER.includes(role)) {
            return res.status(400).json({
                error: 'role must be either "student" or "teacher"',
            });
        }

        // --- 8. Create the user ---
        // We rely on the UNIQUE constraint on users.email to reject duplicates
        // instead of doing a check-then-insert. Race-condition-free: under
        // concurrent inserts only one wins, the others get error 23505.
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        let user;
        try {
            user = await User.create({ email, passwordHash, role });
        } catch (dbErr) {
            if (dbErr.code === '23505') {
                // Postgres unique_violation
                return res.status(409).json({ error: 'Email already registered' });
            }
            throw dbErr;
        }

        // --- 9. Issue JWT ---
        const token = signToken({ id: user.id, role: user.role });
        return res.status(201).json({
            token,
            user: { id: user.id, email: user.email, role: user.role },
        });
    } catch (err) {
        // Last-resort catch. Without this, Express 4 leaves async errors hanging.
        console.error('Register error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function login(req, res) {
    try {
        // --- 1. Type and presence ---
        let { email, password } = req.body;
        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'email and password are required' });
        }

        // --- 2. Normalize email (same rule as register) ---
        email = email.trim().toLowerCase();

        if (!email || !password) {
            return res.status(400).json({ error: 'email and password cannot be empty' });
        }

        // --- 3. Look up user and verify password ---
        // Same generic 401 message whether the email is unknown or the password
        // is wrong, to prevent account enumeration.
        const user = await User.findByEmail(email);
        if (!user) {
return res.status(401).json({ error: 'Invalid email or password' });
        }

        const passwordOk = await bcrypt.compare(password, user.password_hash);
        if (!passwordOk) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // --- 4. Issue JWT ---
        const token = signToken({ id: user.id, role: user.role });
        return res.status(200).json({
            token,
            user: { id: user.id, email: user.email, role: user.role },
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { register, login };