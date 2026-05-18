import api from './api'

export const registrationService = {
  // ── Doc-compliant path-param endpoints ──────────────────────────────────

  register: (eventId) =>
    api.post(`/registrations/${eventId}/register`).then((r) => r.data),

  cancel: (eventId) =>
    api.delete(`/registrations/${eventId}/register`).then((r) => r.data),

  getStatus: (eventId) =>
    api.get(`/registrations/${eventId}/status`).then((r) => r.data),

  // ── Waitlist ────────────────────────────────────────────────────────────

  joinWaitlist: (eventId) =>
    api.post(`/registrations/${eventId}/waitlist`).then((r) => r.data),

  leaveWaitlist: (eventId) =>
    api.delete(`/registrations/${eventId}/waitlist`).then((r) => r.data),

  getWaitlist: (eventId) =>
    api.get(`/registrations/${eventId}/waitlist`).then((r) => r.data),

  // ── My registrations ───────────────────────────────────────────────────

  getMyRegistrations: (params = {}) =>
    api.get('/registrations/my', { params }).then((r) => r.data),

  // ── Participants (organizer / admin) ────────────────────────────────────

  getParticipants: (eventId, params = {}) =>
    api.get(`/registrations/${eventId}/participants`, { params }).then((r) => r.data),

  exportParticipants: (eventId, params = {}) =>
    api
      .get(`/registrations/${eventId}/participants/export`, {
        params,
        responseType: 'blob',
      })
      .then((r) => r.data),

  // ── Check-in (organizer / admin) ────────────────────────────────────────

  checkin: (eventId, userId) =>
    api.post(`/registrations/${eventId}/checkin/${userId}`).then((r) => r.data),

  undoCheckin: (eventId, userId) =>
    api.delete(`/registrations/${eventId}/checkin/${userId}`).then((r) => r.data),

  // ── Counts (public) ─────────────────────────────────────────────────────

  getCount: (eventId) =>
    api.get(`/registrations/event/${eventId}/count`).then((r) => r.data),

  getCounts: (eventIds) => {
    if (!eventIds?.length) return Promise.resolve({ counts: {} })
    return api
      .get('/registrations/counts', { params: { event_ids: eventIds.join(',') } })
      .then((r) => r.data)
  },

  // ── QR & Confirmation ───────────────────────────────────────────────────

  getTicket: (eventId) =>
    api.get(`/registrations/${eventId}/ticket`).then((r) => r.data),

  confirmAttendance: (eventId) =>
    api.post(`/registrations/${eventId}/confirm`).then((r) => r.data),

  checkinByQR: (token) =>
    api.post(`/registrations/checkin/qr/${token}`).then((r) => r.data),

  rejectParticipant: (eventId, userId) =>
    api.post(`/registrations/${eventId}/reject/${userId}`).then((r) => r.data),
}
