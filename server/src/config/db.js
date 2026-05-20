// server/src/config/db.js
// PostgreSQL connection pool. The pool manages multiple
// connections automatically and exposes .query() for everyone.

const { Pool } = require('pg');

// Coerce password to a string. Postgres accepts an empty password but
// pg's SASL handler refuses undefined, throwing a confusing error.
// This normalizes both "no password set" cases to "" (empty string).
const password = process.env.DB_PASSWORD ?? '';

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password,
});

pool.on('connect', () => {
    // Only log when not in tests, to keep test output clean
    if (process.env.NODE_ENV !== 'test') {
        console.log('PostgreSQL pool connected');
    }
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    process.exit(-1);
});

module.exports = pool;