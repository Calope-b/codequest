// server/src/middlewares/auth.js
// Two small middlewares used to gate protected routes:
//   - verifyToken : checks the Authorization header and decodes the JWT
//   - requireRole : checks that the authenticated user has an allowed role
// They are designed to be chained: verifyToken first, then requireRole(...) when needed.

const { verifyToken: verifyJwt } = require('../utils/jwt');
// Aliased on import: utils/jwt.js already exports a helper called verifyToken,
// which would collide with the middleware function defined below.

function verifyToken(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access token required' });
    }

    const token = header.slice('Bearer '.length).trim();

    try {
        const payload = verifyJwt(token); // throws on bad signature or expired token
        // We trust the JWT for identity here. Routes that need fresh data
        // can re-query the DB themselves (see GET /api/auth/me).
        req.user = { id: payload.id, role: payload.role };
        return next();
    } catch (_err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function requireRole(roles) {
    // Accept either a single role string or an array of roles.
    const allowed = Array.isArray(roles) ? roles : [roles];

    return function (req, res, next) {
        if (!req.user || !allowed.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        return next();
    };
}

module.exports = { verifyToken, requireRole };