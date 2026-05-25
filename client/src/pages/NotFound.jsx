import { Link } from 'react-router-dom'

// 404 page shown when a user hits an unknown URL.
function NotFound() {
  return (
    <div style={{ padding: '2rem', color: '#fff', textAlign: 'center' }}>
      <h1>404</h1>
      <p>This page does not exist.</p>
      <Link to="/login" style={{ color: '#f0c674' }}>Go back to login</Link>
    </div>
  )
}

export default NotFound