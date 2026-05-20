// server/tests/helpers/db.js
// Shared DB utilities for the test suite.

const db = require('../../src/config/db');

// Wipes the users table and resets the id sequence between tests.
// CASCADE because users is referenced by classes, class_students, and attempts.
async function truncateUsers() {
    await db.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
}

// Closes the pool after all tests are done so Jest can exit cleanly.
// Without this, `npm test` would hang after the last test.
async function closePool() {
    await db.end();
}

module.exports = { db, truncateUsers, closePool };