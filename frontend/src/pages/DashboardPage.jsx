import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Clock, MapPin, CalendarCheck, Loader2, Star } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { useMyRegistrations, useCancelRegistration } from '../hooks/useRegistrations'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const STATUS_BADGE = {
  registered: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25',
  waitlisted: 'bg-usv-gold/15 text-amber-700 dark:text-usv-gold border border-usv-gold/25',
}

const STATUS_LABEL = {
  registered: 'Registered',
  waitlisted: 'Waitlisted',
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function DashboardPage() {
  useDocumentTitle('Dashboard')
  const { user } = useAuth()
  const { addToast } = useToast()

  const { data, isLoading } = useMyRegistrations()

  const cancelMutation = useCancelRegistration()

  const regs = useMemo(() => data?.registrations ?? [], [data])
  const active = useMemo(() => regs.filter((r) => r.status !== 'cancelled'), [regs])
  const cancelled = useMemo(() => regs.filter((r) => r.status === 'cancelled'), [regs])

  const upcoming = active.filter((r) => !r.event?.end_datetime || new Date(r.event.end_datetime) >= new Date())
  const past = active.filter((r) => r.event?.end_datetime && new Date(r.event.end_datetime) < new Date())

  function handleCancel(eventId) {
    cancelMutation.mutate(eventId, {
      onSuccess: () => addToast('Registration cancelled successfully', 'info'),
      onError: (err) => addToast(err.message, 'error'),
    })
  }

  return (
    <div className="min-h-screen bg-bg text-fg font-sans">
      <Navbar />

      <main className="px-6 py-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-fg tracking-tight">
            {user?.full_name ? `Welcome, ${user.full_name.split(' ')[0]}` : 'My Dashboard'}
          </h1>
          <p className="text-fg-3 text-sm mt-1">Manage your event registrations and activities</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-surface border border-border rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : active.length === 0 && cancelled.length === 0 ? (
          <div className="text-center py-24 bg-surface border border-border rounded-3xl shadow-sm">
            <CalendarCheck className="w-16 h-16 mx-auto mb-4 opacity-20 text-fg" />
            <h2 className="text-xl font-semibold text-fg">No registrations yet</h2>
            <p className="text-fg-3 text-sm mt-2 max-w-xs mx-auto">
              Explore upcoming events and join the community at USV.
            </p>
            <a
              href="/events"
              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-500/20"
            >
              Browse Events
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {upcoming.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-fg-3">
                    Upcoming
                  </h2>
                  <span className="px-2 py-0.5 rounded-lg bg-surface border border-border text-xs font-bold text-fg-2">
                    {upcoming.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcoming.map((reg) => (
                    <RegCard
                      key={reg.id}
                      reg={reg}
                      busy={cancelMutation.isPending && cancelMutation.variables === reg.event_id}
                      onCancel={() => handleCancel(reg.event_id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-fg-3">
                    Past Events
                  </h2>
                  <span className="px-2 py-0.5 rounded-lg bg-surface border border-border text-xs font-bold text-fg-2">
                    {past.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {past.map((reg) => (
                    <RegCard key={reg.id} reg={reg} past />
                  ))}
                </div>
              </section>
            )}

            {cancelled.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-fg-3">
                    Cancelled
                  </h2>
                </div>
                <div className="flex flex-col gap-3">
                  {cancelled.map((reg) => (
                    <RegCard key={reg.id} reg={reg} cancelled />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function RegCard({ reg, busy, onCancel, cancelled = false, past = false }) {
  const event = reg.event || {}

  return (
    <div className={`group rounded-2xl border bg-surface shadow-sm hover:shadow-md transition-all flex flex-col ${cancelled ? 'opacity-60 grayscale border-border' : past ? 'border-border hover:border-usv-gold/30' : 'border-border hover:border-brand-500/20'}`}>
      <Link
        to={`/events/${reg.event_id}`}
        className="flex-1 p-5 flex flex-col gap-4 min-w-0"
      >
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className={`font-bold text-fg text-lg leading-snug line-clamp-1 transition-colors ${past ? 'group-hover:text-usv-gold' : 'group-hover:text-brand-500'}`}>
              {event.title ?? `Event #${reg.event_id}`}
            </h3>
            {!cancelled && reg.status && STATUS_BADGE[reg.status] && (
              <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${STATUS_BADGE[reg.status]}`}>
                {STATUS_LABEL[reg.status] ?? reg.status}
              </span>
            )}
          </div>

          <div className="space-y-2 text-sm text-fg-2">
            {event.start_datetime && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-500 shrink-0" />
                <span>{formatDate(event.start_datetime)}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-500 shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>

          {past && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-usv-gold font-medium">
              <Star className="w-3.5 h-3.5 fill-usv-gold" />
              Rate this event
            </div>
          )}
        </div>
      </Link>

      <div className="flex items-center justify-between px-5 pb-4 pt-3 border-t border-border/50">
        <p className="text-[11px] text-fg-3 font-medium uppercase tracking-tight">
          {cancelled ? 'Cancelled on' : 'Registered'}: {formatDate(reg.registered_at)}
        </p>

        {!cancelled && !past && onCancel && (
          <button
            onClick={onCancel}
            disabled={busy}
            className="text-xs font-bold text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors underline decoration-red-500/30 underline-offset-4"
          >
            {busy ? 'Processing...' : 'Cancel Registration'}
          </button>
        )}
      </div>
    </div>
  )
}
