import api from './api'

export const eventService = {
  getEvents: (params = {}) =>
    api.get('/events/', { params }).then((r) => r.data),

  getEvent: (id) =>
    api.get(`/events/${id}`).then((r) => r.data),

  createEvent: (data) =>
    api.post('/events/', data).then((r) => r.data),

  updateEvent: (id, data) =>
    api.put(`/events/${id}`, data).then((r) => r.data),

  deleteEvent: (id) =>
    api.delete(`/events/${id}`).then((r) => r.data),

  getMaterials: (id) =>
    api.get(`/events/${id}/materials`).then((r) => r.data),

  uploadMaterial: (id, file, onProgress) => {
    const formData = new FormData()
    formData.append('file', file)
    return api
      .post(`/events/${id}/materials`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded * 100) / e.total))
          }
        },
      })
      .then((r) => r.data)
  },

  deleteMaterial: (id, mid) =>
    api.delete(`/events/${id}/materials/${mid}`).then((r) => r.data),

  downloadMaterial: (id, mid) =>
    api
      .get(`/events/${id}/materials/${mid}/download`, { responseType: 'blob' })
      .then((r) => r.data),
}
