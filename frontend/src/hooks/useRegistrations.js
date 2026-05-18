import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { registrationService } from '../services/registrationService'

export const registrationKeys = {
  my: ['myRegistrations'],
  status: (eventId) => ['registrationStatus', String(eventId)],
  count: (eventId) => ['registrationCount', String(eventId)],
  counts: (ids) => ['registrationCounts', ids],
  participants: (eventId, params) => ['participants', String(eventId), params],
  participantCount: (eventId) => ['participantCount', String(eventId)],
  ticket: (eventId) => ['ticket', String(eventId)],
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useMyRegistrations(params = {}) {
  return useQuery({
    queryKey: registrationKeys.my,
    queryFn: () => registrationService.getMyRegistrations(params),
    staleTime: 30_000,
  })
}

export function useRegistrationStatus(eventId, { enabled = true } = {}) {
  return useQuery({
    queryKey: registrationKeys.status(eventId),
    queryFn: () => registrationService.getStatus(eventId),
    staleTime: 15_000,
    enabled: enabled && !!eventId,
  })
}

export function useRegistrationCount(eventId, { enabled = true } = {}) {
  return useQuery({
    queryKey: registrationKeys.count(eventId),
    queryFn: () => registrationService.getCount(eventId),
    staleTime: 15_000,
    enabled: enabled && !!eventId,
  })
}

export function useRegistrationCounts(eventIds) {
  return useQuery({
    queryKey: registrationKeys.counts(eventIds),
    queryFn: () => registrationService.getCounts(eventIds),
    staleTime: 30_000,
    enabled: eventIds?.length > 0,
  })
}

export function useParticipants(eventId, params = {}) {
  return useQuery({
    queryKey: registrationKeys.participants(eventId, params),
    queryFn: () => registrationService.getParticipants(eventId, params),
    staleTime: 15_000,
    enabled: !!eventId,
  })
}

export function useParticipantCount(eventId) {
  return useQuery({
    queryKey: registrationKeys.participantCount(eventId),
    queryFn: () => registrationService.getCount(eventId),
    staleTime: 30_000,
    enabled: !!eventId,
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

function useRegistrationInvalidation() {
  const qc = useQueryClient()
  return (eventId) => {
    qc.invalidateQueries({ queryKey: registrationKeys.status(eventId) })
    qc.invalidateQueries({ queryKey: registrationKeys.count(eventId) })
    qc.invalidateQueries({ queryKey: registrationKeys.my })
  }
}

export function useRegister() {
  const invalidate = useRegistrationInvalidation()
  return useMutation({
    mutationFn: (eventId) => registrationService.register(eventId),
    onSuccess: (_data, eventId) => invalidate(eventId),
  })
}

export function useCancelRegistration() {
  const invalidate = useRegistrationInvalidation()
  return useMutation({
    mutationFn: (eventId) => registrationService.cancel(eventId),
    onSuccess: (_data, eventId) => invalidate(eventId),
  })
}

export function useJoinWaitlist() {
  const invalidate = useRegistrationInvalidation()
  return useMutation({
    mutationFn: (eventId) => registrationService.joinWaitlist(eventId),
    onSuccess: (_data, eventId) => invalidate(eventId),
  })
}

export function useLeaveWaitlist() {
  const invalidate = useRegistrationInvalidation()
  return useMutation({
    mutationFn: (eventId) => registrationService.leaveWaitlist(eventId),
    onSuccess: (_data, eventId) => invalidate(eventId),
  })
}

export function useCheckin(eventId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId) => registrationService.checkin(eventId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: registrationKeys.participants(eventId) })
      qc.invalidateQueries({ queryKey: registrationKeys.participantCount(eventId) })
    },
  })
}

export function useUndoCheckin(eventId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId) => registrationService.undoCheckin(eventId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: registrationKeys.participants(eventId) })
      qc.invalidateQueries({ queryKey: registrationKeys.participantCount(eventId) })
    },
  })
}

export function useTicket(eventId, { enabled = true } = {}) {
  return useQuery({
    queryKey: registrationKeys.ticket(eventId),
    queryFn: () => registrationService.getTicket(eventId),
    staleTime: Infinity,
    enabled: enabled && !!eventId,
  })
}

export function useConfirmAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (eventId) => registrationService.confirmAttendance(eventId),
    onSuccess: () => qc.invalidateQueries({ queryKey: registrationKeys.my }),
  })
}

export function useCheckinByQR(eventId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (token) => registrationService.checkinByQR(token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: registrationKeys.participants(eventId) })
      qc.invalidateQueries({ queryKey: registrationKeys.participantCount(eventId) })
    },
  })
}

export function useRejectParticipant(eventId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId) => registrationService.rejectParticipant(eventId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: registrationKeys.participants(eventId) })
      qc.invalidateQueries({ queryKey: registrationKeys.participantCount(eventId) })
    },
  })
}
