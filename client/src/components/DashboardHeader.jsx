// client/src/components/DashboardHeader.jsx
// Shared header for the three dashboards (student, teacher, admin).
// Replaces the duplicated h1 + "Logged in as" + Log out block. Takes the
// page title as a prop, reads the current user from the auth context, and
// calls logout then redirects to /login. Purely presentational beyond the
// logout action, so the dashboards keep all their own logic.

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../css/DashboardHeader.css'

function DashboardHeader({ title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="dashboard-header">
      <h1 className="dashboard-header-title">{title}</h1>
      <div className="dashboard-header-account">
        <span className="dashboard-header-email">{user?.email}</span>
        <button className="dashboard-header-logout" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  )
}

export default DashboardHeader