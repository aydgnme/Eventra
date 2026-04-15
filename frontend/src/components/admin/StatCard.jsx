import { TrendingUp, TrendingDown } from 'lucide-react'

/**
 * StatCard
 * Props: icon (Lucide component or emoji string), label, value, trend (number, optional), loading
 */
export default function StatCard({ icon: Icon, label, value, trend, loading }) {
  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5 animate-pulse">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-surface-alt" />
          {trend !== undefined && <div className="w-14 h-5 rounded-full bg-surface-alt" />}
        </div>
        <div className="h-8 w-24 bg-surface-alt rounded mb-2" />
        <div className="h-4 w-32 bg-surface-alt rounded" />
      </div>
    )
  }

  const isPositiveTrend = trend !== undefined && trend >= 0

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
          {typeof Icon === 'string' ? (
            <span className="text-lg">{Icon}</span>
          ) : Icon ? (
            <Icon className="w-5 h-5 text-brand-500" />
          ) : null}
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            isPositiveTrend
              ? 'bg-green-500/10 text-green-500'
              : 'bg-red-500/10 text-red-500'
          }`}>
            {isPositiveTrend
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />
            }
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-fg mb-1">
        {value ?? 0}
      </p>
      <p className="text-sm text-fg-3">{label}</p>
    </div>
  )
}
