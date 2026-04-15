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

export const eventsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/events/${qs ? '?' + qs : ''}`)
  },
  mine: () => request('/events/mine'),
  get: (id) => request(`/events/${id}`),
  create: (data) =>
    request('/events/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) =>
    request(`/events/${id}`, { method: 'DELETE' }),
}

export const registrationsApi = {
  my: () => request('/registrations/my'),
  register: (event_id) =>
    request('/registrations/', {
      method: 'POST',
      body: JSON.stringify({ event_id }),
    }),
  cancel: (registration_id) =>
    request(`/registrations/${registration_id}/cancel`, { method: 'POST' }),
  eventRegistrations: (event_id) =>
    request(`/registrations/event/${event_id}`),
  eventCount: (event_id) =>
    request(`/registrations/event/${event_id}/count`),
}

export function getOAuthGoogleUrl() {
  const base = import.meta.env.VITE_OAUTH_BASE ?? 'http://localhost:5051'
  return `${base}/auth/oauth/google`
}
