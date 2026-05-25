import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

// Placeholder for the student game view.
// Will host the Phaser canvas and Blockly editor in Phase 3.
function TeacherDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ padding: '2rem', color: '#fff', backgroundColor: '#0f1320', minHeight: '100vh' }}>
      <h1>Teacher Dashboard</h1>
      <p>Logged in as: {user?.email}</p>
      <button onClick={handleLogout}>Log out</button>
    </div>
  )
}

export default TeacherDashboard