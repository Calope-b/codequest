import { createContext, useContext, useEffect, useState } from 'react'
import { apiRequest } from '../services/api'

// Storage key for the JWT in sessionStorage.
// Using a constant avoids typos and makes future renames painless.
const TOKEN_STORAGE_KEY = 'codequest_token'

// React context that will hold the authentication state.
// Default value is null so consumers without a provider get a clear error.
const AuthContext = createContext(null)

/**
 * Provider component that wraps the application and exposes auth state.
 * Must be placed above any component that calls useAuth().
 *
 * Why sessionStorage (not localStorage):
 *   - Token is wiped when the user closes the browser/tab, shrinking the
 *     window an XSS-stolen token could be reused
 *   - Trade-off: users have to log in again on each new browser session,
 *     which is acceptable for a classroom platform used during lessons
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  // `loading` is true on the very first render, while we check whether
  // a token is already present in sessionStorage (e.g. user refreshed the
  // page). Without this flag, ProtectedRoute would briefly redirect every
  // logged-in user to /login on every refresh.
  const [loading, setLoading] = useState(true)

  // On mount: try to restore a session from sessionStorage.
  useEffect(() => {
    const storedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY)

    if (!storedToken) {
      setLoading(false)
      return
    }

    // We have a token. Ask the backend who it belongs to via the protected
    // route /api/me. This also validates the token (expired/invalid -> 401).
    apiRequest('/auth/me', { token: storedToken })
      .then((data) => {
        setToken(storedToken)
        setUser(data.user)
      })
      .catch(() => {
        // Token invalid or expired — clean up so we don't loop on it.
        sessionStorage.removeItem(TOKEN_STORAGE_KEY)
      })
      .finally(() => setLoading(false))
  }, [])

  /**
   * Logs the user in by calling POST /api/auth/login.
   * On success, stores the token in state and sessionStorage.
   * Throws on failure so the calling component can show an error.
   */
  async function login(email, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    })

    sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  /**
   * Registers a new user via POST /api/auth/register.
   * On success, the backend returns a token + user, so we log the user in
   * immediately rather than forcing them through the login page.
   */
  async function register(email, password, role) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: { email, password, role },
    })

    sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  /**
   * Clears all auth state. Pure client-side: stateless JWT means there is
   * nothing to invalidate on the backend.
   */
  function logout() {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken(null)
    setUser(null)
  }

  const value = { user, token, loading, login, register, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook used by any component that needs auth state or actions.
 * Throws a clear error if called outside <AuthProvider>, which catches
 * setup mistakes immediately instead of silently returning null.
 */
export function useAuth() {
  const context = useContext(AuthContext)

  if (context === null) {
    throw new Error('useAuth must be used inside an <AuthProvider>')
  }

  return context
}