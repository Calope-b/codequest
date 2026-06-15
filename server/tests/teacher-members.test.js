// server/tests/teacher-members.test.js
// Tests for adding and removing students in a class:
//   POST   /api/teachers/classes/:id/students
//   DELETE /api/teachers/classes/:id/students/:studentId
// Cross-teacher access returns a uniform 404; removing a student leaves
// their attempts untouched.

const request = require('supertest');
const app = require('../src/index');
const { db, truncateUsers, closePool } = require('./helpers/db');

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

beforeEach(async () => {
  await truncateUsers();
});

afterAll(async () => {
  await closePool();
});

describe('POST /api/teachers/classes/:id/students', () => {
  test('TC-MEM-01: adds a student by email (201) and links them', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    const { userId: studentId } = await registerUser('alice@test.com', 'student');
    const classId = await createClass(token, 'Class');

    const res = await request(app)
      .post(`/api/teachers/classes/${classId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'alice@test.com' });

    expect(res.status).toBe(201);
    expect(res.body.student).toEqual({ id: studentId, email: 'alice@test.com' });

    const { rows } = await db.query(
      'SELECT 1 FROM class_students WHERE class_id = $1 AND student_id = $2',
      [classId, studentId]
    );
    expect(rows).toHaveLength(1);
  });

  test('TC-MEM-02: missing email returns 400', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    const classId = await createClass(token, 'Class');

    const res = await request(app)
      .post(`/api/teachers/classes/${classId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('email is required');
  });

  test('TC-MEM-03: email as a number returns 400', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    const classId = await createClass(token, 'Class');

    const res = await request(app)
      .post(`/api/teachers/classes/${classId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 123 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('email is required');
  });

  test('TC-MEM-04: email is normalized before lookup', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    await registerUser('alice@test.com', 'student');
    const classId = await createClass(token, 'Class');

    const res = await request(app)
      .post(`/api/teachers/classes/${classId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'ALICE@TEST.COM' });

    expect(res.status).toBe(201);
    expect(res.body.student.email).toBe('alice@test.com');
  });

  test('TC-MEM-05: unknown email returns 404', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    const classId = await createClass(token, 'Class');

    const res = await request(app)
      .post(`/api/teachers/classes/${classId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'ghost@test.com' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No account found for this email');
  });

  test('TC-MEM-06: email belonging to a teacher returns 400', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    await registerUser('other@test.com', 'teacher');
    const classId = await createClass(token, 'Class');

    const res = await request(app)
      .post(`/api/teachers/classes/${classId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'other@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('This account is not a student');
  });

  test('TC-MEM-07: adding the same student twice returns 409', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    await registerUser('alice@test.com', 'student');
    const classId = await createClass(token, 'Class');

    await request(app)
      .post(`/api/teachers/classes/${classId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'alice@test.com' });

    const res = await request(app)
      .post(`/api/teachers/classes/${classId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'alice@test.com' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Student is already in this class');
  });

  test('TC-MEM-08: another teacher\'s class is a 404, same body as an unknown id', async () => {
    const teacherA = await registerUser('a@test.com', 'teacher');
    const teacherB = await registerUser('b@test.com', 'teacher');
    await registerUser('alice@test.com', 'student');
    const classId = await createClass(teacherA.token, "A's class");

    // B targets A's real class id.
    const owned = await request(app)
      .post(`/api/teachers/classes/${classId}/students`)
      .set('Authorization', `Bearer ${teacherB.token}`)
      .send({ email: 'alice@test.com' });

    // B targets an id that does not exist at all.
    const unknown = await request(app)
      .post('/api/teachers/classes/999999/students')
      .set('Authorization', `Bearer ${teacherB.token}`)
      .send({ email: 'alice@test.com' });

    expect(owned.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(owned.body).toEqual(unknown.body);
  });

  test('TC-MEM-09: a student token returns 403', async () => {
    const teacher = await registerUser('teacher@test.com', 'teacher');
    const student = await registerUser('alice@test.com', 'student');
    const classId = await createClass(teacher.token, 'Class');

    const res = await request(app)
      .post(`/api/teachers/classes/${classId}/students`)
      .set('Authorization', `Bearer ${student.token}`)
      .send({ email: 'alice@test.com' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Insufficient permissions');
  });

  test('TC-MEM-10: non-integer class id returns 400', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');

    const res = await request(app)
      .post('/api/teachers/classes/abc/students')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'alice@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid class id');
  });
});

describe('DELETE /api/teachers/classes/:id/students/:studentId', () => {
  test('TC-MEM-11: removes a student (204) and the link is gone', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    const { userId: studentId } = await registerUser('alice@test.com', 'student');
    const classId = await createClass(token, 'Class');
    await request(app)
      .post(`/api/teachers/classes/${classId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'alice@test.com' });

    const res = await request(app)
      .delete(`/api/teachers/classes/${classId}/students/${studentId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    const { rows } = await db.query(
      'SELECT 1 FROM class_students WHERE class_id = $1 AND student_id = $2',
      [classId, studentId]
    );
    expect(rows).toHaveLength(0);
  });

  test('TC-MEM-12: removing a non-member returns 404', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    const { userId: studentId } = await registerUser('alice@test.com', 'student');
    const classId = await createClass(token, 'Class');

    const res = await request(app)
      .delete(`/api/teachers/classes/${classId}/students/${studentId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Student is not in this class');
  });

  test('TC-MEM-13: removing from another teacher\'s class returns 404', async () => {
    const teacherA = await registerUser('a@test.com', 'teacher');
    const teacherB = await registerUser('b@test.com', 'teacher');
    const { userId: studentId } = await registerUser('alice@test.com', 'student');
    const classId = await createClass(teacherA.token, "A's class");
    await request(app)
      .post(`/api/teachers/classes/${classId}/students`)
      .set('Authorization', `Bearer ${teacherA.token}`)
      .send({ email: 'alice@test.com' });

    const res = await request(app)
      .delete(`/api/teachers/classes/${classId}/students/${studentId}`)
      .set('Authorization', `Bearer ${teacherB.token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Class not found');
  });

  test('TC-MEM-14: removal keeps the student\'s attempts', async () => {
    const { token } = await registerUser('teacher@test.com', 'teacher');
    const student = await registerUser('alice@test.com', 'student');
    const classId = await createClass(token, 'Class');
    await request(app)
      .post(`/api/teachers/classes/${classId}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'alice@test.com' });

    // The student records an attempt before being removed.
    await request(app)
      .post('/api/students/progress')
      .set('Authorization', `Bearer ${student.token}`)
      .send({ questId: 'quest_001', completed: true, score: 10 });

    await request(app)
      .delete(`/api/teachers/classes/${classId}/students/${student.userId}`)
      .set('Authorization', `Bearer ${token}`);

    const { rows } = await db.query(
      'SELECT COUNT(*)::int AS n FROM attempts WHERE student_id = $1',
      [student.userId]
    );
    expect(rows[0].n).toBe(1);
  });
});