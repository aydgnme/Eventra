import api from './api'

// User Management
/** Get paginated/filtered user list. params: { role, is_active, page } */
export const getUsers = (params) => api.get('/admin/users', { params }).then(r => r.data)

/** Get single user by ID */
export const getUserById = (id) => api.get(`/admin/users/${id}`).then(r => r.data)

/** Activate a user account */
export const activateUser = (id) => api.patch(`/admin/users/${id}/activate`).then(r => r.data)

/** Deactivate a user account */
export const deactivateUser = (id) => api.patch(`/admin/users/${id}/deactivate`).then(r => r.data)

/** Permanently delete a user */
export const deleteUser = (id) => api.delete(`/admin/users/${id}`).then(r => r.data)

/** Update user role. role: 'student' | 'organizer' | 'admin' */
export const updateUserRole = (id, role) => api.patch(`/admin/users/${id}/role`, { role }).then(r => r.data)

// Event Validation
/** Get events pending validation */
export const getPendingEvents = () => api.get('/admin/events/pending').then(r => r.data)

/** Approve/validate an event */
export const validateEvent = (id) => api.post(`/admin/events/${id}/validate`).then(r => r.data)

/** Reject an event with a reason */
export const rejectEvent = (id, reason) => api.post(`/admin/events/${id}/reject`, { reason }).then(r => r.data)

/** Publish an event */
export const publishEvent = (id) => api.post(`/admin/events/${id}/publish`).then(r => r.data)

/** Unpublish an event */
export const unpublishEvent = (id) => api.post(`/admin/events/${id}/unpublish`).then(r => r.data)

// Reports
/** Get summary statistics */
export const getReportSummary = () => api.get('/admin/reports/summary').then(r => r.data)

/** Get events report for a specific month/year */
export const getEventsReport = (params) => api.get('/admin/reports/events', { params }).then(r => r.data)

/** Get organizers performance report */
export const getOrganizersReport = () => api.get('/admin/reports/organizers').then(r => r.data)

/** Export report as PDF blob */
export const exportReportPDF = () => api.get('/admin/reports/export', { responseType: 'blob' }).then(r => r.data)

const adminService = {
  getUsers, getUserById, activateUser, deactivateUser, deleteUser, updateUserRole,
  getPendingEvents, validateEvent, rejectEvent, publishEvent, unpublishEvent,
  getReportSummary, getEventsReport, getOrganizersReport, exportReportPDF,
}
export default adminService
