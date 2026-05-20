// server/tests/login.test.js
// Tests for POST /api/auth/login.
// Covers: happy path, type checks, missing fields, empty strings,
// anti-enumeration (unknown email vs wrong password return the same body),
// case-insensitive email lookup, and SQL injection.

const request = require('supertest');
const app = require('../src/index');
const { db, truncateUsers, closePool } = require('./helpers/db');

// Most login cases need a pre-existing user. We seed one before each test.
async function seedTestUser() {
    await request(app)
        .post('/api/auth/register')
        .send({ email: 'alice@test.com', password: 'password123', role: 'student' });
}

beforeEach(async () => {
    await truncateUsers();
});

afterAll(async () => {
    await closePool();
});

describe('POST /api/auth/login', () => {

    // --- Happy path ----------------------------------------------------------

    test('TC-LOG-01: valid credentials return 200 with token and user', async () => {
        await seedTestUser();

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'alice@test.com', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(typeof res.body.token).toBe('string');
        expect(res.body.user).toEqual({
            id: expect.any(Number),
            email: 'alice@test.com',
            role: 'student',
        });
    });

    // --- Edge case: case-insensitive email -----------------------------------

    test('TC-LOG-02: login is case-insensitive on email', async () => {
        // Account was stored as alice@test.com after register normalized it.
        // Logging in with uppercase should still find it.
        await seedTestUser();

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'ALICE@TEST.COM', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe('alice@test.com');
    });

    // --- Input validation: missing fields ------------------------------------

    test('TC-LOG-03: missing email returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ password: 'password123' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('email and password are required');
    });

    test('TC-LOG-04: missing password returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'alice@test.com' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('email and password are required');
    });

    // --- Input validation: wrong types ---------------------------------------

    test('TC-LOG-05: email as a number returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 123, password: 'password123' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('email and password are required');
    });

    // --- Edge case: empty strings --------------------------------------------

    test('TC-LOG-06: empty string email returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: '', password: 'password123' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('email and password cannot be empty');
    });

    test('TC-LOG-07: empty string password returns 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'alice@test.com', password: '' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('email and password cannot be empty');
    });

    // --- Security: authentication failures -----------------------------------

    test('TC-LOG-08: unknown email returns 401 with the generic message', async () => {
        // No user seeded for this email.
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'nobody@test.com', password: 'whatever' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid email or password');
    });

    test('TC-LOG-09: wrong password returns 401 with the generic message', async () => {
        await seedTestUser();

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'alice@test.com', password: 'wrongpassword' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid email or password');
    });

    // --- Security: anti-enumeration ------------------------------------------

    test('TC-LOG-10: unknown email and wrong password return byte-identical bodies', async () => {
        // This is the "anti-enumeration" guarantee: an attacker scraping the
        // login endpoint cannot tell from the response whether the email
        // exists in the system or not.
        await seedTestUser();

        const unknownEmail = await request(app)
            .post('/api/auth/login')
            .send({ email: 'nobody@test.com', password: 'whatever' });

        const wrongPassword = await request(app)
            .post('/api/auth/login')
            .send({ email: 'alice@test.com', password: 'wrongpassword' });

        expect(unknownEmail.status).toBe(401);
        expect(wrongPassword.status).toBe(401);
        // Compare the bodies as serialized strings: byte-for-byte identical.
        expect(JSON.stringify(unknownEmail.body))
            .toBe(JSON.stringify(wrongPassword.body));
    });

    // --- Security: SQL injection ---------------------------------------------

    test('TC-LOG-11: SQL injection in email returns the generic 401', async () => {
        // The classic '1=1 payload. Parameterized queries treat it as a
        // literal email string, so the DB simply finds no user with that
        // address and the endpoint returns the generic 401.
        await seedTestUser();

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: "' OR '1'='1", password: 'whatever' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid email or password');

        // Sanity check: the table is intact and our seeded user still exists
        const { rows } = await db.query('SELECT COUNT(*) FROM users');
        expect(rows[0].count).toBe('1');
    });
});