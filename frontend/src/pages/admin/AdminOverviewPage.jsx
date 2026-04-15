import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Calendar, Users, Star, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import adminService from '../../services/adminService'
import StatCard from '../../components/admin/StatCard'

export default function AdminOverviewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin', 'report-summary'],
    queryFn: adminService.getReportSummary,
    staleTime: 60_000,
  })

  const { data: pendingData } = useQuery({
    queryKey: ['admin', 'pending-events'],
    queryFn: adminService.getPendingEvents,
    staleTime: 30_000,
  })

  const stats = summary ?? {}
  const pendingCount = pendingData?.events?.length ?? 0

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

      {/* Recent activity */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="font-semibold text-fg mb-4">Recent Activity</h2>
        <div className="text-center py-8 text-fg-3">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No recent activity</p>
        </div>
      </div>
    </div>
  )
}
