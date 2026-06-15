// server/tests/teacher-classes.test.js
// Tests for the class create/list endpoints:
//   POST /api/teachers/classes
//   GET  /api/teachers/classes
// Both are gated by verifyToken + requireRole('teacher'). Listing is
// scoped to the owning teacher, so these tests also check that one
// teacher never sees another's classes.

const request = require('supertest');
const app = require('../src/index');
const { db, truncateUsers, closePool } = require('./helpers/db');

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

describe('POST /api/teachers/classes', () => {
  test('TC-CLS-01: a teacher creates a class (201) and a row is stored', async () => {
    const { token, userId } = await registerUser('teacher@test.com', 'teacher');

    const res = await request(app)
      .post('/api/teachers/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '1ere NSI A' });

    expect(res.status).toBe(201);
    expect(res.body.class).toMatchObject({ name: '1ere NSI A' });
    expect(res.body.class.id).toBeDefined();
    expect(res.body.class.created_at).toBeDefined();

    const { rows } = await db.query(
      'SELECT name, teacher_id FROM classes WHERE id = $1',
      [res.body.class.id]
    );
    expect(rows[0]).toEqual({ name: '1ere NSI A', teacher_id: userId });
  });

  test('TC-CLS-02: missing name returns 400', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');

    const res = await request(app)
      .post('/api/teachers/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('name is required');
  });

  test('TC-CLS-03: name as a number returns 400', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');

    const res = await request(app)
      .post('/api/teachers/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 42 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('name is required');
  });

  test('TC-CLS-04: whitespace-only name returns 400', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');

    const res = await request(app)
      .post('/api/teachers/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('name cannot be empty');
  });

  test('TC-CLS-05: name is trimmed before storage', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');

    const res = await request(app)
      .post('/api/teachers/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '  1ere NSI A  ' });

    expect(res.status).toBe(201);
    expect(res.body.class.name).toBe('1ere NSI A');
  });

  test('TC-CLS-06: name longer than 100 chars returns 400', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');

    const res = await request(app)
      .post('/api/teachers/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'a'.repeat(101) });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('name cannot exceed 100 characters');
  });

  test('TC-CLS-07: no token returns 401', async () => {
    const res = await request(app)
      .post('/api/teachers/classes')
      .send({ name: 'X' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Access token required');
  });

  test('TC-CLS-08: a student token returns 403', async () => {
    const { token } = await registerUser('student@test.com', 'student');

    const res = await request(app)
      .post('/api/teachers/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Insufficient permissions');
  });
});

describe('GET /api/teachers/classes', () => {
  test('TC-CLS-09: lists own classes with student counts', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    const { userId: studentId } = await registerUser('student@test.com', 'student');

    // One class with a student, one without.
    const withStudent = await request(app)
      .post('/api/teachers/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Class with one' });
    await request(app)
      .post('/api/teachers/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Empty class' });

    await request(app)
      .post(`/api/teachers/classes/${withStudent.body.class.id}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'student@test.com' });

    const res = await request(app)
      .get('/api/teachers/classes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.classes).toHaveLength(2);

    const counts = {};
    for (const c of res.body.classes) {
      counts[c.name] = c.student_count;
    }
    expect(counts['Class with one']).toBe(1);
    expect(counts['Empty class']).toBe(0);
  });

  test('TC-CLS-10: listing is scoped to the owner', async () => {
    const teacherA = await registerUser('a@test.com', 'teacher');
    const teacherB = await registerUser('b@test.com', 'teacher');

    await request(app)
      .post('/api/teachers/classes')
      .set('Authorization', `Bearer ${teacherA.token}`)
      .send({ name: "A's class" });

    const res = await request(app)
      .get('/api/teachers/classes')
      .set('Authorization', `Bearer ${teacherB.token}`);

    expect(res.status).toBe(200);
    expect(res.body.classes).toEqual([]);
  });
});