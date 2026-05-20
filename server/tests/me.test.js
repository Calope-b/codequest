// server/tests/me.test.js
// Tests for GET /api/auth/me.
//
// This endpoint is the client's way to restore a session: with a stored
// JWT in localStorage, the React app calls /me on mount to ask "is this
// token still valid, and who am I?" The route is protected by
// verifyToken and then queries the DB for fresh user data.

const request = require('supertest');
const app = require('../src/index');
const { db, truncateUsers, closePool } = require('./helpers/db');

// Helper: register a user and return their token + id.
async function seedAndGetToken() {
    const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'alice@test.com', password: 'password123', role: 'student' });
    return { token: res.body.token, userId: res.body.user.id };
}

beforeEach(async () => {
    await truncateUsers();
});

afterAll(async () => {
    await closePool();
});

describe('GET /api/auth/me', () => {

    // --- Input validation ----------------------------------------------------

    test('TC-ME-01: no token returns 401', async () => {
        const res = await request(app).get('/api/auth/me');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Access token required');
    });

    test('TC-ME-02: invalid token returns 401', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer garbage');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid or expired token');
    });

    // --- Happy path ----------------------------------------------------------

    test('TC-ME-03: valid token returns 200 with the fresh user data', async () => {
        const { token } = await seedAndGetToken();

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.user).toEqual({
            id: expect.any(Number),
            email: 'alice@test.com',
            role: 'student',
        });
    });

    // --- Error handling: stale token after user deletion ---------------------

    test('TC-ME-04: valid token but user deleted from DB returns 401', async () => {
        // 1. Register a user and grab the token
        const { token, userId } = await seedAndGetToken();

        // 2. Delete the user directly in the DB (simulates account deletion
        // while the user still has an active token)
        await db.query('DELETE FROM users WHERE id = $1', [userId]);

        // 3. Call /me with the now-stale token
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('User no longer exists');
    });

    // --- Security: response payload ------------------------------------------

    test('TC-ME-05: response never contains password_hash', async () => {
        const { token } = await seedAndGetToken();

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        // Serialize the whole body and assert no leak
        const serialized = JSON.stringify(res.body);
        expect(serialized).not.toMatch(/password_hash/i);
        expect(serialized).not.toMatch(/\$2[ab]\$/); // bcrypt hash prefix
    });
});