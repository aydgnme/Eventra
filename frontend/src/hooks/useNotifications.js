import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyNotifications, markRead, markAllRead } from '../services/notificationService'
import { useAuth } from '../context/AuthContext'

export const notificationKeys = {
  my: ['notifications', 'my'],
}

export function useNotifications() {
  const { user } = useAuth()
  return useQuery({
    queryKey: notificationKeys.my,
    queryFn: getMyNotifications,
    enabled: !!user,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.my }),
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.my }),
  })
}
