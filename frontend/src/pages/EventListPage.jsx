import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, Calendar, List, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react'
import Navbar from '../components/Navbar'
import EventCard from '../components/EventCard'
import { eventService } from '../services/eventService'

const CATEGORIES = ['academic', 'sport', 'career', 'volunteer', 'cultural']
const MODES = ['physical', 'online', 'hybrid']
const PAGE_SIZE = 10

const CATEGORY_DOT = {
  academic: 'bg-blue-500',
  sport: 'bg-green-500',
  career: 'bg-orange-500',
  volunteer: 'bg-purple-500',
  cultural: 'bg-pink-500',
}

const EMPTY_FILTERS = {
  search: '',
  category: '',
  participation_mode: '',
  start_date: '',
  end_date: '',
  faculty: '',
  requires_registration: false,
  has_qr: false,
}

// ── Calendar helper ──────────────────────────────────────────────────────────
function MonthCalendar({ events, onDayClick }) {
  const [viewDate, setViewDate] = useState(new Date())

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const eventsByDay = useMemo(() => {
    const map = {}
    for (const ev of events) {
      if (!ev.start_datetime) continue
      const d = new Date(ev.start_datetime)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        if (!map[day]) map[day] = []
        map[day].push(ev)
      }
    }
    return map
  }, [events, year, month])

  const cells = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa']
  const today = new Date()

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1.5 rounded-lg text-fg-3 hover:text-fg hover:bg-surface-alt transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-fg text-sm">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1.5 rounded-lg text-fg-3 hover:text-fg hover:bg-surface-alt transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-fg-3 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="h-14 border-b border-r border-border last:border-r-0" />
          const eventsOnDay = eventsByDay[day] || []
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day
          return (
            <div
              key={day}
              onClick={() => eventsOnDay.length > 0 && onDayClick(eventsOnDay)}
              className={`h-14 border-b border-r border-border last:border-r-0 p-1 flex flex-col gap-0.5 transition-colors ${
                eventsOnDay.length > 0 ? 'cursor-pointer hover:bg-surface-alt' : ''
              }`}
            >
              <span
                className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday
                    ? 'bg-brand-500 text-white'
                    : 'text-fg-2'
                }`}
              >
                {day}
              </span>
              <div className="flex flex-wrap gap-0.5">
                {eventsOnDay.slice(0, 3).map((ev) => (
                  <span
                    key={ev.id}
                    className={`w-2 h-2 rounded-full ${CATEGORY_DOT[ev.category] ?? 'bg-fg-3'}`}
                    title={ev.title}
                  />
                ))}
                {eventsOnDay.length > 3 && (
                  <span className="text-[10px] text-fg-3">+{eventsOnDay.length - 3}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function EventListPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list' | 'calendar'
  const [page, setPage] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [calendarDayEvents, setCalendarDayEvents] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventService.getEvents(),
    staleTime: 30_000,
  })

  const allEvents = data?.events ?? []

  // Client-side filtering
  const filtered = useMemo(() => {
    return allEvents.filter((ev) => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (
          !ev.title?.toLowerCase().includes(q) &&
          !ev.description?.toLowerCase().includes(q) &&
          !ev.location?.toLowerCase().includes(q)
        ) return false
      }
      if (filters.category && ev.category !== filters.category) return false
      if (filters.participation_mode && ev.participation_mode && ev.participation_mode !== filters.participation_mode) return false
      if (filters.start_date) {
        if (!ev.start_datetime || new Date(ev.start_datetime) < new Date(filters.start_date)) return false
      }
      if (filters.end_date) {
        if (!ev.start_datetime || new Date(ev.start_datetime) > new Date(filters.end_date + 'T23:59:59')) return false
      }
      if (filters.faculty) {
        const q = filters.faculty.toLowerCase()
        if (!ev.location?.toLowerCase().includes(q) && !ev.description?.toLowerCase().includes(q)) return false
      }
      if (filters.requires_registration && !ev.link_registration) return false
      if (filters.has_qr && !ev.qr_code) return false
      return true
    })
  }, [allEvents, filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function setFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== '' && v !== false)

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-fg">Events</h1>
            <p className="text-fg-3 text-sm mt-0.5">
              {filtered.length} {filtered.length === 1 ? 'event' : 'events'} found
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-surface-alt text-fg' : 'text-fg-3 hover:text-fg'}`}
                title="Grid view"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" />
                  <rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-surface-alt text-fg' : 'text-fg-3 hover:text-fg'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-surface-alt text-fg' : 'text-fg-3 hover:text-fg'}`}
                title="Calendar view"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface text-fg-2 hover:text-fg text-sm transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-brand-500" />
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar filters */}
          <aside
            className={`shrink-0 w-64 ${
              sidebarOpen ? 'block' : 'hidden'
            } lg:block`}
          >
            <div className="bg-surface border border-border rounded-xl p-4 shadow-sm sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-fg text-sm">Filters</h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-link hover:text-brand-500 flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Search */}
                <div>
                  <label className="block text-xs font-medium text-fg-2 uppercase tracking-wide mb-1.5">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-3" />
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) => setFilter('search', e.target.value)}
                      placeholder="Event title..."
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface-alt border border-border text-fg placeholder-fg-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-medium text-fg-2 uppercase tracking-wide mb-2">Category</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFilter('category', filters.category === c ? '' : c)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                          filters.category === c
                            ? 'bg-brand-500 text-white'
                            : 'bg-surface-alt border border-border text-fg-2 hover:text-fg hover:border-brand-500/50'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Participation Mode */}
                <div>
                  <label className="block text-xs font-medium text-fg-2 uppercase tracking-wide mb-2">Mode</label>
                  <div className="flex flex-wrap gap-1.5">
                    {MODES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFilter('participation_mode', filters.participation_mode === m ? '' : m)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                          filters.participation_mode === m
                            ? 'bg-brand-500 text-white'
                            : 'bg-surface-alt border border-border text-fg-2 hover:text-fg hover:border-brand-500/50'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date range */}
                <div>
                  <label className="block text-xs font-medium text-fg-2 uppercase tracking-wide mb-1.5">Date Range</label>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[11px] text-fg-3 mb-1">From</p>
                      <input
                        type="date"
                        value={filters.start_date}
                        onChange={(e) => setFilter('start_date', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-fg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] text-fg-3 mb-1">To</p>
                      <input
                        type="date"
                        value={filters.end_date}
                        onChange={(e) => setFilter('end_date', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-fg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Faculty / Department */}
                <div>
                  <label className="block text-xs font-medium text-fg-2 uppercase tracking-wide mb-1.5">Faculty / Department</label>
                  <input
                    type="text"
                    value={filters.faculty}
                    onChange={(e) => setFilter('faculty', e.target.value)}
                    placeholder="e.g. FIESC, FSEAP…"
                    className="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-fg placeholder-fg-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Checkboxes */}
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={filters.requires_registration}
                      onChange={(e) => setFilter('requires_registration', e.target.checked)}
                      className="w-4 h-4 accent-brand-500 shrink-0"
                    />
                    <span className="text-sm text-fg-2">Requires registration</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={filters.has_qr}
                      onChange={(e) => setFilter('has_qr', e.target.checked)}
                      className="w-4 h-4 accent-brand-500 shrink-0"
                    />
                    <span className="text-sm text-fg-2">Has QR code</span>
                  </label>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-fg-3">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading events…
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-500 text-sm">{error.message}</p>
              </div>
            ) : viewMode === 'calendar' ? (
              <>
                <MonthCalendar events={filtered} onDayClick={setCalendarDayEvents} />
                {calendarDayEvents && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-fg text-sm">
                        Events on this day ({calendarDayEvents.length})
                      </h3>
                      <button onClick={() => setCalendarDayEvents(null)} className="text-fg-3 hover:text-fg transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {calendarDayEvents.map((ev) => (
                        <EventCard key={ev.id} {...ev} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-fg-3">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-fg-2">No events found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-sm text-link hover:text-brand-500 transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
                      : 'flex flex-col gap-3'
                  }
                >
                  {paginated.map((ev) => (
                    <EventCard key={ev.id} {...ev} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 rounded-lg border border-border text-fg-2 hover:text-fg hover:bg-surface-alt disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => Math.abs(p - page) <= 2)
                      .map((p) => (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                            p === page
                              ? 'bg-brand-500 text-white'
                              : 'border border-border text-fg-2 hover:text-fg hover:bg-surface-alt'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 rounded-lg border border-border text-fg-2 hover:text-fg hover:bg-surface-alt disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
