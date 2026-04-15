import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Calendar, Users, Star, TrendingUp } from 'lucide-react'
import adminService from '../../services/adminService'
import StatCard from '../../components/admin/StatCard'

const TABS = [
  { id: 'events', label: 'Events Report' },
  { id: 'organizers', label: 'Organizers Report' },
]

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('events')

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin', 'report-summary'],
    queryFn: adminService.getReportSummary,
    staleTime: 60_000,
  })

  const stats = summary ?? {}

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg">Reports & Analytics</h1>
        <p className="text-fg-3 text-sm mt-1">Platform statistics and performance insights</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Calendar}
          label="Total Events"
          value={stats.total_events ?? 0}
          loading={summaryLoading}
        />
        <StatCard
          icon={Users}
          label="Total Registrations"
          value={stats.total_registrations ?? 0}
          loading={summaryLoading}
        />
        <StatCard
          icon={Star}
          label="Avg Rating"
          value={stats.avg_rating != null ? Number(stats.avg_rating).toFixed(1) : '0.0'}
          loading={summaryLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="Active Organizers"
          value={stats.active_organizers ?? 0}
          loading={summaryLoading}
        />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-6 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-fg-2 hover:text-fg hover:bg-surface-alt'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'events' ? (
        <EventsReportTab />
      ) : (
        <OrganizersReportTab />
      )}
    </div>
  )
}

// ── Events Report Tab ─────────────────────────────────────────────────────────
function EventsReportTab() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'events-report', month, year],
    queryFn: () => adminService.getEventsReport({ month, year }),
    staleTime: 60_000,
  })

  const events = data?.events ?? []

  function formatDate(dt) {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  async function handleExport() {
    try {
      const blob = await adminService.exportReportPDF()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `eventra-report-${month}-${year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Export failed silently
    }
  }

  const totalRegistrations = events.reduce((sum, ev) => sum + (ev.registrations ?? 0), 0)

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-fg-2">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg bg-surface border border-border text-fg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString('en', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-fg-2">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg bg-surface border border-border text-fg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-500/90 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-surface border border-border rounded-xl overflow-hidden animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 border-b border-border bg-surface-alt/50" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-xl">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 text-fg-3 opacity-30" />
          <p className="font-medium text-fg-2">No events data for this period</p>
          <p className="text-sm text-fg-3 mt-1">Try selecting a different month or year</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt">
                  <th className="text-left px-4 py-3 font-semibold text-fg-2">Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-fg-2">Organizer</th>
                  <th className="text-left px-4 py-3 font-semibold text-fg-2">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-fg-2">Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-fg-2">Registrations</th>
                  <th className="text-right px-4 py-3 font-semibold text-fg-2">Capacity</th>
                  <th className="text-right px-4 py-3 font-semibold text-fg-2">Rating</th>
                  <th className="text-left px-4 py-3 font-semibold text-fg-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, idx) => (
                  <tr key={ev.id ?? idx} className="border-b border-border hover:bg-surface-alt/50 transition-colors">
                    <td className="px-4 py-3 text-fg font-medium truncate max-w-40">{ev.title || '—'}</td>
                    <td className="px-4 py-3 text-fg-2">{ev.organizer_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-fg-2">{ev.category || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-fg-3 whitespace-nowrap">{formatDate(ev.start_datetime)}</td>
                    <td className="px-4 py-3 text-right text-fg-2">{ev.registrations ?? 0}</td>
                    <td className="px-4 py-3 text-right text-fg-2">{ev.capacity ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-fg-2">{ev.rating != null ? Number(ev.rating).toFixed(1) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        ev.status === 'published' ? 'bg-green-500/10 text-green-500' :
                        ev.status === 'validated' ? 'bg-blue-500/10 text-blue-400' :
                        ev.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {ev.status || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-alt border-t-2 border-border font-semibold">
                  <td className="px-4 py-3 text-fg" colSpan={4}>Total ({events.length} events)</td>
                  <td className="px-4 py-3 text-right text-fg">{totalRegistrations}</td>
                  <td className="px-4 py-3 text-right text-fg-2">—</td>
                  <td className="px-4 py-3 text-right text-fg-2">—</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Organizers Report Tab ─────────────────────────────────────────────────────
function OrganizersReportTab() {
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState('total_events')
  const [sortDir, setSortDir] = useState('desc')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'organizers-report'],
    queryFn: adminService.getOrganizersReport,
    staleTime: 60_000,
  })

  const organizers = data?.organizers ?? []

  function formatDate(dt) {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const filtered = organizers
    .filter((org) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        org.name?.toLowerCase().includes(q) ||
        org.email?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const av = a[sortCol] ?? ''
      const bv = b[sortCol] ?? ''
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  function SortIcon({ col }) {
    if (sortCol !== col) return <span className="text-fg-3 ml-1">↕</span>
    return <span className="text-brand-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full max-w-xs px-4 py-2 rounded-lg bg-surface border border-border text-fg placeholder-fg-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
        />
      </div>

      {isLoading ? (
        <div className="bg-surface border border-border rounded-xl overflow-hidden animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 border-b border-border bg-surface-alt/50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-xl">
          <Users className="w-10 h-10 mx-auto mb-3 text-fg-3 opacity-30" />
          <p className="font-medium text-fg-2">{search ? 'No organizers match your search' : 'No organizers data available'}</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt">
                  {[
                    { key: 'name', label: 'Name' },
                    { key: 'email', label: 'Email' },
                    { key: 'total_events', label: 'Total Events' },
                    { key: 'total_registrations', label: 'Total Registrations' },
                    { key: 'avg_rating', label: 'Avg Rating' },
                    { key: 'last_event', label: 'Last Event' },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="text-left px-4 py-3 font-semibold text-fg-2 cursor-pointer hover:text-fg transition-colors whitespace-nowrap"
                    >
                      {label}
                      <SortIcon col={key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((org, idx) => (
                  <tr key={org.id ?? idx} className="border-b border-border hover:bg-surface-alt/50 transition-colors">
                    <td className="px-4 py-3 text-fg font-medium">{org.name || '—'}</td>
                    <td className="px-4 py-3 text-fg-3">{org.email || '—'}</td>
                    <td className="px-4 py-3 text-fg-2 text-right">{org.total_events ?? 0}</td>
                    <td className="px-4 py-3 text-fg-2 text-right">{org.total_registrations ?? 0}</td>
                    <td className="px-4 py-3 text-fg-2 text-right">{org.avg_rating != null ? Number(org.avg_rating).toFixed(1) : '—'}</td>
                    <td className="px-4 py-3 text-fg-3 whitespace-nowrap">{formatDate(org.last_event)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
