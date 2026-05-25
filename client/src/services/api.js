// Centralized helper for talking to the Express backend.
// Using a single function (instead of fetch() everywhere) gives us:
//   - One place to attach the JWT to every authenticated request
//   - Consistent error handling across the whole app
//   - Easier mocking later if we add tests on the frontend

const API_BASE = '/api' // Vite proxy forwards this to http://localhost:5000

/**
 * Performs an HTTP request against the backend API.
 *
 * @param {string} path     - Path relative to /api (e.g. '/auth/login')
 * @param {object} options  - Standard fetch options + an optional `token`
 * @returns {Promise<any>}  - Parsed JSON response body
 * @throws  {Error}         - On non-2xx responses, with the backend's message
 */
export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }

  // Attach the JWT if the caller provided one.
  // Backend middleware expects: Authorization: Bearer <token>
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  // Try to parse JSON even on errors: our backend always returns
  // { message: "..." } on failures, so we want that message.
  let data = null
  try {
    data = await response.json()
  } catch {
    // Empty or non-JSON response body — leave data as null
  }

  if (!response.ok) {
  // Backend error messages may live under `message` or `error` depending
  // on the convention used. We check both before falling back to a generic.
  const message =
    data?.message ||
    data?.error ||
    `Request failed with status ${response.status}`
  throw new Error(message)
}

  return data
}