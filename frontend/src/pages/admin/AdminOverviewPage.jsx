import { useNavigate } from 'react-router-dom'
import {
  Calendar, Users, Star, TrendingUp, AlertTriangle, ArrowRight,
  CheckCircle, XCircle, UserCheck, UserX, Trash2, Shield, EyeOff,
  Activity,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import { useReportSummary, usePendingEvents, useAuditLogs } from '../../hooks/useAdmin'
import StatCard from '../../components/admin/StatCard'

const ACTION_CONFIG = {
  validate_event:   { label: 'Validated event',    icon: CheckCircle, color: 'text-green-500',  bg: 'bg-green-500/10' },
  reject_event:     { label: 'Rejected event',     icon: XCircle,     color: 'text-red-500',    bg: 'bg-red-500/10' },
  publish_event:    { label: 'Published event',    icon: CheckCircle, color: 'text-green-500',  bg: 'bg-green-500/10' },
  unpublish_event:  { label: 'Unpublished event',  icon: EyeOff,      color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  activate_user:    { label: 'Activated user',     icon: UserCheck,   color: 'text-green-500',  bg: 'bg-green-500/10' },
  deactivate_user:  { label: 'Deactivated user',   icon: UserX,       color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  delete_user:      { label: 'Deleted user',       icon: Trash2,      color: 'text-red-500',    bg: 'bg-red-500/10' },
  update_role:      { label: 'Updated role',       icon: Shield,      color: 'text-blue-500',   bg: 'bg-blue-500/10' },
}

function timeAgo(dt) {
  if (!dt) return '—'
  const diff = Date.now() - new Date(dt).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function AuditLogSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="w-8 h-8 rounded-lg bg-surface-alt shrink-0" />
          <div className="flex-1">
            <div className="h-4 bg-surface-alt rounded w-2/3 mb-1.5" />
            <div className="h-3 bg-surface-alt rounded w-1/3" />
          </div>
          <div className="h-3 bg-surface-alt rounded w-12" />
        </div>
      ))}
    </div>
  )
}

export default function AdminOverviewPage() {
  useDocumentTitle('Admin Dashboard')
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: summary, isLoading: summaryLoading } = useReportSummary()
  const { data: pendingData } = usePendingEvents()
  const { data: auditData, isLoading: auditLoading } = useAuditLogs({ per_page: 10 })

  const stats = summary ?? {}
  const trends = stats.trends ?? {}
  const pendingCount = pendingData?.events?.length ?? 0
  const logs = auditData?.logs ?? []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg">
          Welcome back, {user?.full_name || user?.email || 'Admin'}
        </h1>
        <p className="text-fg-3 text-sm mt-1">Here's an overview of your platform</p>
      </div>

      {/* Pending events alert */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between gap-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
            <p className="text-sm font-medium text-fg">
              {pendingCount} {pendingCount === 1 ? 'event is' : 'events are'} waiting for validation
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/validation')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500 text-white text-sm font-medium hover:bg-yellow-600 transition-colors shrink-0"
          >
            Review Now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Calendar}
          label="Total Events"
          value={stats.total_events ?? 0}
          trend={trends.events_vs_last_month}
          loading={summaryLoading}
        />
        <StatCard
          icon={Users}
          label="Total Registrations"
          value={stats.total_registrations ?? 0}
          trend={trends.registrations_vs_last_month}
          loading={summaryLoading}
        />
        <StatCard
          icon={Star}
          label="Avg Rating"
          value={stats.average_rating != null ? Number(stats.average_rating).toFixed(1) : '—'}
          loading={summaryLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="Active Organizers"
          value={stats.active_organizers ?? 0}
          trend={trends.organizers_vs_last_month}
          loading={summaryLoading}
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-fg flex items-center gap-2">
            <Activity className="w-4 h-4 text-fg-3" />
            Recent Activity
          </h2>
          {logs.length > 0 && (
            <span className="text-xs text-fg-3">{auditData?.total ?? logs.length} total actions</span>
          )}
        </div>

        {auditLoading ? (
          <AuditLogSkeleton />
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-fg-3">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => {
              const cfg = ACTION_CONFIG[log.action] ?? {
                label: log.action,
                icon: Activity,
                color: 'text-fg-3',
                bg: 'bg-surface-alt',
              }
              const ActionIcon = cfg.icon
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-surface-alt/50 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <ActionIcon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-fg">
                      {cfg.label}
                      {log.target_id && (
                        <span className="text-fg-3"> #{log.target_id}</span>
                      )}
                      {log.detail && (
                        <span className="text-fg-3 ml-1">— {log.detail}</span>
                      )}
                    </p>
                    <p className="text-xs text-fg-3 capitalize">{log.target_type}</p>
                  </div>
                  <span className="text-xs text-fg-3 shrink-0 whitespace-nowrap">
                    {timeAgo(log.created_at)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
