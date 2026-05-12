// client/src/components/RequireAuth.jsx
// Route guard. Wraps a protected page and handles three cases:
//   1. The initial /me check is still running -> show a loader
//   2. No user logged in                       -> redirect to /login
//   3. User logged in but with the wrong role  -> redirect to their own home
// If everything checks out, render the children.

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Mirrors the table in Login.jsx and Register.jsx.
// One day this should live in a shared config module.
const ROLE_HOME = {
    student: '/game',
    teacher: '/dashboard',
    admin: '/admin',
};

export default function RequireAuth({ children, allowedRoles }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    // Case 1: we don't know yet whether the user is logged in.
    // The AuthProvider is still doing the GET /me on mount.
    if (loading) {
        return <div style={{ padding: 24 }}>Loading...</div>;
    }

    // Case 2: no user. Send them to /login, remembering where they tried to go
    // so we could redirect them back after login (used by Login.jsx if needed).
    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // Case 3: logged in but wrong role for this route.
    // E.g. a student trying to open /admin. Send them to their own home.
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;
    }

    return children;
}