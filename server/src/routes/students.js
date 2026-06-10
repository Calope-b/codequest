// server/src/routes/students.js
// Student-only routes, mounted at /api/students.
// Every route requires a valid token AND the 'student' role, so a
// teacher or admin token is rejected with 403.

const express = require('express');
const { verifyToken, requireRole } = require('../middlewares/auth');
const { recordProgress, getProgress } = require('../controllers/studentController');

const router = express.Router();

// Record one quest attempt for the logged-in student.
router.post('/progress', verifyToken, requireRole('student'), recordProgress);

// Read the logged-in student's progress summary.
router.get('/progress', verifyToken, requireRole('student'), getProgress);

module.exports = router;