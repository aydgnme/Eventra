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

export const eventsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.q) qs.set('q', params.q)
    if (params.category) qs.set('category', params.category)
    if (params.mode) qs.set('mode', params.mode)
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    if (params.page) qs.set('page', params.page)
    if (params.per_page) qs.set('per_page', params.per_page)
    const query = qs.toString()
    return request(`/events/${query ? `?${query}` : ''}`)
  },

  get: (id) => request(`/events/${id}`),

  mine: () => request('/events/mine'),
}
