import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import adminService from '../services/adminService'

export const adminKeys = {
  pendingEvents: ['admin', 'pending-events'],
  eventStats: ['admin', 'event-stats'],
  allEvents: (params) => ['admin', 'all-events', params],
  users: (params) => ['admin', 'users', params],
  auditLogs: (params) => ['admin', 'audit-logs', params],
  reportSummary: ['admin', 'report-summary'],
  eventsReport: (month, year) => ['admin', 'events-report', month, year],
  organizersReport: ['admin', 'organizers-report'],
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function usePendingEvents({ enabled = true } = {}) {
  return useQuery({
    queryKey: adminKeys.pendingEvents,
    queryFn: adminService.getPendingEvents,
    staleTime: 30_000,
    enabled,
  })
}

export function useEventStats() {
  return useQuery({
    queryKey: adminKeys.eventStats,
    queryFn: adminService.getEventStats,
    staleTime: 30_000,
  })
}

export function useAllEvents(params = {}) {
  return useQuery({
    queryKey: adminKeys.allEvents(params),
    queryFn: () => adminService.getAllEvents(params),
    staleTime: 30_000,
  })
}

export function useAuditLogs(params = {}) {
  return useQuery({
    queryKey: adminKeys.auditLogs(params),
    queryFn: () => adminService.getAuditLogs(params),
    staleTime: 30_000,
  })
}

export function useAdminUsers(params = {}) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => adminService.getUsers(params),
    staleTime: 30_000,
  })
}

export function useReportSummary() {
  return useQuery({
    queryKey: adminKeys.reportSummary,
    queryFn: adminService.getReportSummary,
    staleTime: 60_000,
  })
}

export function useEventsReport(month, year) {
  return useQuery({
    queryKey: adminKeys.eventsReport(month, year),
    queryFn: () => adminService.getEventsReport({ month, year }),
    staleTime: 60_000,
  })
}

export function useOrganizersReport() {
  return useQuery({
    queryKey: adminKeys.organizersReport,
    queryFn: adminService.getOrganizersReport,
    staleTime: 60_000,
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

function _invalidateEventQueries(qc) {
  qc.invalidateQueries({ queryKey: adminKeys.pendingEvents })
  qc.invalidateQueries({ queryKey: adminKeys.eventStats })
  qc.invalidateQueries({ queryKey: ['admin', 'all-events'] })
}

export function useValidateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => adminService.validateEvent(id),
    onSuccess: () => _invalidateEventQueries(qc),
  })
}

export function useRejectEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }) => adminService.rejectEvent(id, reason),
    onSuccess: () => _invalidateEventQueries(qc),
  })
}

export function useUnpublishEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => adminService.unpublishEvent(id),
    onSuccess: () => _invalidateEventQueries(qc),
  })
}

export function useActivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => adminService.activateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => adminService.deactivateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => adminService.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }) => adminService.updateUserRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}
