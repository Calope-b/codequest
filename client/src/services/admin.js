// client/src/services/admin.js
// API calls for the admin endpoints. Thin wrappers around apiRequest so
// components never hardcode paths or response shapes. Mirrors the style of
// services/teachers.js. Every endpoint is behind requireRole('admin')
// server-side; the token comes from the AuthContext.

import { apiRequest } from './api'

/**
 * Lists every account on the platform.
 * GET /api/admin/users
 * @param {string} token
 * @returns {Promise<Array<{ id, email, role, created_at }>>}
 */
export async function fetchUsers(token) {
  const data = await apiRequest('/admin/users', { token })
  return data.users
}

/**
 * Changes a user's role. The backend accepts only 'student' or 'teacher'
 * (admin is seed-only) and refuses acting on your own account; both come
 * back as an Error with the backend's message, ready to show as-is.
 * PATCH /api/admin/users/:id/role
 * @param {string} token
 * @param {number} userId
 * @param {string} role
 * @returns {Promise<{ id, email, role }>}  the updated user
 */
export async function updateUserRole(token, userId, role) {
  const data = await apiRequest(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: { role },
    token,
  })
  return data.user
}

/**
 * Deletes a user account. The backend answers 204 with no body, so this
 * resolves on success without returning anything. Refuses deleting your
 * own account (400).
 * DELETE /api/admin/users/:id
 * @param {string} token
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function deleteUser(token, userId) {
  await apiRequest(`/admin/users/${userId}`, {
    method: 'DELETE',
    token,
  })
}