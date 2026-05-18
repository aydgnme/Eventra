import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '../../services/api'

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }
}))

import { getUsers, activateUser, deactivateUser, updateUserRole, deleteUser,
         getPendingEvents, validateEvent, rejectEvent, publishEvent,
         getReportSummary, getEventsReport, exportReportPDF } from '../../services/adminService'

describe('adminService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('User Management', () => {
    it('getUsers returns paginated user list', async () => {
      const mockData = { users: [], total: 0 }
      api.get.mockResolvedValue({ data: mockData })
      const result = await getUsers({ page: 1 })
      expect(api.get).toHaveBeenCalledWith('/admin/users', { params: { page: 1 } })
      expect(result).toEqual(mockData)
    })

    it('activateUser calls correct endpoint with PATCH', async () => {
      api.patch.mockResolvedValue({ data: { success: true } })
      await activateUser(5)
      expect(api.patch).toHaveBeenCalledWith('/admin/users/5/activate')
    })

    it('deactivateUser calls correct endpoint with PATCH', async () => {
      api.patch.mockResolvedValue({ data: { success: true } })
      await deactivateUser(3)
      expect(api.patch).toHaveBeenCalledWith('/admin/users/3/deactivate')
    })

    it('updateUserRole sends correct role in body', async () => {
      api.patch.mockResolvedValue({ data: { success: true } })
      await updateUserRole(7, 'organizer')
      expect(api.patch).toHaveBeenCalledWith('/admin/users/7/role', { role: 'organizer' })
    })

    it('deleteUser calls DELETE /admin/users/:id', async () => {
      api.delete.mockResolvedValue({ data: { success: true } })
      await deleteUser(2)
      expect(api.delete).toHaveBeenCalledWith('/admin/users/2')
    })
  })

  describe('Event Validation', () => {
    it('getPendingEvents returns list of pending events', async () => {
      const mockData = { events: [{ id: 1, title: 'Test' }] }
      api.get.mockResolvedValue({ data: mockData })
      const result = await getPendingEvents()
      expect(api.get).toHaveBeenCalledWith('/admin/events/pending')
      expect(result).toEqual(mockData)
    })

    it('validateEvent calls POST /admin/events/:id/validate', async () => {
      api.post.mockResolvedValue({ data: { success: true } })
      await validateEvent(10)
      expect(api.post).toHaveBeenCalledWith('/admin/events/10/validate')
    })

    it('rejectEvent sends reason in request body', async () => {
      api.post.mockResolvedValue({ data: { success: true } })
      await rejectEvent(10, 'Not appropriate content for this platform')
      expect(api.post).toHaveBeenCalledWith('/admin/events/10/reject', { reason: 'Not appropriate content for this platform' })
    })

    it('publishEvent calls POST /admin/events/:id/publish', async () => {
      api.post.mockResolvedValue({ data: { success: true } })
      await publishEvent(10)
      expect(api.post).toHaveBeenCalledWith('/admin/events/10/publish')
    })
  })

  describe('Reports', () => {
    it('getReportSummary returns summary object', async () => {
      const mockData = { total_events: 10, total_registrations: 50 }
      api.get.mockResolvedValue({ data: mockData })
      const result = await getReportSummary()
      expect(api.get).toHaveBeenCalledWith('/admin/reports/summary')
      expect(result).toEqual(mockData)
    })

    it('getEventsReport passes month and year as query params', async () => {
      api.get.mockResolvedValue({ data: { events: [] } })
      await getEventsReport({ month: 4, year: 2026 })
      expect(api.get).toHaveBeenCalledWith('/admin/reports/events', { params: { month: 4, year: 2026 } })
    })

    it('exportReportPDF returns blob response', async () => {
      const blob = new Blob(['pdf'], { type: 'application/pdf' })
      api.get.mockResolvedValue({ data: blob })
      const result = await exportReportPDF()
      expect(api.get).toHaveBeenCalledWith('/admin/reports/export', { responseType: 'blob' })
      expect(result).toBe(blob)
    })
  })
})
