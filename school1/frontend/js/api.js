// js/api.js
// js/api.js
const API_BASE = '/api'; // Relative URL

async function apiRequest(path, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
        const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
        if (response.status === 401) { logout(); return; }
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error');
        return data;
    } catch (err) { console.error("API Error:", err); throw err; }
}