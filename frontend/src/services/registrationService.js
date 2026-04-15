import api from './api'

export const registrationService = {
  register: (eventId) =>
    api.post('/registrations/', { event_id: eventId }).then((r) => r.data),

  cancel: (registrationId) =>
    api.post(`/registrations/${registrationId}/cancel`).then((r) => r.data),

  joinWaitlist: (eventId) =>
    api.post('/registrations/', { event_id: eventId }).then((r) => r.data),

  leaveWaitlist: (registrationId) =>
    api.post(`/registrations/${registrationId}/cancel`).then((r) => r.data),

  getMyRegistrations: () =>
    api.get('/registrations/my').then((r) => r.data),

  getParticipants: (eventId) =>
    api.get(`/registrations/event/${eventId}`).then((r) => r.data),

  getCount: (eventId) =>
    api.get(`/registrations/event/${eventId}/count`).then((r) => r.data),
}
