import api from './api'

export const getMyNotifications = () =>
  api.get('/notifications/my').then(r => r.data)

export const markRead = (id) =>
  api.patch(`/notifications/${id}/read`).then(r => r.data)

export const markAllRead = () =>
  api.post('/notifications/mark-all-read').then(r => r.data)

export default { getMyNotifications, markRead, markAllRead }
