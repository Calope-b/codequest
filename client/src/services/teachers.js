// client/src/services/teachers.js
// API calls for the teacher endpoints. Thin wrappers around apiRequest so
// components never hardcode paths or response shapes. Mirrors the style of
// services/progress.js. Every endpoint is behind requireRole('teacher')
// server-side; the token comes from the AuthContext.

import { apiRequest } from './api'

/**
 * Lists the teacher's own classes, each with its student_count.
 * GET /api/teachers/classes
 * @param {string} token
 * @returns {Promise<Array<{ id, name, created_at, student_count }>>}
 */
export async function fetchClasses(token) {
  const data = await apiRequest('/teachers/classes', { token })
  return data.classes
}

/**
 * Creates a class and returns the new row.
 * POST /api/teachers/classes
 * @param {string} token
 * @param {string} name
 * @returns {Promise<{ id, name, created_at }>}
 */
export async function createClass(token, name) {
  const data = await apiRequest('/teachers/classes', {
    method: 'POST',
    body: { name },
    token,
  })
  return data.class
}

/**
 * Adds a student to a class by email. The backend returns distinct errors
 * (404 unknown email, 400 not a student, 409 already in class) that
 * apiRequest surfaces as an Error with the backend's message, ready to
 * show to the teacher as-is.
 * POST /api/teachers/classes/:id/students
 * @param {string} token
 * @param {number} classId
 * @param {string} email
 * @returns {Promise<{ id, email }>}  the added student
 */
export async function addStudent(token, classId, email) {
  const data = await apiRequest(`/teachers/classes/${classId}/students`, {
    method: 'POST',
    body: { email },
    token,
  })
  return data.student
}

/**
 * Removes a student from a class. Returns nothing useful (the backend
 * answers 204), so we just resolve on success.
 * DELETE /api/teachers/classes/:id/students/:studentId
 * @param {string} token
 * @param {number} classId
 * @param {number} studentId
 * @returns {Promise<void>}
 */
export async function removeStudent(token, classId, studentId) {
  await apiRequest(`/teachers/classes/${classId}/students/${studentId}`, {
    method: 'DELETE',
    token,
  })
}

/**
 * Fetches one class's aggregated progress: { class, students }, where each
 * student has a quests array (empty if they never attempted anything).
 * GET /api/teachers/classes/:id/progress
 * @param {string} token
 * @param {number} classId
 * @returns {Promise<{ class: object, students: Array<object> }>}
 */
export async function fetchClassProgress(token, classId) {
  return apiRequest(`/teachers/classes/${classId}/progress`, { token })
}