// client/src/context/AuthContext.jsx
// Single source of truth for "who is logged in".
// Holds user + token, exposes login/register/logout, and re-validates the
// token on mount so a page refresh keeps the session alive.

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';

// The localStorage key. Namespaced to avoid colliding with anything else
// the same browser origin might use later.
const TOKEN_KEY = 'codequest.token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // user is null when logged out, { id, email, role } when logged in.
    const [user, setUser] = useState(null);
    // token mirrors localStorage in component state, so React re-renders on change.
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    // loading is true until the initial /me check on mount has finished.
    // Used by RequireAuth so we don't flash the login page during the check.
    const [loading, setLoading] = useState(true);

    // On mount: if we already have a token in localStorage, ask the backend
    // who that token belongs to. If it's still valid, restore the session.
    // If the backend rejects it (expired, user deleted), clear it silently.
    useEffect(() => {
        let cancelled = false;

        async function restoreSession() {
            const stored = localStorage.getItem(TOKEN_KEY);
            if (!stored) {
                setLoading(false);
                return;
            }
            try {
                const { user: fresh } = await api.me(stored);
                if (!cancelled) {
                    setUser(fresh);
                }
            } catch {
                if (!cancelled) {
                    localStorage.removeItem(TOKEN_KEY);
                    setToken(null);
                    setUser(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        restoreSession();
        return () => { cancelled = true; };
    }, []); // runs once on mount; subsequent token changes are managed by login/logout

    const login = useCallback(async (email, password) => {
        const { token: newToken, user: newUser } = await api.login({ email, password });
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
        setUser(newUser);
        return newUser; // returned so the caller can redirect based on role
    }, []);

    const register = useCallback(async (email, password, role) => {
        const { token: newToken, user: newUser } = await api.register({ email, password, role });
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
        setUser(newUser);
        return newUser;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
    }, []);

    const value = { user, token, loading, login, register, logout };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Convenience hook so components write `const { user, login } = useAuth()`
// instead of `useContext(AuthContext)` everywhere.
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used inside <AuthProvider>');
    }
    return ctx;
}