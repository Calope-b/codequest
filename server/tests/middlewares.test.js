// server/tests/middlewares.test.js
// Tests for the verifyToken and requireRole middlewares.
//
// These middlewares are reused on every protected route, so they get tested
// in isolation through a tiny test-only Express app. Each test mounts the
// minimum needed (verifyToken alone, or verifyToken + requireRole) and
// asserts the response for a given Authorization header.

const express = require('express');
const request = require('supertest');
const { signToken } = require('../src/utils/jwt');
const { verifyToken, requireRole } = require('../src/middlewares/auth');
const { closePool } = require('./helpers/db');

// Build a fresh app with the test routes. No DB calls happen here because
// these middlewares don't touch the database.
function buildTestApp() {
    const app = express();
    app.use(express.json());

    // Protected by verifyToken only. Returns the decoded user from the token.
    app.get('/protected', verifyToken, (req, res) => {
        res.json({ user: req.user });
    });

    // Protected by verifyToken + requireRole('admin').
    app.get('/admin-only', verifyToken, requireRole('admin'), (req, res) => {
        res.json({ ok: true });
    });

    // Protected by verifyToken + requireRole(['teacher', 'admin']).
    // For testing the array-of-roles form of requireRole.
    app.get('/staff-only', verifyToken, requireRole(['teacher', 'admin']), (req, res) => {
        res.json({ ok: true });
    });

    return app;
}

afterAll(async () => {
    await closePool();
});

describe('verifyToken middleware', () => {

    const app = buildTestApp();

    test('TC-VTK-01: no Authorization header returns 401', async () => {
        const res = await request(app).get('/protected');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Access token required');
    });

    test('TC-VTK-02: header without "Bearer " prefix returns 401', async () => {
        // Just the raw token, no "Bearer " in front.
        const token = signToken({ id: 1, role: 'student' });

        const res = await request(app)
            .get('/protected')
            .set('Authorization', token);

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Access token required');
    });

    test('TC-VTK-03: malformed JWT returns 401', async () => {
        const res = await request(app)
            .get('/protected')
            .set('Authorization', 'Bearer notajwt');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid or expired token');
    });

    test('TC-VTK-04: JWT signed with the wrong secret returns 401', async () => {
        // Build a token with a different secret. jwt.verify must reject it.
        const jwt = require('jsonwebtoken');
        const forged = jwt.sign({ id: 1, role: 'admin' }, 'not-the-right-secret', {
            expiresIn: '1h',
        });

        const res = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${forged}`);

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid or expired token');
    });

    test('TC-VTK-05: expired JWT returns 401', async () => {
        // Sign a token that's already expired (negative expiresIn isn't allowed,
        // so use a 1ms expiry and wait a moment).
        const jwt = require('jsonwebtoken');
        const expired = jwt.sign({ id: 1, role: 'student' }, process.env.JWT_SECRET, {
            expiresIn: -1, // already past
        });

        const res = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${expired}`);

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid or expired token');
    });

    test('TC-VTK-06: tampered payload returns 401 (signature mismatch)', async () => {
        // Take a valid token and flip one character in the payload. JWT
        // signature won't match anymore, so verify rejects it.
        const valid = signToken({ id: 1, role: 'student' });

        // JWT format: header.payload.signature
        const [header, payload, signature] = valid.split('.');
        // Flip last char of payload (still base64-ish but content is now different)
        const tampered = `${header}.${payload.slice(0, -1)}X.${signature}`;

        const res = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${tampered}`);

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid or expired token');
    });

    test('TC-VTK-07: valid token passes through and req.user is set', async () => {
        const token = signToken({ id: 42, role: 'teacher' });

        const res = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.user).toEqual({ id: 42, role: 'teacher' });
    });
});

describe('requireRole middleware', () => {

    const app = buildTestApp();

    test('TC-RRO-01: no req.user (middleware misused, no verifyToken before) returns 403', async () => {
        // We simulate the "misuse" by calling requireRole on a route that
        // doesn't have verifyToken before it. To do this, we mount an extra
        // route on a fresh app just for this case.
        const naked = express();
        naked.get('/bare', requireRole('admin'), (req, res) => {
            res.json({ ok: true });
        });

        const res = await request(naked).get('/bare');

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Insufficient permissions');
    });

    test('TC-RRO-02: single allowed role, user matches, passes through', async () => {
        const token = signToken({ id: 1, role: 'admin' });

        const res = await request(app)
            .get('/admin-only')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
    });

    test('TC-RRO-03: array of allowed roles, user matches one of them, passes through', async () => {
        // /staff-only accepts both teacher and admin
        const token = signToken({ id: 1, role: 'teacher' });

        const res = await request(app)
            .get('/staff-only')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
    });

    test('TC-RRO-04: user role does not match returns 403', async () => {
        // A student trying to hit an admin-only route.
        const token = signToken({ id: 1, role: 'student' });

        const res = await request(app)
            .get('/admin-only')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Insufficient permissions');
    });
});