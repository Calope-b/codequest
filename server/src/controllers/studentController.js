// server/src/controllers/studentController.js
// Handles a student's own quest progress: recording attempts and reading
// back a summary. Every action is scoped to the authenticated student
// (req.user.id), never a student id from the body, so one student can
// neither write nor read another's progress.

const Attempt = require('../models/Attempt');

const MAX_QUEST_ID_LENGTH = 50; // matches attempts.quest_id VARCHAR(50)
const MAX_SCORE = 1000000;      // sanity ceiling to reject absurd values

// POST /api/students/progress
// Body: { questId: string, completed?: boolean, score?: number }
async function recordProgress(req, res) {
  try {
    let { questId, completed, score } = req.body;

    // --- questId: required, non-empty string within column length ---
    if (typeof questId !== 'string') {
      return res.status(400).json({ error: 'questId is required' });
    }
    questId = questId.trim();
    if (!questId) {
      return res.status(400).json({ error: 'questId cannot be empty' });
    }
    if (questId.length > MAX_QUEST_ID_LENGTH) {
      return res.status(400).json({ error: 'questId is too long' });
    }

    // --- completed: optional boolean, defaults to false ---
    if (completed === undefined) {
      completed = false;
    } else if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'completed must be a boolean' });
    }

    // --- score: optional non-negative integer, defaults to 0 ---
    if (score === undefined) {
      score = 0;
    } else if (
      typeof score !== 'number' ||
      !Number.isInteger(score) ||
      score < 0 ||
      score > MAX_SCORE
    ) {
      return res.status(400).json({ error: 'score must be a non-negative integer' });
    }

    const attempt = await Attempt.create({
      studentId: req.user.id,
      questId,
      completed,
      score,
    });

    return res.status(201).json({ attempt });
  } catch (err) {
    console.error('recordProgress failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/students/progress
// Returns the authenticated student's progress, one entry per quest.
async function getProgress(req, res) {
  try {
    const progress = await Attempt.summaryByStudent(req.user.id);
    return res.status(200).json({ progress });
  } catch (err) {
    console.error('getProgress failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { recordProgress, getProgress };