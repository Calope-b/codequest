// server/src/models/Attempt.js
// Database access for the attempts table.
// Each row is one quest attempt by a student. Keeps SQL out of the controllers.

const db = require('../config/db');

// Records a new attempt and returns the created row.
async function create({ studentId, questId, completed, score }) {
  const { rows } = await db.query(
    `INSERT INTO attempts (student_id, quest_id, completed, score)
     VALUES ($1, $2, $3, $4)
     RETURNING id, student_id, quest_id, completed, score, attempted_at`,
    [studentId, questId, completed, score]
  );
  return rows[0];
}

// Returns every attempt for a student, newest first.
async function findByStudent(studentId) {
  const { rows } = await db.query(
    `SELECT id, quest_id, completed, score, attempted_at
     FROM attempts
     WHERE student_id = $1
     ORDER BY attempted_at DESC`,
    [studentId]
  );
  return rows;
}

// Returns one row per quest the student has touched, aggregated across
// attempts: whether it was ever completed, how many tries, and the best
// score. This feeds the progress view and, later, the teacher dashboard.
// The ::int casts turn Postgres bigint/aggregate results into plain JSON
// numbers instead of strings.
async function summaryByStudent(studentId) {
  const { rows } = await db.query(
    `SELECT
       quest_id,
       bool_or(completed) AS completed,
       COUNT(*)::int      AS attempts,
       MAX(score)::int    AS best_score
     FROM attempts
     WHERE student_id = $1
     GROUP BY quest_id
     ORDER BY quest_id`,
    [studentId]
  );
  return rows;
}

module.exports = { create, findByStudent, summaryByStudent };