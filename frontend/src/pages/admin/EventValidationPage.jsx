import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, CheckCircle, Clock, XCircle, Eye, Check, X } from 'lucide-react'
import adminService from '../../services/adminService'
import { useToast } from '../../context/ToastContext'
import EventPreviewModal from '../../components/admin/EventPreviewModal'
import RejectModal from '../../components/admin/RejectModal'

const CATEGORY_BADGE = {
  academic: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  sport: 'bg-green-500/10 text-green-500 border-green-500/20',
  career: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  volunteer: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  cultural: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
}

const MODE_BADGE = {
  physical: 'bg-surface-alt text-fg-2 border-border',
  online: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  hybrid: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-surface border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="h-5 bg-surface-alt rounded w-3/4 mb-2" />
          <div className="h-4 bg-surface-alt rounded w-1/2" />
        </div>
        <div className="h-6 w-20 bg-surface-alt rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="h-4 bg-surface-alt rounded" />
        <div className="h-4 bg-surface-alt rounded" />
        <div className="h-4 bg-surface-alt rounded" />
        <div className="h-4 bg-surface-alt rounded" />
      </div>
      <div className="flex gap-2 pt-4 border-t border-border">
        <div className="h-8 bg-surface-alt rounded-lg flex-1" />
        <div className="h-8 bg-surface-alt rounded-lg flex-1" />
        <div className="h-8 bg-surface-alt rounded-lg flex-1" />
      </div>
    </div>
  )
}

export default function EventValidationPage() {
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [busyIds, setBusyIds] = useState({})
  const [previewEvent, setPreviewEvent] = useState(null)
  const [rejectEvent, setRejectEvent] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'pending-events'],
    queryFn: adminService.getPendingEvents,
    staleTime: 30_000,
  })

  const events = data?.events ?? []

  const filtered = useMemo(() => {
    return events.filter((ev) => {
      if (search) {
        const q = search.toLowerCase()
        if (!ev.title?.toLowerCase().includes(q)) return false
      }
      if (categoryFilter && ev.category !== categoryFilter) return false
      return true
    })
  }, [events, search, categoryFilter])

  // Derive stats
  const pendingCount = events.length
  const approvedToday = events.filter((ev) => ev.validated_at?.startsWith(new Date().toISOString().slice(0, 10))).length
  const rejectedToday = events.filter((ev) => ev.rejected_at?.startsWith(new Date().toISOString().slice(0, 10))).length

  const categories = [...new Set(events.map((ev) => ev.category).filter(Boolean))]

  async function handleValidate(id) {
    setBusyIds((prev) => ({ ...prev, [id]: 'validating' }))
    try {
      await adminService.validateEvent(id)
      addToast('Event validated successfully', 'success')
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-events'] })
    } catch (err) {
      addToast(err.message || 'Failed to validate event', 'error')
    } finally {
      setBusyIds((prev) => { const n = { ...prev }; delete n[id]; return n })
    }
  }

  function formatDate(dt) {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg">Event Validation</h1>
        <p className="text-fg-3 text-sm mt-1">Review and approve events submitted by organizers</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-fg">{isLoading ? '—' : pendingCount}</p>
              <p className="text-xs text-fg-3">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-4.5 h-4.5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-fg">{isLoading ? '—' : approvedToday}</p>
              <p className="text-xs text-fg-3">Approved today</p>
            </div>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-4.5 h-4.5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-fg">{isLoading ? '—' : rejectedToday}</p>
              <p className="text-xs text-fg-3">Rejected today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface border border-border text-fg placeholder-fg-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface border border-border text-fg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
        >
          <option value="">All categories</option>
          {['academic', 'sport', 'career', 'volunteer', 'cultural'].map((c) => (
            <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <p className="font-semibold text-fg text-lg">No events pending validation</p>
          <p className="text-fg-3 text-sm mt-1">All submitted events have been reviewed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((ev) => (
            <div key={ev.id} className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-fg text-base truncate">{ev.title}</h3>
                  <p className="text-sm text-fg-3 mt-0.5">
                    by <span className="text-fg-2">{ev.organizer_name || 'Unknown'}</span>
                    {ev.organizer_email && <span className="text-fg-3"> · {ev.organizer_email}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {ev.category && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${CATEGORY_BADGE[ev.category] ?? 'bg-surface-alt text-fg-2 border-border'}`}>
                      {ev.category}
                    </span>
                  )}
                  {ev.participation_mode && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${MODE_BADGE[ev.participation_mode] ?? 'bg-surface-alt text-fg-2 border-border'}`}>
                      {ev.participation_mode}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-fg-3 mb-4">
                <div>
                  <span className="text-xs text-fg-3 block mb-0.5">Start</span>
                  <span className="text-fg-2">{formatDate(ev.start_datetime)}</span>
                </div>
                {ev.location && (
                  <div>
                    <span className="text-xs text-fg-3 block mb-0.5">Location</span>
                    <span className="text-fg-2 truncate block">{ev.location}</span>
                  </div>
                )}
                {ev.capacity && (
                  <div>
                    <span className="text-xs text-fg-3 block mb-0.5">Capacity</span>
                    <span className="text-fg-2">{ev.capacity}</span>
                  </div>
                )}
                {ev.created_at && (
                  <div>
                    <span className="text-xs text-fg-3 block mb-0.5">Submitted</span>
                    <span className="text-fg-2">{formatDate(ev.created_at)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-border">
                <button
                  onClick={() => setPreviewEvent(ev)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-fg-2 hover:text-fg hover:bg-surface-alt text-sm font-medium transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={() => handleValidate(ev.id)}
                  disabled={!!busyIds[ev.id]}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500/20 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  {busyIds[ev.id] === 'validating' ? 'Validating...' : 'Validate'}
                </button>
                <button
                  onClick={() => setRejectEvent(ev)}
                  disabled={!!busyIds[ev.id]}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals rendered via lazy imports in commit 4 */}
      {previewEvent && (
        <EventPreviewModal
          event={previewEvent}
          onClose={() => setPreviewEvent(null)}
          onValidate={async () => { await handleValidate(previewEvent.id); setPreviewEvent(null) }}
          onReject={() => { setRejectEvent(previewEvent); setPreviewEvent(null) }}
        />
      )}
      {rejectEvent && (
        <RejectModal
          event={rejectEvent}
          onClose={() => setRejectEvent(null)}
          onSuccess={() => {
            setRejectEvent(null)
            queryClient.invalidateQueries({ queryKey: ['admin', 'pending-events'] })
            addToast('Event rejected', 'info')
          }}
        />
      )}
    </div>
  )
}
