// server/src/models/Class.js
// Database access for the classes and class_students tables.
// One class belongs to one teacher; class_students links students to it.
// Keeps SQL out of the controllers, same pattern as User.js and Attempt.js.

const db = require('../config/db');

// Creates a class owned by the given teacher and returns the new row.
async function create({ teacherId, name }) {
  const { rows } = await db.query(
    `INSERT INTO classes (teacher_id, name)
     VALUES ($1, $2)
     RETURNING id, name, created_at`,
    [teacherId, name]
  );
  return rows[0];
}

// Lists a teacher's classes, newest first, each with its student count.
// LEFT JOIN so a class with no students still reports 0, not nothing.
// COUNT(cs.student_id) (not COUNT(*)) so the empty LEFT JOIN row counts
// as zero rather than one phantom student.
async function findByTeacher(teacherId) {
  const { rows } = await db.query(
    `SELECT c.id, c.name, c.created_at,
            COUNT(cs.student_id)::int AS student_count
     FROM classes c
     LEFT JOIN class_students cs ON cs.class_id = c.id
     WHERE c.teacher_id = $1
     GROUP BY c.id, c.name, c.created_at
     ORDER BY c.created_at DESC`,
    [teacherId]
  );
  return rows;
}

// Returns a class only if it exists AND belongs to this teacher, else null.
// This is the ownership gate every :id route calls first; a null result
// becomes a 404 in the controller, so another teacher's class is
// indistinguishable from one that does not exist.
async function findByIdAndTeacher(id, teacherId) {
  const { rows } = await db.query(
    `SELECT id, name, created_at
     FROM classes
     WHERE id = $1 AND teacher_id = $2`,
    [id, teacherId]
  );
  return rows[0] || null;
}

// Links a student to a class. Relies on the composite primary key
// (class_id, student_id) to reject duplicates: a second insert throws
// Postgres error 23505, which the controller turns into a 409. The
// caller is responsible for checking the class ownership and the
// student's role first.
async function addStudent(classId, studentId) {
  await db.query(
    `INSERT INTO class_students (class_id, student_id)
     VALUES ($1, $2)`,
    [classId, studentId]
  );
}

// Removes a student from a class. Returns the number of rows deleted:
// 0 means the student was not in the class, which the controller turns
// into a 404. Deleting the link leaves the student's attempts untouched.
async function removeStudent(classId, studentId) {
  const { rowCount } = await db.query(
    `DELETE FROM class_students
     WHERE class_id = $1 AND student_id = $2`,
    [classId, studentId]
  );
  return rowCount;
}

module.exports = { create, findByTeacher, findByIdAndTeacher, addStudent, removeStudent };