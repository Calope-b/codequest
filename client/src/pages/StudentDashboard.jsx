// client/src/pages/StudentDashboard.jsx
// Placeholder for the student game view. The real Phaser canvas + Blockly
// editor will land here in a later phase.

import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function StudentDashboard() {
    const { user, logout } = useAuth();

    return (
        <div style={{ padding: 24 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Student game</h1>
                <div>
                    <span style={{ marginRight: 12 }}>{user.email}</span>
                    <button onClick={logout} style={{ padding: '6px 12px' }}>Logout</button>
                </div>
            </header>
            <p>Welcome, knight. The Phaser game canvas will appear here.</p>
        </div>
    );
}