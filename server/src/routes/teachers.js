// server/src/routes/teachers.js
// Teacher-only routes, mounted at /api/teachers.
// Every route requires a valid token AND the 'teacher' role, so a
// student or admin token is rejected with 403.

const express = require('express');
const { verifyToken, requireRole } = require('../middlewares/auth');
const {
  createClass,
  listClasses,
  addStudent,
  removeStudent,
  classProgress,
} = require('../controllers/teacherController');

const router = express.Router();

// Every teacher route shares the same two guards.
router.use(verifyToken, requireRole('teacher'));

router.post('/classes', createClass);
router.get('/classes', listClasses);
router.post('/classes/:id/students', addStudent);
router.delete('/classes/:id/students/:studentId', removeStudent);
router.get('/classes/:id/progress', classProgress);

module.exports = router;