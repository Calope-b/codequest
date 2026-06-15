// server/tests/teacher-progress.test.js
// Tests for the class progress endpoint:
//   GET /api/teachers/classes/:id/progress
// Aggregates attempts per student, keeps zero-attempt students with an
// empty quests array, excludes non-members, and is scoped to the owner.

const request = require('supertest');
const app = require('../src/index');
const { truncateUsers, closePool } = require('./helpers/db');

async function registerUser(email, role) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', role });
  return { token: res.body.token, userId: res.body.user.id };
}

async function createClass(token, name) {
  const res = await request(app)
    .post('/api/teachers/classes')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
  return res.body.class.id;
}

async function addStudent(token, classId, email) {
  await request(app)
    .post(`/api/teachers/classes/${classId}/students`)
    .set('Authorization', `Bearer ${token}`)
    .send({ email });
}

async function recordAttempt(studentToken, questId, completed, score) {
  await request(app)
    .post('/api/students/progress')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({ questId, completed, score });
}

beforeEach(async () => {
  await truncateUsers();
});

afterAll(async () => {
  await closePool();
});

describe('GET /api/teachers/classes/:id/progress', () => {
  test('TC-CPROG-01: aggregated progress for the class', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    const alice = await registerUser('alice@test.com', 'student');
    const classId = await createClass(token, 'Class');
    await addStudent(token, classId, 'alice@test.com');
    await recordAttempt(alice.token, 'quest_001', true, 50);

    const res = await request(app)
      .get(`/api/teachers/classes/${classId}/progress`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.class).toMatchObject({ id: classId, name: 'Class' });
    expect(res.body.students).toHaveLength(1);
    expect(res.body.students[0]).toMatchObject({
      id: alice.userId,
      email: 'alice@test.com',
    });
    expect(res.body.students[0].quests).toEqual([
      { quest_id: 'quest_001', completed: true, attempts: 1, best_score: 50 },
    ]);
  });

  test('TC-CPROG-02: a zero-attempt student is still listed with empty quests', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    await registerUser('alice@test.com', 'student');
    const classId = await createClass(token, 'Class');
    await addStudent(token, classId, 'alice@test.com');

    const res = await request(app)
      .get(`/api/teachers/classes/${classId}/progress`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.students).toHaveLength(1);
    expect(res.body.students[0].quests).toEqual([]);
  });

  test('TC-CPROG-03: attempts on one quest are aggregated', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    const alice = await registerUser('alice@test.com', 'student');
    const classId = await createClass(token, 'Class');
    await addStudent(token, classId, 'alice@test.com');
    await recordAttempt(alice.token, 'quest_001', false, 10);
    await recordAttempt(alice.token, 'quest_001', true, 40);

    const res = await request(app)
      .get(`/api/teachers/classes/${classId}/progress`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.students[0].quests).toEqual([
      { quest_id: 'quest_001', completed: true, attempts: 2, best_score: 40 },
    ]);
  });

  test('TC-CPROG-04: non-members are excluded', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    const alice = await registerUser('alice@test.com', 'student');
    const outsider = await registerUser('bob@test.com', 'student');
    const classId = await createClass(token, 'Class');
    await addStudent(token, classId, 'alice@test.com');
    // Outsider has attempts but is not in the class.
    await recordAttempt(outsider.token, 'quest_001', true, 99);

    const res = await request(app)
      .get(`/api/teachers/classes/${classId}/progress`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.students).toHaveLength(1);
    expect(res.body.students[0].email).toBe('alice@test.com');
  });

  test('TC-CPROG-05: an empty class returns an empty students array', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    const classId = await createClass(token, 'Class');

    const res = await request(app)
      .get(`/api/teachers/classes/${classId}/progress`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.students).toEqual([]);
  });

  test('TC-CPROG-06: another teacher\'s class returns 404', async () => {
    const teacherA = await registerUser('a@test.com', 'teacher');
    const teacherB = await registerUser('b@test.com', 'teacher');
    const classId = await createClass(teacherA.token, "A's class");

    const res = await request(app)
      .get(`/api/teachers/classes/${classId}/progress`)
      .set('Authorization', `Bearer ${teacherB.token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Class not found');
  });

  test('TC-CPROG-07: a student token returns 403', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    const student = await registerUser('alice@test.com', 'student');
    const classId = await createClass(token, 'Class');

    const res = await request(app)
      .get(`/api/teachers/classes/${classId}/progress`)
      .set('Authorization', `Bearer ${student.token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Insufficient permissions');
  });

  test('TC-CPROG-08: non-integer id returns 400', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');

    const res = await request(app)
      .get('/api/teachers/classes/abc/progress')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid class id');
  });

  test('TC-CPROG-09: unknown class id returns 404', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');

    const res = await request(app)
      .get('/api/teachers/classes/99999/progress')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Class not found');
  });
});