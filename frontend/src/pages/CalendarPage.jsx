import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, Loader2, MapPin, Sparkles,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import EventCard from '../components/EventCard'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { useEvents } from '../hooks/useEvents'

const CATEGORY_DOT = {
  academic: 'bg-blue-500',
  sport: 'bg-green-500',
  career: 'bg-orange-500',
  volunteer: 'bg-purple-500',
  cultural: 'bg-pink-500',
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dateKey(value) {
  if (!value) return ''
  const d = new Date(value)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CalendarGrid({ events, viewDate, selectedKey, onSelectDay, onMoveMonth, onToday }) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = dateKey(new Date())

  const eventsByDay = {}
  for (const event of events) {
    const key = dateKey(event.start_datetime)
    if (!key) continue
    const day = new Date(event.start_datetime)
    if (day.getFullYear() !== year || day.getMonth() !== month) continue
    if (!eventsByDay[key]) eventsByDay[key] = []
    eventsByDay[key].push(event)
  }

  const cells = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-border">
        <h2 className="text-xl font-bold text-fg">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onToday}
            className="h-9 px-4 rounded-lg border border-border bg-surface-alt text-sm font-medium text-fg-2 hover:text-fg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => onMoveMonth(-1)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border text-fg-2 hover:text-fg hover:bg-surface-alt transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMoveMonth(1)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border text-fg-2 hover:text-fg hover:bg-surface-alt transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-surface-alt/50">
        {DAY_NAMES.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-fg-3">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="min-h-24 border-b border-r border-border" />
          }

          const key = `${year}-${month + 1}-${day}`
          const dayEvents = eventsByDay[key] ?? []
          const isSelected = selectedKey === key
          const isToday = todayKey === key

          return (
            <button
              key={key}
              onClick={() => onSelectDay(key)}
              className={`min-h-24 border-b border-r border-border p-2 text-left transition-colors ${
                isSelected ? 'bg-brand-500/10' : dayEvents.length ? 'hover:bg-surface-alt' : 'hover:bg-surface-alt/50'
              }`}
            >
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  isToday ? 'bg-brand-500 text-white' : 'text-fg-2'
                }`}
              >
                {day}
              </span>
              <div className="mt-2 flex flex-wrap gap-1">
                {dayEvents.slice(0, 4).map((event) => (
                  <span
                    key={event.id}
                    className={`h-2 w-2 rounded-full ${CATEGORY_DOT[event.category] ?? 'bg-fg-3'}`}
                    title={event.title}
                  />
                ))}
                {dayEvents.length > 4 && (
                  <span className="text-[10px] font-medium text-fg-3">+{dayEvents.length - 4}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CompactEvent({ event }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="block rounded-lg border border-border bg-surface-alt p-3 hover:border-brand-500/40 transition-colors"
    >
      <p className="text-sm font-semibold text-fg line-clamp-2">{event.title}</p>
      <div className="mt-2 space-y-1 text-xs text-fg-3">
        {event.start_datetime && (
          <p className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(event.start_datetime)}
          </p>
        )}
        {event.location && (
          <p className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{event.location}</span>
          </p>
        )}
      </div>
    </Link>
  )
}

export default function CalendarPage() {
  useDocumentTitle('Calendar')
  const [nowTs] = useState(() => Date.now())
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedKey, setSelectedKey] = useState(() => dateKey(new Date()))
  const { data, isLoading, error } = useEvents()

  const events = useMemo(() => data?.events ?? [], [data])
  const selectedEvents = useMemo(
    () => events.filter((event) => dateKey(event.start_datetime) === selectedKey),
    [events, selectedKey],
  )
  const upcomingEvents = useMemo(() => {
    return events
      .filter((event) => event.start_datetime && new Date(event.start_datetime).getTime() >= nowTs)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 5)
  }, [events, nowTs])

  function moveMonth(offset) {
    setViewDate((date) => new Date(date.getFullYear(), date.getMonth() + offset, 1))
  }

  function goToday() {
    const today = new Date()
    setViewDate(today)
    setSelectedKey(dateKey(today))
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-fg">Event Calendar</h1>
          <p className="text-fg-3 text-sm mt-1">
            Browse university events by date and open the event details from the selected day.
          </p>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
            {error.message}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6">
            <div>
              {isLoading ? (
                <div className="min-h-96 rounded-xl border border-border bg-surface flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                </div>
              ) : (
                <CalendarGrid
                  events={events}
                  viewDate={viewDate}
                  selectedKey={selectedKey}
                  onSelectDay={setSelectedKey}
                  onMoveMonth={moveMonth}
                  onToday={goToday}
                />
              )}
            </div>

            <aside className="space-y-5">
              <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <CalendarDays className="w-4 h-4 text-brand-500" />
                  Selected Day
                </h2>
                <div className="mt-4 space-y-3">
                  {selectedEvents.length ? (
                    selectedEvents.map((event) => <CompactEvent key={event.id} event={event} />)
                  ) : (
                    <p className="text-sm text-fg-3">No events scheduled for this day.</p>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <Sparkles className="w-4 h-4 text-brand-500" />
                  Upcoming Events
                </h2>
                <div className="mt-4 space-y-3">
                  {upcomingEvents.length ? (
                    upcomingEvents.map((event) => <CompactEvent key={event.id} event={event} />)
                  ) : (
                    <p className="text-sm text-fg-3">No upcoming events.</p>
                  )}
                </div>
              </section>
            </aside>
          </div>
        )}

        {!isLoading && selectedEvents.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-fg-3">
              Events on selected day
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedEvents.map((event) => <EventCard key={event.id} {...event} />)}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
