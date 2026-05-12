// client/src/services/api.js
// Thin wrapper around fetch for the CodeQuest backend.
// Keeps URL building, JSON serialization, and error mapping in one place
// so components don't have to repeat it everywhere.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, { method = 'GET', body, token } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    // Try to parse JSON either way: the backend returns { error } on failures too.
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        // Build a useful Error: message from backend, status code, full payload.
        const err = new Error(data.error || `HTTP ${res.status}`);
        err.status = res.status;
        err.data = data;
        throw err;
    }

    return data;
}

// Public API: one function per backend endpoint.
export const api = {
    register: (body) => request('/auth/register', { method: 'POST', body }),
    login: (body) => request('/auth/login', { method: 'POST', body }),
    me: (token) => request('/auth/me', { token }),
};