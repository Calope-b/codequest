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

module.exports = {  findByEmail, findById, create };