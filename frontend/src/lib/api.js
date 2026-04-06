const BASE = '/api'

function getToken() {
  return localStorage.getItem('eventra_token')
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = data.error || data.message || `HTTP ${res.status}`
    throw new Error(message)
  }

  return data
}

export const authApi = {
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request('/auth/me'),

  register: (email, password, full_name, role = 'student') =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name, role }),
    }),
}

export function getOAuthGoogleUrl() {
  const base = import.meta.env.VITE_OAUTH_BASE ?? 'http://localhost:5051'
  return `${base}/auth/oauth/google`
}
