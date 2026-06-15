// server/src/controllers/teacherController.js
// Handles a teacher's classes and their students. Every action is scoped
// to the authenticated teacher (req.user.id): a teacher can only see and
// touch classes they own. A class that exists under another teacher is
// reported as 404, exactly like one that does not exist, so the endpoints
// never confirm the existence of another teacher's data.

const Class = require('../models/Class');
const User = require('../models/User');

const MAX_NAME_LENGTH = 100;  // matches classes.name VARCHAR(100)
const MAX_EMAIL_LENGTH = 254; // matches the auth module's ceiling

// Parses an :id-style URL param into a positive integer, or null if it is
// not one. Rejecting "abc" here gives a clean 400 instead of letting
// Postgres throw on an integer column (which would surface as a 500).
function parseId(raw) {
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

// POST /api/teachers/classes
// Body: { name: string }
async function createClass(req, res) {
  try {
    let { name } = req.body;

    if (typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    name = name.trim();
    if (!name) {
      return res.status(400).json({ error: 'name cannot be empty' });
    }
    if (name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: 'name cannot exceed 100 characters' });
    }

    const created = await Class.create({ teacherId: req.user.id, name });
    return res.status(201).json({ class: created });
  } catch (err) {
    console.error('createClass failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/teachers/classes
// Lists the teacher's own classes, each with its student count.
async function listClasses(req, res) {
  try {
    const classes = await Class.findByTeacher(req.user.id);
    return res.status(200).json({ classes });
  } catch (err) {
    console.error('listClasses failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/teachers/classes/:id/students
// Body: { email: string }
// Adds an existing student account to one of the teacher's classes.
async function addStudent(req, res) {
  try {
    const classId = parseId(req.params.id);
    if (classId === null) {
      return res.status(400).json({ error: 'Invalid class id' });
    }

    let { email } = req.body;
    if (typeof email !== 'string') {
      return res.status(400).json({ error: 'email is required' });
    }
    email = email.trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'email cannot be empty' });
    }
    if (email.length > MAX_EMAIL_LENGTH) {
      return res.status(400).json({ error: 'email cannot exceed 254 characters' });
    }

    // Ownership gate first: a class the teacher does not own is a 404,
    // before we reveal anything about which emails exist.
    const klass = await Class.findByIdAndTeacher(classId, req.user.id);
    if (!klass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'No account found for this email' });
    }
    if (user.role !== 'student') {
      return res.status(400).json({ error: 'This account is not a student' });
    }

    try {
      await Class.addStudent(classId, user.id);
    } catch (err) {
      // Composite PK (class_id, student_id) rejects a duplicate link.
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Student is already in this class' });
      }
      throw err;
    }

    // user.email is the stored (already normalized) address; we forward
    // only id and email, never the password_hash that findByEmail returns.
    return res.status(201).json({ student: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('addStudent failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// DELETE /api/teachers/classes/:id/students/:studentId
// Removes a student from one of the teacher's classes. The student's
// account and their attempts are left untouched; only the link is cut.
async function removeStudent(req, res) {
  try {
    const classId = parseId(req.params.id);
    const studentId = parseId(req.params.studentId);
    if (classId === null) {
      return res.status(400).json({ error: 'Invalid class id' });
    }
    if (studentId === null) {
      return res.status(400).json({ error: 'Invalid student id' });
    }

    const klass = await Class.findByIdAndTeacher(classId, req.user.id);
    if (!klass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const removed = await Class.removeStudent(classId, studentId);
    if (removed === 0) {
      return res.status(404).json({ error: 'Student is not in this class' });
    }

    return res.status(204).end();
  } catch (err) {
    console.error('removeStudent failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/teachers/classes/:id/progress
// Returns the class's progress, one entry per student, including students
// who have not attempted any quest yet (their quests array is empty).
async function classProgress(req, res) {
  try {
    const classId = parseId(req.params.id);
    if (classId === null) {
      return res.status(400).json({ error: 'Invalid class id' });
    }

    const klass = await Class.findByIdAndTeacher(classId, req.user.id);
    if (!klass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const rows = await Class.progressByClass(classId);

    // Fold the flat rows (one per student-quest, with a NULL quest_id for
    // students who never played) into one entry per student.
    const byStudent = new Map();
    for (const row of rows) {
      if (!byStudent.has(row.student_id)) {
        byStudent.set(row.student_id, {
          id: row.student_id,
          email: row.email,
          quests: [],
        });
      }
      // A NULL quest_id is the LEFT JOIN's "no attempts" marker: keep the
      // student, add no quest entry.
      if (row.quest_id !== null) {
        byStudent.get(row.student_id).quests.push({
          quest_id: row.quest_id,
          completed: row.completed,
          attempts: row.attempts,
          best_score: row.best_score,
        });
      }
    }

    return res.status(200).json({
      class: klass,
      students: Array.from(byStudent.values()),
    });
  } catch (err) {
    console.error('classProgress failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { createClass, listClasses, addStudent, removeStudent, classProgress };