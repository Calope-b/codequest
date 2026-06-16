// server/src/routes/admin.js
// Admin-only routes, mounted at /api/admin.
// Every route requires a valid token AND the 'admin' role, so a student
// or teacher token is rejected with 403.

const express = require('express');
const { verifyToken, requireRole } = require('../middlewares/auth');
const {
  listUsers,
  changeRole,
  deleteUser,
} = require('../controllers/adminController');

const router = express.Router();

// Every admin route shares the same two guards.
router.use(verifyToken, requireRole('admin'));

router.get('/users', listUsers);
router.patch('/users/:id/role', changeRole);
router.delete('/users/:id', deleteUser);

module.exports = router;