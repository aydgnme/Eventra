import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Download, Users, Loader2, AlertCircle, Search, CheckCircle2,
  UserCheck, ScanLine, UserX,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import StatusBadge from '../components/StatusBadge'
import { useToast } from '../context/ToastContext'
import { useEvent } from '../hooks/useEvents'
import { useParticipants, useParticipantCount, useCheckin, useUndoCheckin, useRejectParticipant } from '../hooks/useRegistrations'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { registrationService } from '../services/registrationService'
import QRScanner from '../components/QRScanner'

function nameFromEmail(email) {
  if (!email) return '—'
  const local = email.split('@')[0]
  const parts = local.split('.').filter(Boolean)
  const cleaned = parts
    .map((p) => p.replace(/\d+$/u, ''))
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
  return cleaned.join(' ') || local
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ParticipantRow({ reg, i, checkinMutation, undoCheckinMutation, rejectMutation, addToast }) {
  const isCheckedIn = reg.status === 'attended' || reg.checked_in
  const canCheckin = reg.status === 'registered' || isCheckedIn
  const canReject = reg.status !== 'cancelled'

  return (
    <tr
      className={`border-b border-border last:border-0 hover:bg-surface-alt transition-colors ${i % 2 === 0 ? '' : 'bg-surface-alt/30'}`}
    >
      <td className="px-5 py-3.5 font-medium text-fg">
        {nameFromEmail(reg.user?.email)}
      </td>
      <td className="px-5 py-3.5 text-fg-2">{reg.user?.email || '—'}</td>
      <td className="px-5 py-3.5">
        <StatusBadge status={reg.status} />
      </td>
      <td className="px-5 py-3.5 text-fg-3">{formatDate(reg.registered_at)}</td>
      <td className="px-5 py-3.5 text-center">
        {canCheckin && (
          <button
            onClick={() =>
              isCheckedIn
                ? undoCheckinMutation.mutate(reg.user?.id)
                : checkinMutation.mutate(reg.user?.id)
            }
            disabled={checkinMutation.isPending || undoCheckinMutation.isPending}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
              isCheckedIn
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                : 'bg-surface-alt border border-border text-fg-3 hover:text-fg hover:bg-border'
            }`}
            title={isCheckedIn ? 'Undo check-in' : 'Check in'}
          >
            {isCheckedIn ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Checked In
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                Check In
              </>
            )}
          </button>
        )}
      </td>
      <td className="px-5 py-3.5 text-center">
        {canReject && (
          <button
            onClick={() => {
              if (window.confirm(`Remove ${nameFromEmail(reg.user?.email)} from this event?`)) {
                rejectMutation.mutate(reg.user?.id, {
                  onSuccess: () => addToast('Participant removed', 'info'),
                  onError: (err) => addToast(err.message, 'error'),
                })
              }
            }}
            disabled={rejectMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all disabled:opacity-50"
            title="Remove participant"
          >
            <UserX className="w-3.5 h-3.5" />
            Remove
          </button>
        )}
      </td>
    </tr>
  )
}

function ParticipantsTableContent({ isLoading, error, registrations, search, statusFilter, checkinMutation, undoCheckinMutation, rejectMutation, addToast }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-fg-3">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading participants...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-500 text-sm p-6">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {error.message}
      </div>
    )
  }

  if (registrations.length === 0) {
    return (
      <div className="text-center py-16 text-fg-3">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-25" />
        <p className="font-medium text-fg-2">No participants found</p>
        <p className="text-sm mt-1">
          {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'No registrations yet'}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-alt">
            <th className="text-left px-5 py-3 text-xs font-semibold text-fg-3 uppercase tracking-wide">Name</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-fg-3 uppercase tracking-wide">Email</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-fg-3 uppercase tracking-wide">Status</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-fg-3 uppercase tracking-wide">Registered</th>
            <th className="text-center px-5 py-3 text-xs font-semibold text-fg-3 uppercase tracking-wide">Check-in</th>
            <th className="text-center px-5 py-3 text-xs font-semibold text-fg-3 uppercase tracking-wide">Remove</th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((reg, i) => (
            <ParticipantRow
              key={reg.id}
              reg={reg}
              i={i}
              checkinMutation={checkinMutation}
              undoCheckinMutation={undoCheckinMutation}
              rejectMutation={rejectMutation}
              addToast={addToast}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'registered', label: 'Registered' },
  { key: 'waitlisted', label: 'Waitlisted' },
  { key: 'attended', label: 'Checked In' },
  { key: 'cancelled', label: 'Cancelled' },
]

export default function ParticipantsPage() {
  useDocumentTitle('Participants')
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showScanner, setShowScanner] = useState(false)

  const { data: eventData } = useEvent(id)

  const params = {}
  if (search) params.search = search
  if (statusFilter !== 'all') params.status = statusFilter

  const { data, isLoading, error } = useParticipants(id, params)
  const { data: countData } = useParticipantCount(id)
  const checkinMutation = useCheckin(id)
  const undoCheckinMutation = useUndoCheckin(id)
  const rejectMutation = useRejectParticipant(id)

  const handleExport = async () => {
    try {
      const blob = await registrationService.exportParticipants(id, params)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `participants-event-${id}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      addToast(err.message || 'Export failed.', 'error')
    }
  }

  const event = eventData?.event
  const registrations = data?.participants ?? []
  const registered = countData?.registered ?? 0
  const waitlisted = countData?.waitlisted ?? 0

  return (
    <>
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/organizer')}
            className="p-2 rounded-lg text-fg-3 hover:text-fg hover:bg-surface-alt transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-fg">Participants</h1>
            {event && (
              <p className="text-fg-3 text-sm truncate">{event.title}</p>
            )}
          </div>
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium transition-colors"
          >
            <ScanLine className="w-4 h-4" />
            Scan QR
          </button>
          <button
            onClick={handleExport}
            disabled={registrations.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface text-fg-2 hover:text-fg hover:bg-surface-alt text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Stats */}
        {countData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Registered', value: registered, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Waitlisted', value: waitlisted, color: 'text-yellow-600 dark:text-yellow-400' },
              { label: 'Checked In', value: countData.attended ?? 0, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Capacity', value: event?.capacity ?? 'Unlimited', color: 'text-fg-2' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface border border-border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-fg-3 uppercase tracking-wide mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-fg placeholder-fg-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border overflow-x-auto shrink-0">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  statusFilter === f.key
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-fg-3 hover:text-fg hover:bg-surface-alt'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
          <ParticipantsTableContent
            isLoading={isLoading}
            error={error}
            registrations={registrations}
            search={search}
            statusFilter={statusFilter}
            checkinMutation={checkinMutation}
            undoCheckinMutation={undoCheckinMutation}
            rejectMutation={rejectMutation}
            addToast={addToast}
          />
        </div>
      </div>
    </div>

    {showScanner && (
      <QRScanner eventId={id} onClose={() => setShowScanner(false)} />
    )}
    </>
  )
}
