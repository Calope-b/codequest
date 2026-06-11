// client/src/services/progress.js
// API calls for the student progress endpoints. Thin wrappers around
// apiRequest so components never hardcode paths or response shapes.

import { apiRequest } from './api'

/**
 * Records one quest attempt for the logged-in student.
 * POST /api/students/progress
 *
 * No score is sent on purpose: there is no scoring system to compute
 * it from yet. The backend defaults it to 0 and the column is already
 * stored, so a future scoring sprint only changes this one call.
 *
 * @param {string} token
 * @param {{ questId: string, completed: boolean }} attempt
 * @returns {Promise<object>} the stored attempt row
 */
export async function recordAttempt(token, { questId, completed }) {
  const data = await apiRequest('/students/progress', {
    method: 'POST',
    body: { questId, completed },
    token,
  })
  return data.attempt
}

/**
 * Fetches the logged-in student's progress summary, one row per quest:
 * { quest_id, completed, attempts, best_score }.
 * GET /api/students/progress
 *
 * @param {string} token
 * @returns {Promise<Array<object>>}
 */
export async function fetchProgress(token) {
  const data = await apiRequest('/students/progress', { token })
  return data.progress
}