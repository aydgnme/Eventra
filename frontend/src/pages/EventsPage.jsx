import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Calendar,
  List,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Users,
  LogOut,
} from 'lucide-react'
import { eventsApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['academic', 'sport', 'career', 'volunteer', 'cultural']
const MODES = ['physical', 'online', 'hybrid']

const CATEGORY_COLORS = {
  academic: 'bg-blue-500/20 text-blue-300',
  sport: 'bg-green-500/20 text-green-300',
  career: 'bg-yellow-500/20 text-yellow-300',
  volunteer: 'bg-pink-500/20 text-pink-300',
  cultural: 'bg-purple-500/20 text-purple-300',
}

const MODE_ICONS = {
  physical: '📍',
  online: '🌐',
  hybrid: '🔀',
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

function CalendarView({ events, onEventClick }) {
  const today = new Date()
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() })

  const { year, month } = current
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const monthName = new Date(year, month, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' })

  const eventsByDay = {}
  events.forEach((e) => {
    const d = new Date(e.start_datetime)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!eventsByDay[day]) eventsByDay[day] = []
      eventsByDay[day].push(e)
    }
  })

  function prevMonth() {
    setCurrent(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    )
  }

  function nextMonth() {
    setCurrent(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    )
  }

  const cells = []
  const startPad = firstDay === 0 ? 6 : firstDay - 1
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <button onClick={prevMonth} className="p-1 hover:text-slate-200 text-slate-400 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-slate-100">{monthName}</span>
        <button onClick={nextMonth} className="p-1 hover:text-slate-200 text-slate-400 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-slate-500 border-b border-slate-800">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const isToday =
            day &&
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day
          const dayEvents = day ? (eventsByDay[day] ?? []) : []

          return (
            <div
              key={i}
              className={`min-h-[80px] p-1 border-b border-r border-slate-800 ${
                day ? '' : 'bg-slate-950/30'
              }`}
            >
              {day && (
                <>
                  <span
                    className={`text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full ${
                      isToday ? 'bg-indigo-500 text-white' : 'text-slate-400'
                    }`}
                  >
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <button
                        key={e.id}
                        onClick={() => onEventClick(e.id)}
                        className="w-full text-left text-xs px-1 py-0.5 rounded bg-indigo-500/30 text-indigo-300 truncate hover:bg-indigo-500/50 transition-colors"
                      >
                        {e.title}
                      </button>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-xs text-slate-500 pl-1">+{dayEvents.length - 2} more</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EventCard({ event, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors leading-snug">
          {event.title}
        </h3>
        <div className="flex gap-1.5 flex-shrink-0">
          {event.category && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                CATEGORY_COLORS[event.category] ?? 'bg-slate-700 text-slate-300'
              }`}
            >
              {event.category}
            </span>
          )}
        </div>
      </div>

      {event.description && (
        <p className="text-sm text-slate-400 mb-3 line-clamp-2">{event.description}</p>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {formatDate(event.start_datetime)} · {formatTime(event.start_datetime)}
        </span>
        {event.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {event.location}
          </span>
        )}
        {event.capacity && (
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {event.capacity} seats
          </span>
        )}
        {event.participation_mode && (
          <span>
            {MODE_ICONS[event.participation_mode]} {event.participation_mode}
          </span>
        )}
      </div>
    </button>
  )
}

export default function EventsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [view, setView] = useState('list')
  const [events, setEvents] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [mode, setMode] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const fetchEvents = useCallback(
    async (p = 1) => {
      setLoading(true)
      setError(null)
      try {
        const data = await eventsApi.list({ q, category, mode, from, to, page: p, per_page: 12 })
        setEvents(data.events)
        setTotal(data.total)
        setPage(data.page)
        setPages(data.pages)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    },
    [q, category, mode, from, to]
  )

  useEffect(() => {
    fetchEvents(1)
  }, [fetchEvents])

  function handleSearch(e) {
    e.preventDefault()
    fetchEvents(1)
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg">Eventra</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">{user?.full_name ?? user?.email}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="px-6 py-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Events</h1>
            {!loading && (
              <p className="text-sm text-slate-400 mt-0.5">{total} event{total !== 1 ? 's' : ''} found</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-lg transition-colors ${
                view === 'list'
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="List view"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`p-2 rounded-lg transition-colors ${
                view === 'calendar'
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Calendar view"
            >
              <Calendar className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filter bar */}
        <form onSubmit={handleSearch} className="mb-6 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search events…"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                filtersOpen || category || mode || from || to
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors"
            >
              Search
            </button>
          </div>

          {filtersOpen && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-900 border border-slate-800 rounded-lg">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All</option>
                  {MODES.map((m) => (
                    <option key={m} value={m}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setCategory('')
                  setMode('')
                  setFrom('')
                  setTo('')
                }}
                className="col-span-2 sm:col-span-4 text-xs text-slate-400 hover:text-slate-200 text-right transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </form>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-slate-500">No events found</div>
        ) : view === 'list' ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <EventCard key={e.id} event={e} onClick={() => navigate(`/events/${e.id}`)} />
              ))}
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => fetchEvents(page - 1)}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-400">
                  Page {page} of {pages}
                </span>
                <button
                  onClick={() => fetchEvents(page + 1)}
                  disabled={page === pages}
                  className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <CalendarView events={events} onEventClick={(id) => navigate(`/events/${id}`)} />
        )}
      </main>
    </div>
  )
}
