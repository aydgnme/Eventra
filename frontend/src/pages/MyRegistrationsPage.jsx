import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays, Clock, MapPin, Loader2, Ticket, Timer, XCircle, CheckCircle2, Search, Filter, QrCode,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { useToast } from '../context/ToastContext'
import { useMyRegistrations, useCancelRegistration, useLeaveWaitlist } from '../hooks/useRegistrations'
import QRTicketModal from '../components/QRTicketModal'

const TABS = [
  { key: 'all', label: 'All', icon: Ticket },
  { key: 'registered', label: 'Registered', icon: CheckCircle2 },
  { key: 'waitlisted', label: 'Waitlisted', icon: Timer },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle },
]

const STATUS_STYLE = {
  registered: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  waitlisted: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  attended: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function MyRegistrationsPage() {
  const { addToast } = useToast()
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [ticketEventId, setTicketEventId] = useState(null)

  const { data, isLoading } = useMyRegistrations()
  const cancelMutation = useCancelRegistration()
  const leaveWaitlistMutation = useLeaveWaitlist()

  const registrations = data?.registrations ?? []

  const filtered = registrations.filter((r) => {
    if (tab !== 'all' && r.status !== tab) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        r.event_title?.toLowerCase().includes(q) ||
        r.event_location?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const counts = {
    all: registrations.length,
    registered: registrations.filter((r) => r.status === 'registered').length,
    waitlisted: registrations.filter((r) => r.status === 'waitlisted').length,
    cancelled: registrations.filter((r) => r.status === 'cancelled').length,
  }

  return (
    <>
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-fg">My Registrations</h1>
            <p className="text-fg-3 text-sm mt-1">Track all your event registrations</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20">
            <Ticket className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-semibold text-brand-500">{counts.all}</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-fg placeholder-fg-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.key
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-fg-3 hover:text-fg hover:bg-surface-alt'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.key ? 'bg-white/20' : 'bg-surface-alt'
              }`}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-fg-3">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading registrations...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Filter className="w-10 h-10 mx-auto mb-3 text-fg-3 opacity-30" />
            <p className="font-medium text-fg-2 mb-1">No registrations found</p>
            <p className="text-fg-3 text-sm">
              {tab !== 'all' ? 'Try a different filter or ' : ''}
              <Link to="/events" className="text-link hover:text-brand-500">browse events</Link>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((reg) => {
              const isPast = reg.event_end_datetime && new Date(reg.event_end_datetime) < new Date()

              return (
                <div
                  key={reg.id}
                  className="group bg-surface border border-border rounded-2xl p-5 hover:border-brand-500/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize border ${STATUS_STYLE[reg.status] ?? 'bg-surface-alt text-fg-3 border-border'}`}>
                          {reg.status}
                        </span>
                        {isPast && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-alt text-fg-3 border border-border">
                            Past
                          </span>
                        )}
                        {reg.waitlist_position && (
                          <span className="text-xs text-fg-3">
                            Position #{reg.waitlist_position}
                          </span>
                        )}
                      </div>

                      <Link
                        to={`/events/${reg.event_id}`}
                        className="text-lg font-semibold text-fg hover:text-brand-500 transition-colors line-clamp-1"
                      >
                        {reg.event_title || `Event #${reg.event_id}`}
                      </Link>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-fg-3">
                        {reg.event_start_datetime && (
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {formatDate(reg.event_start_datetime)}
                          </span>
                        )}
                        {reg.event_location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {reg.event_location}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Registered {formatDate(reg.registered_at)}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {(reg.status === 'registered' || reg.status === 'attended') && !isPast && (
                        <button
                          onClick={() => setTicketEventId(reg.event_id)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-brand-500/40 text-brand-500 hover:bg-brand-500/10 transition-colors flex items-center gap-1.5"
                          title="Show QR ticket"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          Ticket
                        </button>
                      )}
                      {reg.status === 'registered' && !isPast && (
                        <button
                          onClick={() => cancelMutation.mutate(reg.event_id, {
                            onSuccess: () => addToast('Registration cancelled.', 'info'),
                            onError: (err) => addToast(err.message, 'error'),
                          })}
                          disabled={cancelMutation.isPending}
                          className="text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      {reg.status === 'waitlisted' && (
                        <button
                          onClick={() => leaveWaitlistMutation.mutate(reg.event_id, {
                            onSuccess: () => addToast('Left waitlist.', 'info'),
                            onError: (err) => addToast(err.message, 'error'),
                          })}
                          disabled={leaveWaitlistMutation.isPending}
                          className="text-xs px-3 py-1.5 rounded-lg border border-border text-fg-3 hover:text-fg hover:bg-surface-alt disabled:opacity-50 transition-colors"
                        >
                          Leave
                        </button>
                      )}
                      <Link
                        to={`/events/${reg.event_id}`}
                        className="text-xs px-3 py-1.5 rounded-lg bg-surface-alt border border-border text-fg-2 hover:text-fg hover:bg-border transition-colors"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>

    {ticketEventId && (
      <QRTicketModal
        eventId={ticketEventId}
        onClose={() => setTicketEventId(null)}
      />
    )}
    </>
  )
}
