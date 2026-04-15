import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '../services/api'

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  }
}))

import { registrationService } from '../services/registrationService'

describe('registrationService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('register', () => {
    it('posts to /registrations/ with event_id', async () => {
      const mockData = { message: 'Registered successfully', registration: { id: 1, status: 'registered' } }
      api.post.mockResolvedValue({ data: mockData })
      const result = await registrationService.register(42)
      expect(api.post).toHaveBeenCalledWith('/registrations/', { event_id: 42 })
      expect(result).toEqual(mockData)
    })

    it('returns waitlisted status when event is full', async () => {
      const mockData = { message: 'Event is full. Added to waitlist.', registration: { id: 2, status: 'waitlisted' } }
      api.post.mockResolvedValue({ data: mockData })
      const result = await registrationService.register(42)
      expect(result.registration.status).toBe('waitlisted')
    })
  })

  describe('cancel', () => {
    it('posts to /registrations/:id/cancel', async () => {
      const mockData = { message: 'Registration cancelled', registration: { id: 1, status: 'cancelled' } }
      api.post.mockResolvedValue({ data: mockData })
      const result = await registrationService.cancel(1)
      expect(api.post).toHaveBeenCalledWith('/registrations/1/cancel')
      expect(result).toEqual(mockData)
    })
  })

  describe('joinWaitlist', () => {
    it('posts to /registrations/ with event_id (same as register)', async () => {
      const mockData = { message: 'Added to waitlist', registration: { id: 3, status: 'waitlisted' } }
      api.post.mockResolvedValue({ data: mockData })
      await registrationService.joinWaitlist(10)
      expect(api.post).toHaveBeenCalledWith('/registrations/', { event_id: 10 })
    })
  })

  describe('leaveWaitlist', () => {
    it('posts to /registrations/:id/cancel (same as cancel)', async () => {
      api.post.mockResolvedValue({ data: { message: 'Registration cancelled' } })
      await registrationService.leaveWaitlist(5)
      expect(api.post).toHaveBeenCalledWith('/registrations/5/cancel')
    })
  })

  describe('getMyRegistrations', () => {
    it('gets /registrations/my', async () => {
      const mockData = { registrations: [{ id: 1, event_id: 42, status: 'registered' }] }
      api.get.mockResolvedValue({ data: mockData })
      const result = await registrationService.getMyRegistrations()
      expect(api.get).toHaveBeenCalledWith('/registrations/my')
      expect(result).toEqual(mockData)
    })

    it('returns empty registrations array when none exist', async () => {
      api.get.mockResolvedValue({ data: { registrations: [] } })
      const result = await registrationService.getMyRegistrations()
      expect(result.registrations).toHaveLength(0)
    })
  })

  describe('getParticipants', () => {
    it('gets /registrations/event/:eventId', async () => {
      const mockData = { registrations: [], total: 0 }
      api.get.mockResolvedValue({ data: mockData })
      const result = await registrationService.getParticipants(7)
      expect(api.get).toHaveBeenCalledWith('/registrations/event/7')
      expect(result).toEqual(mockData)
    })
  })

  describe('getCount', () => {
    it('gets /registrations/event/:eventId/count', async () => {
      const mockData = { event_id: 7, registered: 5, waitlisted: 2, total_active: 7 }
      api.get.mockResolvedValue({ data: mockData })
      const result = await registrationService.getCount(7)
      expect(api.get).toHaveBeenCalledWith('/registrations/event/7/count')
      expect(result).toEqual(mockData)
    })
  })
})
