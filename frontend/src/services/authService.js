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

  updateProfile: (data) => api.put('/auth/me', data).then((r) => r.data),

  changePassword: (currentPassword, newPassword) =>
    api
      .post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      .then((r) => r.data),

  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token, newPassword) =>
    api
      .post('/auth/reset-password', { token, new_password: newPassword })
      .then((r) => r.data),

  refreshToken: () => api.post('/auth/refresh').then((r) => r.data),
}

export function getOAuthGoogleUrl() {
  const base = import.meta.env.VITE_OAUTH_BASE ?? '/api'
  return `${base.replace(/\/$/, '')}/auth/oauth/google`
}
