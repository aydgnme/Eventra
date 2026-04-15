import api from './api'

export const authService = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  register: (email, password, full_name, role = 'student') =>
    api.post('/auth/register', { email, password, full_name, role }).then((r) => r.data),

  googleLogin: (credential) =>
    api.post('/auth/google', { credential }).then((r) => r.data),

  logout: () => {
    localStorage.removeItem('eventra_token')
  },

  getMe: () => api.get('/auth/me').then((r) => r.data),
}
