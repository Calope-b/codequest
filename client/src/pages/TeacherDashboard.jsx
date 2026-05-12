// client/src/pages/TeacherDashboard.jsx
// Placeholder for the teacher progress dashboard. Real class management
// and student tracking will land here in a later phase.

import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function TeacherDashboard() {
    const { user, logout } = useAuth();

    return (
        <div style={{ padding: 24 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Teacher dashboard</h1>
                <div>
                    <span style={{ marginRight: 12 }}>{user.email}</span>
                    <button onClick={logout} style={{ padding: '6px 12px' }}>Logout</button>
                </div>
            </header>
            <p>Your class progress overview will appear here.</p>
        </div>
    );
}