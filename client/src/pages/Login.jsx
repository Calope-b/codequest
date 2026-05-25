import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../css/Login.css'

function Login() {
  // Form state (input values)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // UI state (loading flag and error message shown to the user)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login } = useAuth()
  const navigate = useNavigate()

  // Form submission handler. Calls AuthContext.login(), which talks to
  // POST /api/auth/login under the hood, then routes the user to the
  // dashboard matching their role.
  async function handleSubmit(event) {
    event.preventDefault() // prevent the default full-page reload
    setError('')

    // Client-side validation: bail out early if a field is empty.
    // The real validation is done by the backend.
    if (!email || !password) {
      setError('Please fill in both fields.')
      return
    }

    setLoading(true)

    try {
      const user = await login(email, password)
      // Role-based redirection. Keeps the routing decision in one place
      // so we don't sprinkle role checks throughout the codebase.
      const destination = roleToHome(user.role)
      navigate(destination, { replace: true })
    } catch (err) {
      // Backend returns a generic "Invalid email or password" on 401,
      // which we surface as-is. Other errors fall back to the message.
      setError(err.message || 'Login failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">CodeQuest</h1>
        <p className="login-subtitle">Sign in to continue your quest</p>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <label className="login-label">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
              required
            />
          </label>

          <label className="login-label">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              required
            />
          </label>

          {/* Error block shown only when `error` is non-empty */}
          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="login-footer">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  )
}

// Maps a user role to the path they should land on after authentication.
// Kept as a small helper so it's trivial to update if landing pages change.
function roleToHome(role) {
  switch (role) {
    case 'student':
      return '/student'
    case 'teacher':
      return '/teacher'
    case 'admin':
      return '/admin'
    default:
      return '/login' // unknown role -> safe fallback
  }
}

export default Login