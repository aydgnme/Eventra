import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '../services/api'

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  }
}))

import { registrationService } from '../services/registrationService'

describe('registrationService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('register', () => {
    it('posts to /registrations/:eventId/register', async () => {
      const mockData = { message: 'Registered successfully', registration: { id: 1, status: 'registered' } }
      api.post.mockResolvedValue({ data: mockData })
      const result = await registrationService.register(42)
      expect(api.post).toHaveBeenCalledWith('/registrations/42/register')
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
    it('deletes /registrations/:eventId/register', async () => {
      const mockData = { message: 'Registration cancelled', registration: { id: 1, status: 'cancelled' } }
      api.delete.mockResolvedValue({ data: mockData })
      const result = await registrationService.cancel(1)
      expect(api.delete).toHaveBeenCalledWith('/registrations/1/register')
      expect(result).toEqual(mockData)
    })
  })

  describe('joinWaitlist', () => {
    it('posts to /registrations/:eventId/waitlist', async () => {
      const mockData = { message: 'Added to waitlist', registration: { id: 3, status: 'waitlisted' } }
      api.post.mockResolvedValue({ data: mockData })
      await registrationService.joinWaitlist(10)
      expect(api.post).toHaveBeenCalledWith('/registrations/10/waitlist')
    })
  })

  describe('leaveWaitlist', () => {
    it('deletes /registrations/:eventId/waitlist', async () => {
      api.delete.mockResolvedValue({ data: { message: 'Left waitlist' } })
      await registrationService.leaveWaitlist(5)
      expect(api.delete).toHaveBeenCalledWith('/registrations/5/waitlist')
    })
  })

  describe('getMyRegistrations', () => {
    it('gets /registrations/my', async () => {
      const mockData = { registrations: [{ id: 1, event_id: 42, status: 'registered' }] }
      api.get.mockResolvedValue({ data: mockData })
      const result = await registrationService.getMyRegistrations()
      expect(api.get).toHaveBeenCalledWith('/registrations/my', { params: {} })
      expect(result).toEqual(mockData)
    })

    it('returns empty registrations array when none exist', async () => {
      api.get.mockResolvedValue({ data: { registrations: [] } })
      const result = await registrationService.getMyRegistrations()
      expect(result.registrations).toHaveLength(0)
    })
  })

  describe('getParticipants', () => {
    it('gets /registrations/:eventId/participants', async () => {
      const mockData = { registrations: [], total: 0 }
      api.get.mockResolvedValue({ data: mockData })
      const result = await registrationService.getParticipants(7)
      expect(api.get).toHaveBeenCalledWith('/registrations/7/participants', { params: {} })
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

  describe('getCounts', () => {
    it('gets /registrations/counts with event_ids param', async () => {
      const mockData = { counts: { 1: 5, 2: 3 } }
      api.get.mockResolvedValue({ data: mockData })
      const result = await registrationService.getCounts([1, 2])
      expect(api.get).toHaveBeenCalledWith('/registrations/counts', { params: { event_ids: '1,2' } })
      expect(result).toEqual(mockData)
    })

    it('returns empty counts when no event ids provided', async () => {
      const result = await registrationService.getCounts([])
      expect(api.get).not.toHaveBeenCalled()
      expect(result).toEqual({ counts: {} })
    })
  })
})
