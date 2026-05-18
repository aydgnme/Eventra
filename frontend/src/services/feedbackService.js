import api from './api'

export const feedbackService = {
  submitFeedback: (eventId, rating, comment) =>
    api.post('/feedback/', { event_id: eventId, rating, comment }).then((r) => r.data),

  getEventFeedback: (eventId) =>
    api.get(`/feedback/event/${eventId}`).then((r) => r.data),

  getMyFeedback: () =>
    api.get('/feedback/my').then((r) => r.data),
}
