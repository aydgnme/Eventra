import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Search, CheckCircle, Clock, XCircle, Eye, Check, X, RotateCcw, EyeOff } from 'lucide-react'
import {
  usePendingEvents,
  useAllEvents,
  useEventStats,
  useValidateEvent,
  useUnpublishEvent,
  adminKeys,
} from '../../hooks/useAdmin'
import { useToast } from '../../context/ToastContext'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import EventPreviewModal from '../../components/admin/EventPreviewModal'
import RejectModal from '../../components/admin/RejectModal'

const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Validated' },
  { id: 'rejected', label: 'Rejected' },
]

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

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
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
      </div>
      <div className="flex gap-2 pt-4 border-t border-border">
        <div className="h-8 bg-surface-alt rounded-lg flex-1" />
        <div className="h-8 bg-surface-alt rounded-lg flex-1" />
        <div className="h-8 bg-surface-alt rounded-lg flex-1" />
      </div>
    </div>
  )
}

function EventCard({ ev, actions }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
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
        {actions}
      </div>
    </div>
  )
}

// ── Pending Tab ───────────────────────────────────────────────────────────────
function PendingTab({ search, categoryFilter }) {
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [previewEvent, setPreviewEvent] = useState(null)
  const [rejectEvent, setRejectEvent] = useState(null)

  const { data, isLoading } = usePendingEvents()
  const validateMutation = useValidateEvent()

  const events = useMemo(() => data?.events ?? [], [data])

  const filtered = useMemo(() => events.filter((ev) => {
    if (search && !ev.title?.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter && ev.category !== categoryFilter) return false
    return true
  }), [events, search, categoryFilter])

  function handleValidate(id) {
    validateMutation.mutate(id, {
      onSuccess: () => addToast('Event validated and published', 'success'),
      onError: (err) => addToast(err.message || 'Failed to validate event', 'error'),
    })
  }

  if (isLoading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>

  if (filtered.length === 0) return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-500" />
      </div>
      <p className="font-semibold text-fg text-lg">No events pending validation</p>
      <p className="text-fg-3 text-sm mt-1">All submitted events have been reviewed</p>
    </div>
  )

  return (
    <>
      <div className="space-y-4">
        {filtered.map((ev) => (
          <EventCard
            key={ev.id}
            ev={ev}
            actions={<>
              <button
                onClick={() => setPreviewEvent(ev)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-fg-2 hover:text-fg hover:bg-surface-alt text-sm font-medium transition-colors"
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
              <button
                onClick={() => handleValidate(ev.id)}
                disabled={validateMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500/20 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                {validateMutation.isPending && validateMutation.variables === ev.id ? 'Validating...' : 'Validate'}
              </button>
              <button
                onClick={() => setRejectEvent(ev)}
                disabled={validateMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" /> Reject
              </button>
            </>}
          />
        ))}
      </div>

      {previewEvent && (
        <EventPreviewModal
          event={previewEvent}
          onClose={() => setPreviewEvent(null)}
          onValidate={() => { handleValidate(previewEvent.id); setPreviewEvent(null) }}
          onReject={() => { setRejectEvent(previewEvent); setPreviewEvent(null) }}
        />
      )}
      {rejectEvent && (
        <RejectModal
          event={rejectEvent}
          onClose={() => setRejectEvent(null)}
          onSuccess={() => {
            setRejectEvent(null)
            queryClient.invalidateQueries({ queryKey: adminKeys.pendingEvents })
          }}
        />
      )}
    </>
  )
}

// ── Validated Tab ─────────────────────────────────────────────────────────────
function ValidatedTab({ search, categoryFilter }) {
  const { addToast } = useToast()
  const [previewEvent, setPreviewEvent] = useState(null)

  const params = useMemo(() => {
    const p = { status: 'approved' }
    if (search) p.search = search
    if (categoryFilter) p.category = categoryFilter
    return p
  }, [search, categoryFilter])

  const { data, isLoading } = useAllEvents(params)
  const unpublishMutation = useUnpublishEvent()

  const events = data?.events ?? []

  function handleUnpublish(id) {
    unpublishMutation.mutate(id, {
      onSuccess: () => addToast('Event unpublished and moved back to review', 'info'),
      onError: (err) => addToast(err.message || 'Failed to unpublish event', 'error'),
    })
  }

  if (isLoading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>

  if (events.length === 0) return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-blue-500" />
      </div>
      <p className="font-semibold text-fg text-lg">No validated events</p>
      <p className="text-fg-3 text-sm mt-1">Approved events will appear here</p>
    </div>
  )

  return (
    <>
      <div className="space-y-4">
        {events.map((ev) => (
          <EventCard
            key={ev.id}
            ev={ev}
            actions={<>
              <button
                onClick={() => setPreviewEvent(ev)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-fg-2 hover:text-fg hover:bg-surface-alt text-sm font-medium transition-colors"
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
              {ev.reviewed_at && (
                <div className="flex-1 flex items-center justify-center gap-1.5 text-xs text-green-500">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Validated {formatDate(ev.reviewed_at)}
                </div>
              )}
              <button
                onClick={() => handleUnpublish(ev.id)}
                disabled={unpublishMutation.isPending && unpublishMutation.variables === ev.id}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <EyeOff className="w-4 h-4" />
                {unpublishMutation.isPending && unpublishMutation.variables === ev.id ? 'Unpublishing...' : 'Unpublish'}
              </button>
            </>}
          />
        ))}
      </div>

      {previewEvent && (
        <EventPreviewModal
          event={previewEvent}
          onClose={() => setPreviewEvent(null)}
          onValidate={null}
          onReject={null}
        />
      )}
    </>
  )
}

// ── Rejected Tab ──────────────────────────────────────────────────────────────
function RejectedTab({ search, categoryFilter }) {
  const { addToast } = useToast()
  const [previewEvent, setPreviewEvent] = useState(null)

  const params = useMemo(() => {
    const p = { status: 'rejected' }
    if (search) p.search = search
    if (categoryFilter) p.category = categoryFilter
    return p
  }, [search, categoryFilter])

  const { data, isLoading } = useAllEvents(params)
  const validateMutation = useValidateEvent()

  const events = data?.events ?? []

  function handleReValidate(id) {
    validateMutation.mutate(id, {
      onSuccess: () => addToast('Event re-validated and published', 'success'),
      onError: (err) => addToast(err.message || 'Failed to validate event', 'error'),
    })
  }

  if (isLoading) return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>

  if (events.length === 0) return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-full bg-surface-alt flex items-center justify-center mx-auto mb-4">
        <XCircle className="w-8 h-8 text-fg-3" />
      </div>
      <p className="font-semibold text-fg text-lg">No rejected events</p>
      <p className="text-fg-3 text-sm mt-1">Rejected events will appear here</p>
    </div>
  )

  return (
    <>
      <div className="space-y-4">
        {events.map((ev) => (
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
                {ev.reviewed_at && (
                  <span className="text-xs text-red-400">Rejected {formatDate(ev.reviewed_at)}</span>
                )}
              </div>
            </div>

            {ev.rejection_reason && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-xs font-semibold text-red-400 mb-1">Rejection Reason</p>
                <p className="text-sm text-fg-2">{ev.rejection_reason}</p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-fg-3 mb-4">
              <div>
                <span className="text-xs text-fg-3 block mb-0.5">Start</span>
                <span className="text-fg-2">{formatDate(ev.start_datetime)}</span>
              </div>
              {ev.category && (
                <div>
                  <span className="text-xs text-fg-3 block mb-0.5">Category</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${CATEGORY_BADGE[ev.category] ?? 'bg-surface-alt text-fg-2 border-border'}`}>
                    {ev.category}
                  </span>
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
                <Eye className="w-4 h-4" /> Preview
              </button>
              <button
                onClick={() => handleReValidate(ev.id)}
                disabled={validateMutation.isPending && validateMutation.variables === ev.id}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500/20 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                {validateMutation.isPending && validateMutation.variables === ev.id ? 'Validating...' : 'Re-validate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {previewEvent && (
        <EventPreviewModal
          event={previewEvent}
          onClose={() => setPreviewEvent(null)}
          onValidate={null}
          onReject={null}
        />
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EventValidationPage() {
  useDocumentTitle('Event Validation')
  const [activeTab, setActiveTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const { data: stats, isLoading: statsLoading } = useEventStats()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg">Event Validation</h1>
        <p className="text-fg-3 text-sm mt-1">Review and approve events submitted by organizers</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-4.5 h-4.5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-fg">{statsLoading ? '—' : (stats?.pending_count ?? 0)}</p>
              <p className="text-xs text-fg-3">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <CheckCircle className="w-4.5 h-4.5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-fg">{statsLoading ? '—' : (stats?.approved_today ?? 0)}</p>
              <p className="text-xs text-fg-3">Approved today</p>
            </div>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <XCircle className="w-4.5 h-4.5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-fg">{statsLoading ? '—' : (stats?.rejected_today ?? 0)}</p>
              <p className="text-xs text-fg-3">Rejected today</p>
            </div>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <Check className="w-4.5 h-4.5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-fg">{statsLoading ? '—' : (stats?.total_approved ?? 0)}</p>
              <p className="text-xs text-fg-3">Total approved</p>
            </div>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <X className="w-4.5 h-4.5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-fg">{statsLoading ? '—' : (stats?.total_rejected ?? 0)}</p>
              <p className="text-xs text-fg-3">Total rejected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 mb-5 w-fit">
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
            {tab.id === 'pending' && !statsLoading && stats?.pending_count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-yellow-500 text-white text-xs font-bold">
                {stats.pending_count}
              </span>
            )}
          </button>
        ))}
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

      {/* Tab content */}
      {activeTab === 'pending' && (
        <PendingTab search={search} categoryFilter={categoryFilter} />
      )}
      {activeTab === 'approved' && (
        <ValidatedTab search={search} categoryFilter={categoryFilter} />
      )}
      {activeTab === 'rejected' && (
        <RejectedTab search={search} categoryFilter={categoryFilter} />
      )}
    </div>
  )
}
