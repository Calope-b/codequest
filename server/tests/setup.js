// server/tests/setup.js
// Loaded by Jest before any test file.
// Replaces the normal .env with .env.test so the test suite hits
// the codequest_test database instead of the dev one.

const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../../.env.test'),
});

// Defensive sanity check: refuse to run if we're not on the test DB.
// Without this, a misconfigured CI could wipe the dev data on every push.
if (process.env.DB_NAME !== 'codequest_test') {
    throw new Error(
        `Tests must run against codequest_test, got "${process.env.DB_NAME}". ` +
        `Check .env.test is being loaded.`
    );
}