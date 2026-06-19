// server/models/User.js
// Database access for the users table
// Keeps SQL out of the controllers

const db = require('../config/db'); //pg Pool from the scaffold

async function findByEmail(email) {
    const { rows } = await db.query(
        "SELECT id, email, password_hash, role FROM users WHERE email = $1",
        [email]
    );
    return rows[0] || null;
}

async function findById(id) {
  // No password_hash here on purpose: this is meant to be returned to clients.
  const {rows} = await db.query(
    'SELECT id, email, role FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function create({ email, passwordHash, role }) {
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING id, email, role`,
    [email, passwordHash, role]
  );
  return rows[0];
}

// Lists every account, for the admin user-management panel. No
// password_hash, since this is returned to the client. created_at is
// included so the admin can see when each account was registered.
async function findAll() {
  const { rows } = await db.query(
    `SELECT id, email, role, created_at
     FROM users
     ORDER BY created_at DESC`
  );
  return rows;
}

// Changes a user's role and returns the updated row (without the hash),
// or null if no user has that id. The caller validates the role against
// the student/teacher whitelist before calling; the CHECK constraint on
// the column is the last line of defence, not the first.
async function updateRole(id, role) {
  const { rows } = await db.query(
    `UPDATE users
     SET role = $2
     WHERE id = $1
     RETURNING id, email, role`,
    [id, role]
  );
  return rows[0] || null;
}

// Deletes a user by id. Returns the number of rows removed: 0 means no
// such user, which the controller turns into a 404. The schema's
// ON DELETE CASCADE rules remove the user's attempts, class memberships,
// and owned classes along with them.
async function deleteById(id) {
  const { rowCount } = await db.query(
    'DELETE FROM users WHERE id = $1',
    [id]
  );
  return rowCount;
}

// Returns a user WITH the password hash, for re-authentication before a
// sensitive change (email/password). Not for sending to the client.
async function findByIdWithHash(id) {
  const { rows } = await db.query(
    'SELECT id, email, password_hash, role FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

// Changes a user's email, returns the updated row without the hash, or
// null if no user has that id.
async function updateEmail(id, email) {
  const { rows } = await db.query(
    `UPDATE users SET email = $2 WHERE id = $1 RETURNING id, email, role`,
    [id, email]
  );
  return rows[0] || null;
}

// Replaces a user's password hash. No return value needed.
async function updatePassword(id, passwordHash) {
  await db.query(
    'UPDATE users SET password_hash = $2 WHERE id = $1',
    [id, passwordHash]
  );
}

module.exports = { findByEmail, findById, create, findAll, updateRole, deleteById, findByIdWithHash, updateEmail, updatePassword };