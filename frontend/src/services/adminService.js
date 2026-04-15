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

const adminService = { getUsers, getUserById, activateUser, deactivateUser, deleteUser, updateUserRole }
export default adminService
