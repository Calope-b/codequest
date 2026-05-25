import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../css/Register.css'

function Register() {
  // Form state (input values)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [role, setRole] = useState('student') // default to the most common case

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { register } = useAuth()
  const navigate = useNavigate()

  // Form submission handler. Validates input client-side, then calls
  // AuthContext.register() which hits POST /api/auth/register and logs
  // the user in on success.
  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    // Client-side validation. The backend re-validates everything, so we
    // only do enough here to catch the obvious mistakes early.
    const validationError = validateForm({ email, password, passwordConfirm })
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      const user = await register(email, password, role)
      // Same role-based redirection as Login: a freshly-registered user
      // is already authenticated, so we send them to their dashboard.
      const destination = roleToHome(user.role)
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      <div className="register-card">
        <h1 className="register-title">CodeQuest</h1>
        <p className="register-subtitle">Create your account to begin your quest</p>

        <form onSubmit={handleSubmit} className="register-form" noValidate>
          <label className="register-label">
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

          <label className="register-label">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
              required
            />
          </label>

          <label className="register-label">
            Confirm password
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
              required
            />
          </label>

          {/* Role selector. Admin is intentionally not exposed here:
              admin accounts must be provisioned manually for security. */}
          <fieldset className="register-fieldset" disabled={loading}>
            <legend>I am a...</legend>

            <label className="register-radio">
              <input
                type="radio"
                name="role"
                value="student"
                checked={role === 'student'}
                onChange={(e) => setRole(e.target.value)}
              />
              Student
            </label>

            <label className="register-radio">
              <input
                type="radio"
                name="role"
                value="teacher"
                checked={role === 'teacher'}
                onChange={(e) => setRole(e.target.value)}
              />
              Teacher
            </label>
          </fieldset>

          {error && <div className="register-error">{error}</div>}

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="register-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

// Returns an error message if the form has a problem, or null if it's valid.
// Kept as a pure helper so it's trivial to unit-test if we want to later.
function validateForm({ email, password, passwordConfirm }) {
  if (!email || !password || !passwordConfirm) {
    return 'Please fill in all fields.'
  }
  if (!email.includes('@')) {
    return 'Please enter a valid email address.'
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.'
  }
  if (password !== passwordConfirm) {
    return 'Passwords do not match.'
  }
  return null
}

// Maps a user role to the path they should land on after authentication.
// Duplicated from Login for now; if a third page ever needs this, we'll
// promote it to a shared helper in services/.
function roleToHome(role) {
  switch (role) {
    case 'student':
      return '/student'
    case 'teacher':
      return '/teacher'
    case 'admin':
      return '/admin'
    default:
      return '/login'
  }
}

export default Register