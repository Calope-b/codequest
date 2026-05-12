// client/src/App.jsx
// Top-level component. Declares every route in the app.
// Protected routes are wrapped in <RequireAuth> with the roles allowed.

import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import RequireAuth from './components/RequireAuth';

function Home() {
    return (
        <div style={{ padding: 24 }}>
            <h1>CodeQuest</h1>
            <p>A gamified platform to learn programming.</p>
            <nav>
                <Link to="/login">Login</Link>
                {' · '}
                <Link to="/register">Register</Link>
            </nav>
        </div>
    );
}

export default function App() {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes, one per role */}
            <Route
                path="/game"
                element={
                    <RequireAuth allowedRoles={['student']}>
                        <StudentDashboard />
                    </RequireAuth>
                }
            />
            <Route
                path="/dashboard"
                element={
                    <RequireAuth allowedRoles={['teacher']}>
                        <TeacherDashboard />
                    </RequireAuth>
                }
            />
            <Route
                path="/admin"
                element={
                    <RequireAuth allowedRoles={['admin']}>
                        <AdminDashboard />
                    </RequireAuth>
                }
            />

            {/* Catch-all: any unknown URL goes home */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}