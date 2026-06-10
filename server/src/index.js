// server/src/index.js
// Entry point of the Express server.
// Exports the Express app so it can be mounted by Supertest in tests.
// When run directly (node src/index.js), it starts listening on PORT.

const path = require('path');

// Only load .env when not in test mode. In test mode, tests/setup.js has
// already loaded .env.test before this module was even required, and we
// must not override those values.
if (process.env.NODE_ENV !== 'test') {
    require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
}

const express = require('express');
const cors = require('cors');

// -------- Routes ---------

const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students');
//const adminRoutes = require('./routes/admin');
//const teachersRoutes = require('./routes/teachers');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Global middlewares ---
app.use(cors());        // allow the React client (different port) to call the API
app.use(express.json()); // parse JSON bodies on incoming requests

// --- Health check ---
// Useful to verify the server is up without hitting auth.
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// ------- API routes ---------

app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
//app.use('/api/admin', adminRoutes);
//app.use('/api/teachers', teachersRoutes);

// --- 404 handler for unknown API routes ---
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// --- Error handler ---
// Catches any error thrown in async route handlers (after wrapping)
// or sync code. Keeps the server from crashing on a bad request.
app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// --- Start ---
// Only start the server when this file is run directly, not when it's
// imported (e.g. by a test). require.main === module is true only when
// we ran `node src/index.js` from the command line.
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;