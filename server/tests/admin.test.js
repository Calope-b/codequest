// server/tests/admin.test.js
// Tests for the admin user-management endpoints:
//   GET    /api/admin/users
//   PATCH  /api/admin/users/:id/role
//   DELETE /api/admin/users/:id
// Two safety rules dominate: an admin cannot act on their own account,
// and the role API never grants admin (those are seed-only). Since
// /api/auth/register cannot mint an admin by design, admin accounts are
// created here with a direct insert, then logged in for a real token.

const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/index');
const { db, truncateUsers, closePool } = require('./helpers/db');

const SALT_ROUNDS = 12; // same cost as authController
const PASSWORD = 'password123';

// Registers a student or teacher through the real endpoint.
async function registerUser(email, role) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: PASSWORD, role });
  return { token: res.body.token, userId: res.body.user.id };
}

// Creates an admin directly in the database (registration refuses the
// admin role), then logs in through the real endpoint to get a token,
// mirroring how a seeded admin actually signs in.
async function createAdmin(email) {
  const hash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, 'admin')
     RETURNING id`,
    [email, hash]
  );
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email, password: PASSWORD });
  return { token: login.body.token, userId: rows[0].id };
}

beforeEach(async () => {
  await truncateUsers();
});

afterAll(async () => {
  await closePool();
});

describe('GET /api/admin/users', () => {
  test('TC-ADM-01: lists all users', async () => {
    const admin = await createAdmin('admin@test.com');
    await registerUser('student@test.com', 'student');
    await registerUser('teacher@test.com', 'teacher');

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(3);
    for (const u of res.body.users) {
      expect(u).toHaveProperty('id');
      expect(u).toHaveProperty('email');
      expect(u).toHaveProperty('role');
      expect(u).toHaveProperty('created_at');
    }
  });

  test('TC-ADM-02: listing never exposes password_hash', async () => {
    const admin = await createAdmin('admin@test.com');
    await registerUser('student@test.com', 'student');

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${admin.token}`);

    // Serialize the whole body: the hash must appear nowhere.
    expect(JSON.stringify(res.body)).not.toContain('password_hash');
    expect(JSON.stringify(res.body)).not.toContain('$2b$');
  });

  test('TC-ADM-03: no token returns 401', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Access token required');
  });

  test('TC-ADM-04: a student token returns 403', async () => {
    const { token } = await registerUser('student@test.com', 'student');
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Insufficient permissions');
  });

  test('TC-ADM-05: a teacher token returns 403', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Insufficient permissions');
  });
});

describe('PATCH /api/admin/users/:id/role', () => {
  test('TC-ADM-06: changes a user\'s role', async () => {
    const admin = await createAdmin('admin@test.com');
    const { userId } = await registerUser('student@test.com', 'student');

    const res = await request(app)
      .patch(`/api/admin/users/${userId}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'teacher' });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: userId, email: 'student@test.com', role: 'teacher' });
  });

  test('TC-ADM-07: demotes another admin to teacher', async () => {
    const admin = await createAdmin('admin1@test.com');
    const other = await createAdmin('admin2@test.com');

    const res = await request(app)
      .patch(`/api/admin/users/${other.userId}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'teacher' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('teacher');
  });

  test('TC-ADM-08: promoting to admin is rejected', async () => {
    const admin = await createAdmin('admin@test.com');
    const { userId } = await registerUser('student@test.com', 'student');

    const res = await request(app)
      .patch(`/api/admin/users/${userId}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('role must be either student or teacher');
  });

  test('TC-ADM-09: an unknown role is rejected', async () => {
    const admin = await createAdmin('admin@test.com');
    const { userId } = await registerUser('student@test.com', 'student');

    const res = await request(app)
      .patch(`/api/admin/users/${userId}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'wizard' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('role must be either student or teacher');
  });

  test('TC-ADM-10: a missing role is rejected', async () => {
    const admin = await createAdmin('admin@test.com');
    const { userId } = await registerUser('student@test.com', 'student');

    const res = await request(app)
      .patch(`/api/admin/users/${userId}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('role is required');
  });

  test('TC-ADM-11: an admin cannot change their own role, and it stays unchanged', async () => {
    const admin = await createAdmin('admin@test.com');

    const res = await request(app)
      .patch(`/api/admin/users/${admin.userId}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'teacher' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('You cannot change your own role');

    const { rows } = await db.query('SELECT role FROM users WHERE id = $1', [admin.userId]);
    expect(rows[0].role).toBe('admin');
  });

  test('TC-ADM-12: non-integer id returns 400', async () => {
    const admin = await createAdmin('admin@test.com');
    const res = await request(app)
      .patch('/api/admin/users/abc/role')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'teacher' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid user id');
  });

  test('TC-ADM-13: unknown id returns 404', async () => {
    const admin = await createAdmin('admin@test.com');
    const res = await request(app)
      .patch('/api/admin/users/99999/role')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'teacher' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });
});

describe('DELETE /api/admin/users/:id', () => {
  test('TC-ADM-14: deletes a user', async () => {
    const admin = await createAdmin('admin@test.com');
    const { userId } = await registerUser('student@test.com', 'student');

    const res = await request(app)
      .delete(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(204);
    const { rows } = await db.query('SELECT 1 FROM users WHERE id = $1', [userId]);
    expect(rows).toHaveLength(0);
  });

  test('TC-ADM-15: deleting a user cascades their attempts', async () => {
    const admin = await createAdmin('admin@test.com');
    const student = await registerUser('student@test.com', 'student');
    await request(app)
      .post('/api/students/progress')
      .set('Authorization', `Bearer ${student.token}`)
      .send({ questId: 'quest_001', completed: true, score: 10 });

    await request(app)
      .delete(`/api/admin/users/${student.userId}`)
      .set('Authorization', `Bearer ${admin.token}`);

    const { rows } = await db.query(
      'SELECT COUNT(*)::int AS n FROM attempts WHERE student_id = $1',
      [student.userId]
    );
    expect(rows[0].n).toBe(0);
  });

  test('TC-ADM-16: an admin cannot delete their own account, and it stays', async () => {
    const admin = await createAdmin('admin@test.com');

    const res = await request(app)
      .delete(`/api/admin/users/${admin.userId}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('You cannot delete your own account');

    const { rows } = await db.query('SELECT 1 FROM users WHERE id = $1', [admin.userId]);
    expect(rows).toHaveLength(1);
  });

  test('TC-ADM-17: non-integer id returns 400', async () => {
    const admin = await createAdmin('admin@test.com');
    const res = await request(app)
      .delete('/api/admin/users/abc')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid user id');
  });

  test('TC-ADM-18: unknown id returns 404', async () => {
    const admin = await createAdmin('admin@test.com');
    const res = await request(app)
      .delete('/api/admin/users/99999')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });
});