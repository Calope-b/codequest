// server/tests/register.test.js
// Tests for POST /api/auth/register.
// Covers: happy path, type checks, missing fields.
// (Edge cases, length bounds, duplicates, and security are in later passes.)

const request = require('supertest');
const app = require('../src/index');
const { db, truncateUsers, closePool } = require('./helpers/db');

beforeEach(async () => {
    await truncateUsers();
});

afterAll(async () => {
    await closePool();
});

describe('POST /api/auth/register', () => {

    // --- Happy path ----------------------------------------------------------

    test('TC-REG-01: valid student registration returns 201 with token and user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'alice@test.com', password: 'password123', role: 'student' });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('token');
        expect(typeof res.body.token).toBe('string');
        expect(res.body.user).toEqual({
            id: expect.any(Number),
            email: 'alice@test.com',
            role: 'student',
        });
    });

    test('TC-REG-02: valid teacher registration returns 201 with token and user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'bob@test.com', password: 'password123', role: 'teacher' });

        expect(res.status).toBe(201);
        expect(res.body.user.role).toBe('teacher');
        expect(res.body.user.email).toBe('bob@test.com');
    });

    // --- Edge case: email normalization --------------------------------------

    test('TC-REG-03: email is normalized to lowercase before being stored', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'ALICE@TEST.com', password: 'password123', role: 'student' });

        expect(res.status).toBe(201);
        expect(res.body.user.email).toBe('alice@test.com');

        // And verify directly in the DB, not just the response payload
        const { rows } = await db.query('SELECT email FROM users');
        expect(rows[0].email).toBe('alice@test.com');
    });

    // --- Security: response payload --------------------------------------------

    test('TC-REG-04: response never contains password_hash', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'alice@test.com', password: 'password123', role: 'student' });

        expect(res.status).toBe(201);
        // Serialize the whole body to a string and assert no leak anywhere
        const serialized = JSON.stringify(res.body);
        expect(serialized).not.toMatch(/password_hash/i);
        expect(serialized).not.toMatch(/\$2[ab]\$/); // bcrypt hash prefix
    });

    // --- Input validation: missing fields ------------------------------------

    test('TC-REG-05: missing email field returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ password: 'password123', role: 'student' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('email, password and role are required');
    });

    test('TC-REG-06: missing password field returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'alice@test.com', role: 'student' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('email, password and role are required');
    });

    test('TC-REG-07: missing role field returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'alice@test.com', password: 'password123' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('email, password and role are required');
    });

    // --- Input validation: wrong types ---------------------------------------

    test('TC-REG-08: email as a number returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 123, password: 'password123', role: 'student' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('email, password and role are required');
    });

    test('TC-REG-09: password as an array returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'alice@test.com', password: [], role: 'student' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('email, password and role are required');
    });

    test('TC-REG-10: all fields null returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: null, password: null, role: null });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('email, password and role are required');
    });

    // --- Edge case: empty and whitespace strings -----------------------------

    test('TC-REG-11: empty string email returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: '', password: 'password123', role: 'student' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('email, password and role cannot be empty');
    });

    test('TC-REG-12: whitespace-only email returns 400', async () => {
        // Three spaces; after trim+lowercase the email becomes "",
        // which trips the non-empty check.
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: '   ', password: 'password123', role: 'student' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('email, password and role cannot be empty');
    });

    test('TC-REG-13: whitespace-only password (8 spaces) returns 400', async () => {
        // 8 spaces passes the length check but is rejected explicitly
        // by the whitespace-only password rule.
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'alice@test.com', password: '        ', role: 'student' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Password cannot be only whitespace');
    });

    // --- Input validation: bad email format ----------------------------------

    test('TC-REG-14: email missing @ returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'alicetest.com', password: 'password123', role: 'student' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid email format');
    });

    test('TC-REG-15: email missing dot returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'alice@test', password: 'password123', role: 'student' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid email format');
    });

    // --- Input validation: password length bounds ----------------------------

    test('TC-REG-16: password too short (7 chars) returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'alice@test.com', password: '1234567', role: 'student' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Password must be at least 8 characters long');
    });

    test('TC-REG-17: password exactly at the max (72 chars) is accepted', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'alice@test.com',
                password: 'a'.repeat(72),
                role: 'student',
            });

        expect(res.status).toBe(201);
        expect(res.body.user.email).toBe('alice@test.com');
    });

    test('TC-REG-18: password too long (73 chars) returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'alice@test.com',
                password: 'a'.repeat(73),
                role: 'student',
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Password cannot exceed 72 characters');
    });

    // --- Input validation: email length bound --------------------------------

    test('TC-REG-19: email too long (over 254 chars) returns 400', async () => {
        // Construct an email of 255 chars that still matches the regex
        // (something like "aaaaa...aaaaa@x.co"), so the length check is
        // what trips it, not the format check.
        const local = 'a'.repeat(248); // 248 + "@x.co" = 253 chars... bump to 255
        const email = `${'a'.repeat(250)}@x.co`; // 250 + 1 + 1 + 1 + 2 = 255 chars

        const res = await request(app)
            .post('/api/auth/register')
            .send({ email, password: 'password123', role: 'student' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Email cannot exceed 254 characters');
    });

    // --- Input validation: role whitelist ------------------------------------

    test('TC-REG-20: role "admin" is rejected at register', async () => {
        // Admins must be seeded, not self-registered.
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'attacker@test.com', password: 'password123', role: 'admin' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('role must be either "student" or "teacher"');
    });

    test('TC-REG-21: unknown role is rejected', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'alice@test.com', password: 'password123', role: 'wizard' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('role must be either "student" or "teacher"');
    });

    // --- Edge case: duplicate emails -----------------------------------------

    test('TC-REG-22: duplicate email (same case) returns 409', async () => {
        // First register the user
        await request(app)
            .post('/api/auth/register')
            .send({ email: 'alice@test.com', password: 'password123', role: 'student' });

        // Second register with the exact same payload
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'alice@test.com', password: 'password123', role: 'student' });

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('Email already registered');
    });

    test('TC-REG-23: duplicate email with different case is still rejected (409)', async () => {
        // Proves that the email normalization (lowercase) catches the dup at the
        // DB level via the UNIQUE constraint, not just naive string equality.
        await request(app)
            .post('/api/auth/register')
            .send({ email: 'alice@test.com', password: 'password123', role: 'student' });

        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'ALICE@TEST.COM', password: 'password123', role: 'student' });

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('Email already registered');

        // And confirm only one row exists in the DB (not two with different cases)
        const { rows } = await db.query('SELECT COUNT(*) FROM users');
        expect(rows[0].count).toBe('1');
    });

    // --- Security: SQL injection attempts ------------------------------------

    test('TC-REG-24: SQL injection in email is rejected by the format regex', async () => {
        // Classic injection payload. The email regex rejects it before any DB
        // query runs. Even if it somehow got through, parameterized queries
        // would treat it as a literal value.
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: "x' OR '1'='1@x.com",
                password: 'password123',
                role: 'student',
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid email format');

        // Sanity check: no row was created
        const { rows } = await db.query('SELECT COUNT(*) FROM users');
        expect(rows[0].count).toBe('0');
    });

    test('TC-REG-25: SQL injection in role is rejected by the whitelist', async () => {
        // Even if the email and password are valid, the role whitelist rejects
        // anything outside {student, teacher}. The Postgres CHECK constraint
        // is a second line of defense if the whitelist were bypassed.
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'hacker@test.com',
                password: 'password123',
                role: "student'; DROP TABLE users--",
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('role must be either "student" or "teacher"');

        // Most important assertion: users table still exists and is empty
        const { rows } = await db.query('SELECT COUNT(*) FROM users');
        expect(rows[0].count).toBe('0');
    });
});