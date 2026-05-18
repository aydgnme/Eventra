import { useQuery, useMutation } from '@tanstack/react-query'
import { feedbackService } from '../services/feedbackService'

export const feedbackKeys = {
  event: (eventId) => ['feedback', String(eventId)],
  my: ['myFeedback'],
}

export function useEventFeedback(eventId) {
  return useQuery({
    queryKey: feedbackKeys.event(eventId),
    queryFn: () => feedbackService.getEventFeedback(eventId),
    staleTime: 60_000,
    enabled: !!eventId,
  })
}

export function useSubmitFeedback(eventId) {
  return useMutation({
    mutationFn: ({ rating, comment }) =>
      feedbackService.submitFeedback(eventId, rating, comment),
  })
}
