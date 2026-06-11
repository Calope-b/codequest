// server/scripts/seed-admin.js
// Creates an admin account from the command line.
//
// Registration only allows the student and teacher roles (see
// ALLOWED_ROLES_AT_REGISTER in authController.js), so this script is the
// single entry point for admin accounts, as stated in AUTH_DESIGN.md.
// The password is hashed with the same bcrypt cost as registration, so a
// seeded admin logs in through the normal /api/auth/login flow.
//
// Usage, from the server/ directory (the -- passes args through npm):
//   npm run seed:admin -- admin@example.com your-password

const path = require('path');

// Same .env resolution as src/index.js: the file lives at the repo root,
// two levels above this script's directory.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const bcrypt = require('bcrypt');
const db = require('../src/config/db');

// Kept in sync with authController.js. Duplicated rather than imported:
// the controller does not export them, and exporting constants only for
// a one-off script is not worth the coupling.
const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;
const MAX_EMAIL_LENGTH = 254;

async function main() {
    const [rawEmail, password] = process.argv.slice(2);

    // --- Argument validation, mirroring the register endpoint ---
    if (!rawEmail || !password) {
        console.error('Usage: npm run seed:admin -- <email> <password>');
        process.exit(1);
    }

    const email = rawEmail.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > MAX_EMAIL_LENGTH) {
        console.error('Invalid email format.');
        process.exit(1);
    }
    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
        console.error(
            `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`
        );
        process.exit(1);
    }

    // --- Insert ---
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    try {
        const { rows } = await db.query(
            `INSERT INTO users (email, password_hash, role)
             VALUES ($1, $2, 'admin')
             RETURNING id, email, role`,
            [email, passwordHash]
        );
        console.log(`Admin created: ${rows[0].email} (id ${rows[0].id})`);
    } catch (err) {
        if (err.code === '23505') {
            // Same race-safe pattern as registration: let the UNIQUE
            // constraint decide instead of SELECT-then-INSERT.
            console.error(`An account already exists for ${email}. Nothing was changed.`);
            // process.exitCode (not process.exit) so the finally block
            // still closes the pool before the process ends.
            process.exitCode = 1;
            return;
        }
        throw err;
    } finally {
        await db.end();
    }
}

main().catch((err) => {
    console.error('Seed failed:', err.message);
    if (err.code === 'ECONNREFUSED') {
        console.error('Hint: is the database running? Try: docker compose up -d db');
    }
    process.exitCode = 1;
});