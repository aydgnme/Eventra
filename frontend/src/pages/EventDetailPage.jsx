import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MapPin, Clock, Users, Tag, Wifi, ExternalLink, Star,
  ArrowLeft, Loader2, AlertCircle, CheckCircle2, Timer,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import QRCodeDisplay from '../components/QRCodeDisplay'
import ICSExportButton from '../components/ICSExportButton'
import FileTypeIcon from '../components/FileTypeIcon'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { eventService } from '../services/eventService'
import { registrationService } from '../services/registrationService'
import { feedbackService } from '../services/feedbackService'

const CATEGORY_STYLES = {
  academic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  sport: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  career: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  volunteer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  cultural: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Registration section ───────────────────────────────────────────────────
function RegistrationSection({ event, myRegs }) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const myReg = myRegs?.registrations?.find(
    (r) => r.event_id === event.id && r.status !== 'cancelled'
  )

  const registerMutation = useMutation({
    mutationFn: () => registrationService.register(event.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['myRegistrations'] })
      if (data.registration?.status === 'waitlisted') {
        addToast("You've been added to the waitlist.", 'info')
      } else {
        addToast('Successfully registered! Check your email for confirmation.', 'success')
      }
    },
    onError: (err) => addToast(err.message, 'error'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => registrationService.cancel(myReg?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRegistrations'] })
      addToast('Registration cancelled.', 'info')
    },
    onError: (err) => addToast(err.message, 'error'),
  })

  if (!user || user.role !== 'student') return null

  if (myReg?.status === 'registered') {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span className="font-medium text-emerald-700 dark:text-emerald-300">You are registered</span>
        </div>
        <button
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
          className="text-sm px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
        >
          {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Registration'}
        </button>
      </div>
    )
  }

  if (myReg?.status === 'waitlisted') {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="w-5 h-5 text-yellow-500 shrink-0" />
          <span className="font-medium text-yellow-700 dark:text-yellow-300">You are on the waitlist</span>
        </div>
        <button
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
          className="text-sm px-4 py-2 rounded-lg border border-border text-fg-2 hover:bg-surface-alt disabled:opacity-50 transition-colors"
        >
          {cancelMutation.isPending ? 'Leaving…' : 'Leave Waitlist'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => registerMutation.mutate()}
      disabled={registerMutation.isPending}
      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-medium transition-colors shadow-sm shadow-brand-500/20"
    >
      {registerMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
      Register for Event
    </button>
  )
}

// ── Feedback section ───────────────────────────────────────────────────────
function FeedbackSection({ event }) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')

  const { data: feedbackData } = useQuery({
    queryKey: ['feedback', event.id],
    queryFn: () => feedbackService.getEventFeedback(event.id),
    staleTime: 60_000,
  })

  const submitMutation = useMutation({
    mutationFn: () => feedbackService.submitFeedback(event.id, rating, comment),
    onSuccess: () => addToast('Feedback submitted. Thank you!', 'success'),
    onError: (err) => addToast(err.message, 'error'),
  })

  const now = new Date()
  const eventEnded = event.end_datetime && new Date(event.end_datetime) < now

  if (!user || user.role !== 'student' || !eventEnded) return null

  const myFeedback = feedbackData?.feedback?.find((f) => f.user_id === user.id)

  if (myFeedback) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="font-semibold text-fg mb-3">Your Feedback</h3>
        <div className="flex items-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`w-5 h-5 ${s <= myFeedback.rating ? 'text-usv-gold fill-usv-gold' : 'text-fg-3'}`}
            />
          ))}
        </div>
        {myFeedback.comment && (
          <p className="text-fg-2 text-sm">{myFeedback.comment}</p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="font-semibold text-fg mb-4">Leave Feedback</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-fg-2 uppercase tracking-wide mb-2">Rating *</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setRating(s)}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
              >
                <Star
                  className={`w-7 h-7 transition-colors ${
                    s <= (hovered || rating)
                      ? 'text-usv-gold fill-usv-gold'
                      : 'text-fg-3 hover:text-usv-gold'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-fg-2 uppercase tracking-wide mb-1.5">Comment (optional)</label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience..."
            className="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-fg placeholder-fg-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none"
          />
        </div>
        <button
          onClick={() => submitMutation.mutate()}
          disabled={!rating || submitMutation.isPending || submitMutation.isSuccess}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {submitMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {submitMutation.isSuccess ? 'Submitted!' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventService.getEvent(id),
    staleTime: 30_000,
  })

  const { data: myRegsData } = useQuery({
    queryKey: ['myRegistrations'],
    queryFn: () => registrationService.getMyRegistrations(),
    enabled: !!user,
    staleTime: 30_000,
  })

  const event = data?.event

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <div className="flex items-center justify-center py-20 text-fg-3">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading event…
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-10 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-fg-2">{error?.message ?? 'Event not found'}</p>
          <button
            onClick={() => navigate('/events')}
            className="mt-4 text-sm text-link hover:text-brand-500 transition-colors"
          >
            Back to Events
          </button>
        </div>
      </div>
    )
  }

  const qrValue = event.qr_code || `${window.location.origin}/events/${event.id}`

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Back */}
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 text-sm text-fg-3 hover:text-fg mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main info card */}
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {event.category && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${CATEGORY_STYLES[event.category] ?? 'bg-surface-alt text-fg-3'}`}>
                    <Tag className="w-3 h-3 inline mr-1" />
                    {event.category}
                  </span>
                )}
                {event.participation_mode && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium capitalize bg-surface-alt border border-border text-fg-2">
                    <Wifi className="w-3 h-3 inline mr-1" />
                    {event.participation_mode}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-fg mb-2">{event.title}</h1>

              {event.description && (
                <p className="text-fg-2 leading-relaxed mb-5 whitespace-pre-line">{event.description}</p>
              )}

              {/* Meta list */}
              <div className="space-y-3 text-sm">
                {event.start_datetime && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-fg">{formatDate(event.start_datetime)}</p>
                      {event.end_datetime && (
                        <p className="text-fg-3 text-xs mt-0.5">until {formatDate(event.end_datetime)}</p>
                      )}
                    </div>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-brand-500 shrink-0" />
                    <span className="text-fg">{event.location}</span>
                  </div>
                )}
                {event.capacity != null && (
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-brand-500 shrink-0" />
                    <span className="text-fg">{event.capacity} total spots</span>
                  </div>
                )}
              </div>

              {event.link_registration && (
                <a
                  href={event.link_registration}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 flex items-center gap-2 text-sm text-link hover:text-brand-500 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  External registration link
                </a>
              )}
            </div>

            {/* Registration */}
            <RegistrationSection event={event} myRegs={myRegsData} />

            {/* Feedback */}
            <FeedbackSection event={event} />
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* QR Code */}
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm text-center">
              <h3 className="font-semibold text-fg mb-4 text-sm">QR Code</h3>
              <QRCodeDisplay value={qrValue} eventTitle={event.title} />
            </div>

            {/* ICS Export */}
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-fg mb-3 text-sm">Add to Calendar</h3>
              <ICSExportButton event={event} className="w-full justify-center" />
            </div>

            {/* Materials */}
            {event.materials && event.materials.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-fg mb-3 text-sm">Materials</h3>
                <div className="space-y-2">
                  {event.materials.map((mat) => (
                    <div
                      key={mat.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-surface-alt border border-border"
                    >
                      <FileTypeIcon fileType={mat.file_type} className="w-4 h-4" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fg truncate">{mat.file_name}</p>
                        {mat.file_size && (
                          <p className="text-xs text-fg-3">{formatBytes(mat.file_size)}</p>
                        )}
                      </div>
                      <a
                        href={`/api/events/${event.id}/materials/${mat.id}/download`}
                        download
                        className="shrink-0 text-xs px-2.5 py-1 rounded-lg border border-border text-fg-2 hover:text-fg hover:bg-surface transition-colors"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
