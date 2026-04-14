import { useCallback, useEffect, useState } from 'react'
import { Calendar, Clock, LogOut, MapPin, Users, Sun, Moon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { eventsApi, registrationsApi } from '../lib/api'

const STATUS_BADGE = {
  registered: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
  waitlisted: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25',
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const [events, setEvents] = useState([])
  const [myRegs, setMyRegs] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState({})

  const load = useCallback(async () => {
    try {
      const [evData, regData] = await Promise.all([
        eventsApi.list({ is_published: true }),
        registrationsApi.my(),
      ])
      setEvents(evData.events ?? [])
      const map = {}
      for (const r of regData.registrations ?? []) {
        if (r.status !== 'cancelled') map[r.event_id] = r
      }
      setMyRegs(map)
    } catch {
      // silently ignore — user will see empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleRegister(eventId) {
    setBusy((b) => ({ ...b, [eventId]: true }))
    try {
      const data = await registrationsApi.register(eventId)
      setMyRegs((m) => ({ ...m, [eventId]: data.registration }))
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy((b) => ({ ...b, [eventId]: false }))
    }
  }

  async function handleCancel(eventId, regId) {
    setBusy((b) => ({ ...b, [eventId]: true }))
    try {
      await registrationsApi.cancel(regId)
      setMyRegs((m) => {
        const next = { ...m }
        delete next[eventId]
        return next
      })
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy((b) => ({ ...b, [eventId]: false }))
    }
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg text-fg">Eventra</span>
        </div>
        <div className="flex items-center gap-3">
          {['organizer', 'admin'].includes(user?.role) && (
            <button
              onClick={() => navigate('/organizer')}
              className="text-sm text-brand-500 hover:text-brand-400 font-medium transition-colors"
            >
              My Events
            </button>
          )}
          <span className="text-sm text-fg-2">
            {user?.full_name ?? user?.email}
            <span className="ml-2 text-brand-500 font-medium">{user?.role}</span>
          </span>
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-fg-2 hover:text-fg hover:bg-surface-alt transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-fg-2 hover:text-fg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="px-6 py-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-fg">Upcoming Events</h1>

        {loading ? (
          <div className="text-fg-3 text-sm">Loading events…</div>
        ) : events.length === 0 ? (
          <div className="text-fg-3 text-sm">No published events yet.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {events.map((event) => {
              const reg = myRegs[event.id]
              const isBusy = busy[event.id]

              return (
                <div
                  key={event.id}
                  className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-3"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-lg leading-snug text-fg">{event.title}</h2>
                      {event.description && (
                        <p className="text-fg-2 text-sm mt-1 line-clamp-2">{event.description}</p>
                      )}
                    </div>
                    {reg && (
                      <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[reg.status]}`}>
                        {reg.status}
                      </span>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-3">
                    {event.start_datetime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(event.start_datetime)}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </span>
                    )}
                    {event.capacity && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {event.capacity} spots
                      </span>
                    )}
                    {event.category && (
                      <span className="capitalize">{event.category}</span>
                    )}
                  </div>

                  {/* Action */}
                  <div className="flex items-center gap-3 pt-1">
                    {reg ? (
                      <button
                        onClick={() => handleCancel(event.id, reg.id)}
                        disabled={isBusy}
                        className="text-sm px-4 py-1.5 rounded-lg border border-red-500/40 text-red-500 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                      >
                        {isBusy ? 'Cancelling…' : 'Cancel Registration'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRegister(event.id)}
                        disabled={isBusy}
                        className="text-sm px-4 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-medium transition-colors"
                      >
                        {isBusy ? 'Registering…' : 'Register'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
