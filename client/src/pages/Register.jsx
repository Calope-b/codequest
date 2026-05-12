// client/src/pages/Register.jsx
// Email + password + role form. On success, logs the user in immediately
// (the backend already returns a token with register) and redirects
// to the role's home page.

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_HOME = {
    student: '/game',
    teacher: '/dashboard',
    admin: '/admin',
};

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student'); // matches backend whitelist
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const user = await register(email, password, role);
            navigate(ROLE_HOME[user.role] || '/', { replace: true });
        } catch (err) {
            setError(err.data?.error || err.message || 'Registration failed');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div style={{ padding: 24, maxWidth: 400 }}>
            <h1>Create an account</h1>
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
                        Password (at least 8 characters)
                        <br />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            style={{ width: '100%', padding: 8 }}
                        />
                    </label>
                </div>
                <div style={{ marginBottom: 12 }}>
                    <label>
                        Role
                        <br />
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            style={{ width: '100%', padding: 8 }}
                        >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                        </select>
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
                    {submitting ? 'Creating account...' : 'Create account'}
                </button>
            </form>
            <p style={{ marginTop: 16 }}>
                Already have an account? <Link to="/login">Sign in</Link>
            </p>
        </div>
    );
}