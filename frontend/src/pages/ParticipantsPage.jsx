import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, Users, Loader2, AlertCircle } from 'lucide-react'
import Navbar from '../components/Navbar'
import StatusBadge from '../components/StatusBadge'
import { registrationService } from '../services/registrationService'
import { eventService } from '../services/eventService'

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function downloadCSV(rows) {
  const header = ['Full Name', 'Email', 'Status', 'Registration Date']
  const lines = [
    header.join(','),
    ...rows.map((r) =>
      [
        `"${r.user_email || ''}"`,
        `"${r.user_email || ''}"`,
        r.status,
        formatDate(r.registered_at),
      ].join(',')
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `participants.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ParticipantsPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: eventData } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventService.getEvent(id),
    staleTime: 60_000,
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['participants', id],
    queryFn: () => registrationService.getParticipants(id),
    staleTime: 30_000,
  })

  const { data: countData } = useQuery({
    queryKey: ['participantCount', id],
    queryFn: () => registrationService.getCount(id),
    staleTime: 30_000,
  })

  const event = eventData?.event
  const registrations = data?.registrations ?? []
  const registered = countData?.registered ?? 0
  const waitlisted = countData?.waitlisted ?? 0

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
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
          {registrations.length > 0 && (
            <button
              onClick={() => downloadCSV(registrations)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface text-fg-2 hover:text-fg hover:bg-surface-alt text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>

        {/* Stats */}
        {countData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Registered', value: registered, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Waitlisted', value: waitlisted, color: 'text-yellow-600 dark:text-yellow-400' },
              { label: 'Total Active', value: countData.total_active, color: 'text-fg' },
              { label: 'Capacity', value: event?.capacity ?? 'Unlimited', color: 'text-fg-2' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface border border-border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-fg-3 uppercase tracking-wide mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-fg-3">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading participants…
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-500 text-sm p-6">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error.message}
            </div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-16 text-fg-3">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-25" />
              <p className="font-medium text-fg-2">No registrations yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-alt">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-fg-3 uppercase tracking-wide">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-fg-3 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-fg-3 uppercase tracking-wide">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg, i) => (
                    <tr
                      key={reg.id}
                      className={`border-b border-border last:border-0 hover:bg-surface-alt transition-colors ${i % 2 === 0 ? '' : 'bg-surface-alt/30'}`}
                    >
                      <td className="px-5 py-3.5 font-medium text-fg">{reg.user_email || '—'}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={reg.status} />
                      </td>
                      <td className="px-5 py-3.5 text-fg-3">{formatDate(reg.registered_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
