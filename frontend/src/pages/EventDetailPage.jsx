import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  MapPin, Clock, Users, Tag, Wifi, ExternalLink, Star, Building2,
  ArrowLeft, Loader2, AlertCircle, CheckCircle2, Timer, QrCode,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import QRCodeDisplay from '../components/QRCodeDisplay'
import ICSExportButton from '../components/ICSExportButton'
import FileTypeIcon from '../components/FileTypeIcon'
import QRTicketModal from '../components/QRTicketModal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useEvent } from '../hooks/useEvents'
import { useRegistrationStatus, useRegistrationCount, useRegister, useCancelRegistration, useLeaveWaitlist, useJoinWaitlist } from '../hooks/useRegistrations'
import { useEventFeedback, useSubmitFeedback } from '../hooks/useFeedback'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { apiUrl } from '../services/api'

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
function RegistrationSection({ event, statusData }) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [showTicket, setShowTicket] = useState(false)

  const registerMutation = useRegister()
  const cancelMutation = useCancelRegistration()
  const joinWaitlistMutation = useJoinWaitlist()
  const leaveWaitlistMutation = useLeaveWaitlist()

  if (!user || user.role !== 'student') return null

  const status = statusData?.status
  const isFull = statusData?.event?.is_full
  const isPast = event.end_datetime && new Date(event.end_datetime) < new Date()

  // Registered or checked in
  if (status === 'registered' || status === 'attended') {
    return (
      <>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="font-medium text-emerald-400">
              {status === 'attended' ? 'You are checked in' : 'You are registered'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isPast && (
              <button
                onClick={() => setShowTicket(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium transition-colors"
              >
                <QrCode className="w-4 h-4" />
                View Ticket
              </button>
            )}
            {status !== 'attended' && !isPast && (
              <button
                onClick={() => cancelMutation.mutate(event.id, {
                  onSuccess: () => addToast('Registration cancelled.', 'info'),
                  onError: (err) => addToast(err.message, 'error'),
                })}
                disabled={cancelMutation.isPending}
                className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm disabled:opacity-50 transition-colors"
              >
                {cancelMutation.isPending ? 'Cancelling…' : 'Cancel'}
              </button>
            )}
          </div>
        </div>
        {showTicket && <QRTicketModal eventId={event.id} onClose={() => setShowTicket(false)} />}
      </>
    )
  }

  // Waitlisted
  if (status === 'waitlisted') {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-yellow-500 shrink-0" />
          <span className="font-medium text-yellow-400">
            On the waitlist
            {statusData?.waitlist_position ? ` — position #${statusData.waitlist_position}` : ''}
          </span>
        </div>
        <p className="text-fg-3 text-xs">
          You'll be notified if a spot opens up. A confirmed attendee must cancel for you to move up.
        </p>
        <button
          onClick={() => leaveWaitlistMutation.mutate(event.id, {
            onSuccess: () => addToast('Left waitlist.', 'info'),
            onError: (err) => addToast(err.message, 'error'),
          })}
          disabled={leaveWaitlistMutation.isPending}
          className="px-4 py-2 rounded-lg border border-border text-fg-3 hover:text-fg hover:bg-surface-alt text-sm disabled:opacity-50 transition-colors"
        >
          {leaveWaitlistMutation.isPending ? 'Leaving…' : 'Leave Waitlist'}
        </button>
      </div>
    )
  }

  // Event full → join waitlist
  if (isFull) {
    return (
      <button
        onClick={() => joinWaitlistMutation.mutate(event.id, {
          onSuccess: () => addToast("You've been added to the waitlist.", 'info'),
          onError: (err) => addToast(err.message, 'error'),
        })}
        disabled={joinWaitlistMutation.isPending || isPast}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-white font-medium transition-colors"
      >
        {joinWaitlistMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        <Timer className="w-4 h-4" />
        Join Waitlist
      </button>
    )
  }

  // Default — register
  return (
    <button
      onClick={() => registerMutation.mutate(event.id, {
        onSuccess: (data) => {
          if (data.registration?.status === 'waitlisted') {
            addToast("Event full — you've been added to the waitlist.", 'info')
          } else {
            addToast('Registered! Check your email for your ticket.', 'success')
          }
        },
        onError: (err) => addToast(err.message, 'error'),
      })}
      disabled={registerMutation.isPending || isPast}
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

  const { data: feedbackData } = useEventFeedback(event.id)
  const submitMutation = useSubmitFeedback(event.id)

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
          onClick={() => submitMutation.mutate({ rating, comment }, {
            onSuccess: () => addToast('Feedback submitted. Thank you!', 'success'),
            onError: (err) => addToast(err.message, 'error'),
          })}
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

  const { data, isLoading, error } = useEvent(id)
  const { data: statusData } = useRegistrationStatus(id, { enabled: !!user && user.role === 'student' })
  const { data: countData } = useRegistrationCount(id, { enabled: !!data?.event?.capacity })

  const event = data?.event
  useDocumentTitle(event?.title)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="h-6 w-32 bg-surface animate-pulse rounded mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-96 bg-surface border border-border rounded-xl animate-pulse" />
              <div className="h-24 bg-surface border border-border rounded-xl animate-pulse" />
            </div>
            <div className="space-y-6">
              <div className="h-64 bg-surface border border-border rounded-xl animate-pulse" />
              <div className="h-32 bg-surface border border-border rounded-xl animate-pulse" />
            </div>
          </div>
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
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-7xl mx-auto px-4 py-6">
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

              {event.organization_name && (
                <div className="flex items-center gap-2 text-sm text-fg-2 mb-3">
                  <Building2 className="w-4 h-4 text-brand-500 shrink-0" />
                  <span>{event.organization_name}</span>
                </div>
              )}

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
                    <span className="text-fg">
                      {countData
                        ? `${event.capacity - countData.registered} / ${event.capacity} spots available`
                        : `${event.capacity} total spots`}
                    </span>
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
            <RegistrationSection event={event} statusData={statusData} />

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
                        href={apiUrl(`/events/${event.id}/materials/${mat.id}/download`)}
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
      <Footer />
    </div>
  )
}
