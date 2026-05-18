import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventService } from '../services/eventService'

export const eventKeys = {
  all: ['events'],
  detail: (id) => ['events', id],
  mine: ['myEvents'],
  materials: (id) => ['events', id, 'materials'],
}

export function useEvents(params = {}) {
  return useQuery({
    queryKey: eventKeys.all,
    queryFn: () => eventService.getEvents(params),
    staleTime: 30_000,
  })
}

export function useEvent(id) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventService.getEvent(id),
    staleTime: 30_000,
    enabled: !!id,
  })
}

export function useMyEvents() {
  return useQuery({
    queryKey: eventKeys.mine,
    queryFn: () => eventService.getMyEvents(),
    staleTime: 30_000,
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => eventService.createEvent(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKeys.mine })
      qc.invalidateQueries({ queryKey: eventKeys.all })
    },
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => eventService.updateEvent(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: eventKeys.detail(id) })
      qc.invalidateQueries({ queryKey: eventKeys.mine })
      qc.invalidateQueries({ queryKey: eventKeys.all })
    },
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => eventService.deleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKeys.mine })
      qc.invalidateQueries({ queryKey: eventKeys.all })
    },
  })
}

export function useMaterials(eventId) {
  return useQuery({
    queryKey: eventKeys.materials(eventId),
    queryFn: () => eventService.getMaterials(eventId),
    staleTime: 30_000,
    enabled: !!eventId,
  })
}

export function useUploadMaterial(eventId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, onProgress }) => eventService.uploadMaterial(eventId, file, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKeys.materials(eventId) })
      qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
    },
  })
}

export function useDeleteMaterial(eventId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (materialId) => eventService.deleteMaterial(eventId, materialId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKeys.materials(eventId) })
      qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
    },
  })
}
