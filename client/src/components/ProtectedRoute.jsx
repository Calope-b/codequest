import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Wraps a route to enforce authentication and (optionally) a specific role.
 *
 * Usage:
 *   <Route path="/student" element={
 *     <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
 *   } />
 *
 * Behavior:
 *   - While AuthContext is still restoring the session, show a loader so
 *     we don't redirect a logged-in user to /login on every page refresh.
 *   - If no user is authenticated, redirect to /login and remember where
 *     they were trying to go (via location state) so we could bounce them
 *     back after login. (Wiring that bounce-back is optional and can be
 *     added later in Login.jsx.)
 *   - If a specific `role` is required and the user has a different role,
 *     redirect them to their own dashboard. Prevents privilege escalation
 *     via URL typing.
 */
function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Boot phase: token restoration is in flight. Render a placeholder
  // instead of making a routing decision with stale information.
  if (loading) {
    return (
      <div style={{ padding: '2rem', color: '#c7cde0', textAlign: 'center' }}>
        Loading...
      </div>
    )
  }

  // Not logged in -> bounce to /login. We pass `from` in location state
  // so a future improvement in Login.jsx can redirect back after login.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Logged in but wrong role -> send them to their own home rather than
  // showing a 403. Less friction, and matches what a real app does.
  if (role && user.role !== role) {
    return <Navigate to={roleToHome(user.role)} replace />
  }

  // All checks passed: render the protected page.
  return children
}

// Same helper as in Login/Register. If we end up duplicating it a third
// time, we'll move it to services/.
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

export default ProtectedRoute