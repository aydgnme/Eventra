import { useCallback, useEffect, useState } from 'react'
import { Clock, MapPin, Users, CalendarCheck, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { registrationsApi } from '../lib/api'
import Navbar from '../components/Navbar'

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
  const { user } = useAuth()

  const [regs, setRegs] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState({})

  const load = useCallback(async () => {
    try {
      const data = await registrationsApi.my()
      setRegs(data.registrations ?? [])
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCancel(regId) {
    setBusy((b) => ({ ...b, [regId]: true }))
    try {
      await registrationsApi.cancel(regId)
      setRegs((prev) => prev.map((r) =>
        r.id === regId ? { ...r, status: 'cancelled' } : r
      ))
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy((b) => ({ ...b, [regId]: false }))
    }
  }

  const active = regs.filter((r) => r.status !== 'cancelled')
  const cancelled = regs.filter((r) => r.status === 'cancelled')

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Navbar />

      <main className="px-6 py-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-fg">
            {user?.full_name ? `Welcome, ${user.full_name.split(' ')[0]}` : 'My Dashboard'}
          </h1>
          <p className="text-fg-3 text-sm mt-1">Your event registrations</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-fg-3 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : active.length === 0 && cancelled.length === 0 ? (
          <div className="text-center py-20">
            <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-20 text-fg" />
            <p className="text-fg-2 font-medium">No registrations yet</p>
            <p className="text-fg-3 text-sm mt-1">
              Browse <a href="/events" className="text-link hover:underline">upcoming events</a> and register.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Active registrations */}
            {active.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-3 mb-3">
                  Active ({active.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {active.map((reg) => (
                    <RegCard
                      key={reg.id}
                      reg={reg}
                      busy={busy[reg.id]}
                      onCancel={() => handleCancel(reg.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Cancelled registrations */}
            {cancelled.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-3 mb-3">
                  Cancelled ({cancelled.length})
                </h2>
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
    </div>
  )
}

function RegCard({ reg, busy, onCancel, cancelled = false }) {
  return (
    <div className={`rounded-xl border bg-surface p-4 flex items-start justify-between gap-4 shadow-sm transition-opacity ${cancelled ? 'opacity-50 border-border' : 'border-border'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="font-semibold text-fg text-sm truncate">
            {reg.event_title ?? `Event #${reg.event_id}`}
          </h3>
          {!cancelled && reg.status && STATUS_BADGE[reg.status] && (
            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[reg.status]}`}>
              {STATUS_LABEL[reg.status] ?? reg.status}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-fg-3">
          {reg.event_start_datetime && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(reg.event_start_datetime)}
            </span>
          )}
          {reg.event_location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {reg.event_location}
            </span>
          )}
          {reg.event_capacity && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {reg.event_capacity} spots
            </span>
          )}
        </div>

        <p className="text-xs text-fg-3 mt-1">
          {cancelled ? 'Cancelled' : 'Registered'} {formatDate(reg.registered_at)}
        </p>
      </div>

      {!cancelled && onCancel && (
        <button
          onClick={onCancel}
          disabled={busy}
          className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-red-400/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
        >
          {busy ? 'Cancelling…' : 'Cancel'}
        </button>
      )}
    </div>
  )
}
