const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getToken() {
  return localStorage.getItem('aeramea_token');
}

export function setToken(token) {
  localStorage.setItem('aeramea_token', token);
}

export function clearToken() {
  localStorage.removeItem('aeramea_token');
}

export async function apiFetch(path, options = {}, overrideToken) {
  const token = overrideToken ?? getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
