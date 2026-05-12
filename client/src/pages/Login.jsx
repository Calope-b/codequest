// client/src/pages/Login.jsx
// Email + password form. On success, redirects to the role's home page.

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Where each role lands after a successful login.
// Kept here (and mirrored in Register.jsx) until we have a routing config module.
const ROLE_HOME = {
    student: '/game',
    teacher: '/dashboard',
    admin: '/admin',
};

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const user = await login(email, password);
            // replace: true so the browser back button doesn't return to /login
            navigate(ROLE_HOME[user.role] || '/', { replace: true });
        } catch (err) {
            // err.data.error is the backend's message ("Invalid email or password")
            setError(err.data?.error || err.message || 'Login failed');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div style={{ padding: 24, maxWidth: 400 }}>
            <h1>Login</h1>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 12 }}>
                    <label>
                        Email
                        <br />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            style={{ width: '100%', padding: 8 }}
                        />
                    </label>
                </div>
                <div style={{ marginBottom: 12 }}>
                    <label>
                        Password
                        <br />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            style={{ width: '100%', padding: 8 }}
                        />
                    </label>
                </div>
                {error && (
                    <p style={{ color: 'crimson', marginTop: 0 }}>{error}</p>
                )}
                <button
                    type="submit"
                    disabled={submitting}
                    style={{ padding: '8px 16px' }}
                >
                    {submitting ? 'Signing in...' : 'Sign in'}
                </button>
            </form>
            <p style={{ marginTop: 16 }}>
                No account yet? <Link to="/register">Register</Link>
            </p>
        </div>
    );
}