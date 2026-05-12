// client/src/pages/AdminDashboard.jsx
// Placeholder for the admin user management panel. Real user CRUD and
// content seeding controls will land here in a later phase.

import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
    const { user, logout } = useAuth();

    return (
        <div style={{ padding: 24 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Admin panel</h1>
                <div>
                    <span style={{ marginRight: 12 }}>{user.email}</span>
                    <button onClick={logout} style={{ padding: '6px 12px' }}>Logout</button>
                </div>
            </header>
            <p>User management and content seeding tools will appear here.</p>
        </div>
    );
}