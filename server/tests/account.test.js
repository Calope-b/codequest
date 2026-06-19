// server/tests/account.test.js
// Tests for the account self-service endpoints:
//   PATCH /api/auth/password
//   PATCH /api/auth/email
// Both require a valid token and re-verify the current password before
// any change. Same harness as the rest: Jest + Supertest against the
// real codequest_test database, truncation in beforeEach.

const request = require('supertest');
const app = require('../src/index');
const { db, truncateUsers, closePool } = require('./helpers/db');

// Registers a user through the real endpoint; password is always
// 'original123' so tests can re-authenticate predictably.
async function registerUser(email, role = 'student') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'original123', role });
  return { token: res.body.token, userId: res.body.user.id };
}

beforeEach(async () => {
  await truncateUsers();
});

afterAll(async () => {
  await closePool();
});

describe('PATCH /api/auth/password', () => {
  test('TC-PWD-01: changes password with the correct current password', async () => {
    const { token } = await registerUser('a@test.com');
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'original123', newPassword: 'changed456' });
    expect(res.status).toBe(204);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@test.com', password: 'changed456' });
    expect(login.status).toBe(200);
  });

  test('TC-PWD-02: the old password no longer works after the change', async () => {
    const { token } = await registerUser('a@test.com');
    await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'original123', newPassword: 'changed456' });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@test.com', password: 'original123' });
    expect(login.status).toBe(401);
  });

  test('TC-PWD-03: a wrong current password is rejected', async () => {
    const { token } = await registerUser('a@test.com');
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrongpass', newPassword: 'changed456' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Incorrect password');
  });

  test('TC-PWD-04: a new password that is too short is rejected', async () => {
    const { token } = await registerUser('a@test.com');
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'original123', newPassword: 'abc' });
    expect(res.status).toBe(400);
  });

  test('TC-PWD-05: the stored hash actually changes', async () => {
    const { token, userId } = await registerUser('a@test.com');
    const before = (await db.query('SELECT password_hash FROM users WHERE id = $1', [userId])).rows[0].password_hash;
    await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'original123', newPassword: 'changed456' });
    const after = (await db.query('SELECT password_hash FROM users WHERE id = $1', [userId])).rows[0].password_hash;
    expect(after).not.toBe(before);
  });

  test('TC-PWD-06: no token is rejected', async () => {
    const res = await request(app)
      .patch('/api/auth/password')
      .send({ currentPassword: 'original123', newPassword: 'changed456' });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/auth/email', () => {
  test('TC-EML-01: changes email with the correct password (and normalizes it)', async () => {
    const { token } = await registerUser('a@test.com');
    const res = await request(app)
      .patch('/api/auth/email')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'original123', newEmail: 'NEW@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('new@test.com');
  });

  test('TC-EML-02: a wrong password is rejected', async () => {
    const { token } = await registerUser('a@test.com');
    const res = await request(app)
      .patch('/api/auth/email')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'wrongpass', newEmail: 'new@test.com' });
    expect(res.status).toBe(401);
  });

  test('TC-EML-03: an email already taken is rejected', async () => {
    const { token } = await registerUser('a@test.com');
    await registerUser('taken@test.com');
    const res = await request(app)
      .patch('/api/auth/email')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'original123', newEmail: 'taken@test.com' });
    expect(res.status).toBe(409);
  });

  test('TC-EML-04: changing to your own email is rejected', async () => {
    const { token } = await registerUser('a@test.com');
    const res = await request(app)
      .patch('/api/auth/email')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'original123', newEmail: 'a@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('This is already your email');
  });

  test('TC-EML-05: a malformed email is rejected', async () => {
    const { token } = await registerUser('a@test.com');
    const res = await request(app)
      .patch('/api/auth/email')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'original123', newEmail: 'notanemail' });
    expect(res.status).toBe(400);
  });

  test('TC-EML-06: no token is rejected', async () => {
    const res = await request(app)
      .patch('/api/auth/email')
      .send({ password: 'original123', newEmail: 'new@test.com' });
    expect(res.status).toBe(401);
  });
});