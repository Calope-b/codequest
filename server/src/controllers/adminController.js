// server/src/controllers/adminController.js
// Handles platform-wide user management for admins: list every account,
// change a user's role, delete an account. Two rules carry the safety of
// this module: an admin can never act on their own account (no self
// demotion or self deletion, which could leave the platform with no
// administrator), and the role API never grants 'admin' (those come from
// the seed script alone). See ADMIN_DESIGN.md.

const User = require('../models/User');

// Roles a request may assign. 'admin' is deliberately absent: admin
// accounts are seed-only, so promoting to admin over the API is refused
// the same way as any unknown role.
const ASSIGNABLE_ROLES = ['student', 'teacher'];

// Parses an :id URL param into a positive integer, or null if it is not
// one. Identical to teacherController's: rejecting "abc" here gives a
// clean 400 instead of a 500 from Postgres on an integer column.
function parseId(raw) {
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

// GET /api/admin/users
async function listUsers(req, res) {
  try {
    const users = await User.findAll();
    return res.status(200).json({ users });
  } catch (err) {
    console.error('listUsers failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PATCH /api/admin/users/:id/role
// Body: { role: 'student' | 'teacher' }
async function changeRole(req, res) {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    // Self check runs before role validation on purpose: an admin acting
    // on their own id should hear that it's their own account, the more
    // useful message, even if the body is also malformed.
    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    const { role } = req.body;
    if (typeof role !== 'string') {
      return res.status(400).json({ error: 'role is required' });
    }
    if (!ASSIGNABLE_ROLES.includes(role)) {
      // Covers 'admin' (seed-only) and anything else with one message.
      return res.status(400).json({ error: 'role must be either student or teacher' });
    }

    const updated = await User.updateRole(id, role);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({ user: updated });
  } catch (err) {
    console.error('changeRole failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// DELETE /api/admin/users/:id
async function deleteUser(req, res) {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const removed = await User.deleteById(id);
    if (removed === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(204).end();
  } catch (err) {
    console.error('deleteUser failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { listUsers, changeRole, deleteUser };