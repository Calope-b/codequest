import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchUsers, updateUserRole, deleteUser } from '../services/admin'
import '../css/AdminDashboard.css'

// Roles the admin can assign through the UI. 'admin' is absent on purpose:
// the backend only accepts student/teacher (admins are seed-only), so the
// select never offers a promotion the server would reject.
const ASSIGNABLE_ROLES = ['student', 'teacher']

// Admin-facing page: a single table of every account, with per-row role
// change and delete. The admin's own row is read-only, matching the
// backend's self-protection so the UI never offers an action it knows
// will be refused.
function AdminDashboard() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // ----- Load all users on mount -----
  useEffect(() => {
    if (!token) return
    let cancelled = false

    fetchUsers(token)
      .then((rows) => {
        if (!cancelled) setUsers(rows)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  // Refetches the full list so the screen reflects the database after a
  // change rather than a guessed local update.
  async function refresh() {
    const rows = await fetchUsers(token)
    setUsers(rows)
  }

  async function handleRoleChange(userId, role) {
    setError('')
    try {
      await updateUserRole(token, userId, role)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(userId, email) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete ${email}? This also removes their attempts and classes.`)) {
      return
    }
    setError('')
    try {
      await deleteUser(token, userId)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
      <p>Logged in as: {user?.email}</p>
      <button onClick={handleLogout}>Log out</button>

      {error && <p className="admin-error">{error}</p>}

      {loading && <p className="muted">Loading…</p>}

      {!loading && (
        <div className="users-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Registered</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === user?.id
                const isAdmin = u.role === 'admin'
                return (
                  <tr key={u.id}>
                    <td>
                      {u.email}{' '}
                      {isSelf && <span className="you-tag">(you)</span>}
                    </td>
                    <td>
                      {/* An existing admin's role is not editable here
                          (the API won't assign admin), and you can't
                          change your own. Both show a plain label. */}
                      {isAdmin || isSelf ? (
                        <span className="role-label">{u.role}</span>
                      ) : (
                        <select
                          className="role-select"
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        >
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn-danger"
                        onClick={() => handleDelete(u.id, u.email)}
                        disabled={isSelf}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard