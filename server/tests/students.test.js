// server/tests/students.test.js
// Tests for the student progress endpoints:
//   POST /api/students/progress  (record an attempt)
//   GET  /api/students/progress  (read the progress summary)
//
// Both are gated by verifyToken + requireRole('student'), and every
// action is scoped to the authenticated student, so these tests also
// check role enforcement and that one student never sees another's data.

const request = require('supertest');
const app = require('../src/index');
const { db, truncateUsers, closePool } = require('./helpers/db');

// Registers a user and returns their token + id.
async function registerUser(email, role) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', role });
  return { token: res.body.token, userId: res.body.user.id };
}

beforeEach(async () => {
  await truncateUsers();
});

afterAll(async () => {
  await closePool();
});

describe('POST /api/students/progress', () => {

  // --- Auth / role gating --------------------------------------------------

  test('TC-PROG-01: no token returns 401', async () => {
    const res = await request(app)
      .post('/api/students/progress')
      .send({ questId: 'quest_001', completed: true });

    expect(res.status).toBe(401);
  });

  test('TC-PROG-02: a teacher token returns 403', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');

    const res = await request(app)
      .post('/api/students/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ questId: 'quest_001', completed: true });

    expect(res.status).toBe(403);
  });

  // --- Happy path ----------------------------------------------------------

  test('TC-PROG-03: a student records an attempt (201) and a row is stored', async () => {
    const { token, userId } = await registerUser('alice@test.com', 'student');

    const res = await request(app)
      .post('/api/students/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ questId: 'quest_001', completed: true, score: 42 });

    expect(res.status).toBe(201);
    expect(res.body.attempt).toMatchObject({
      student_id: userId,
      quest_id: 'quest_001',
      completed: true,
      score: 42,
    });

    const { rows } = await db.query(
      'SELECT * FROM attempts WHERE student_id = $1',
      [userId]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].quest_id).toBe('quest_001');
  });

  test('TC-PROG-04: completed and score default to false/0 when omitted', async () => {
    const { token } = await registerUser('alice@test.com', 'student');

    const res = await request(app)
      .post('/api/students/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ questId: 'quest_002' });

    expect(res.status).toBe(201);
    expect(res.body.attempt.completed).toBe(false);
    expect(res.body.attempt.score).toBe(0);
  });

  // --- Input validation ----------------------------------------------------

  test('TC-PROG-05: missing questId returns 400', async () => {
    const { token } = await registerUser('alice@test.com', 'student');

    const res = await request(app)
      .post('/api/students/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ completed: true });

    expect(res.status).toBe(400);
  });

  test('TC-PROG-06: a non-boolean completed returns 400', async () => {
    const { token } = await registerUser('alice@test.com', 'student');

    const res = await request(app)
      .post('/api/students/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ questId: 'quest_001', completed: 'yes' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/students/progress', () => {

  test('TC-PROG-07: no token returns 401', async () => {
    const res = await request(app).get('/api/students/progress');
    expect(res.status).toBe(401);
  });

  test('TC-PROG-08: returns one aggregated entry per quest', async () => {
    const { token } = await registerUser('alice@test.com', 'student');
    const auth = { Authorization: `Bearer ${token}` };

    // Two attempts on quest_001 (fail then succeed), one on quest_002.
    await request(app).post('/api/students/progress').set(auth)
      .send({ questId: 'quest_001', completed: false, score: 10 });
    await request(app).post('/api/students/progress').set(auth)
      .send({ questId: 'quest_001', completed: true, score: 30 });
    await request(app).post('/api/students/progress').set(auth)
      .send({ questId: 'quest_002', completed: true, score: 50 });

    const res = await request(app).get('/api/students/progress').set(auth);

    expect(res.status).toBe(200);
    expect(res.body.progress).toHaveLength(2);

    const q1 = res.body.progress.find((p) => p.quest_id === 'quest_001');
    expect(q1).toMatchObject({ completed: true, attempts: 2, best_score: 30 });

    const q2 = res.body.progress.find((p) => p.quest_id === 'quest_002');
    expect(q2).toMatchObject({ completed: true, attempts: 1, best_score: 50 });
  });

  test('TC-PROG-09: a student only sees their own progress', async () => {
    const alice = await registerUser('alice@test.com', 'student');
    const bob = await registerUser('bob@test.com', 'student');

    await request(app).post('/api/students/progress')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ questId: 'quest_001', completed: true });

    // Bob recorded nothing, so his progress is empty.
    const res = await request(app).get('/api/students/progress')
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(200);
    expect(res.body.progress).toHaveLength(0);
  });
});