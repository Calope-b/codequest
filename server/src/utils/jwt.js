// server/utils/jwt.js
// Small helper around jsonwebtoken so the rest of the code
// doesn't need to know about the secret or expiration

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = '24h';

if (!SECRET) {
    throw new Error('JWT_SECRET is not set in environment variables');
}

function signToken(payload) {
    // payload should be a small object like { id, role }
    // Don't put sensitive data here - JWTs are base64-encoded, not encrypted.
    return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN});
}

function verifyToken(token) {
    // Throws if the token is invalid or expired
    return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };