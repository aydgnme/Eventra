import { useNavigate } from 'react-router-dom'
import { MapPin, Clock, Users } from 'lucide-react'

const CATEGORY_STYLES = {
  academic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  sport: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  career: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  volunteer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  cultural: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
}

const MODE_STYLES = {
  physical: 'bg-surface-alt text-fg-2 border border-border',
  online: 'bg-usv-blue/10 text-usv-blue border border-usv-blue/20',
  hybrid: 'bg-usv-gold/10 text-amber-700 dark:text-usv-gold border border-usv-gold/20',
}

function formatDate(dt) {
  if (!dt) return null
  const d = new Date(dt)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function SpotsIndicator({ capacity, registeredCount }) {
  if (!capacity) return null
  const remaining = capacity - (registeredCount || 0)
  const pct = registeredCount / capacity

  if (remaining <= 0) {
    return <span className="text-xs font-medium text-red-600 dark:text-red-400">Full</span>
  }

  const colorClass =
    pct >= 0.9
      ? 'text-red-600 dark:text-red-400'
      : pct >= 0.5
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-emerald-600 dark:text-emerald-400'

  return (
    <span className={`text-xs font-medium flex items-center gap-1 ${colorClass}`}>
      <Users className="w-3 h-3" />
      {remaining} / {capacity} spots
    </span>
  )
}

export default function EventCard({
  id,
  title,
  start_datetime,
  location,
  category,
  participation_mode,
  capacity,
  registered_count,
}) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/events/${id}`)}
      className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-brand-500/30 transition-all cursor-pointer group"
    >
      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {category && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${CATEGORY_STYLES[category] ?? 'bg-surface-alt text-fg-3'}`}>
            {category}
          </span>
        )}
        {participation_mode && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${MODE_STYLES[participation_mode] ?? 'bg-surface-alt text-fg-3 border border-border'}`}>
            {participation_mode}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-fg leading-snug line-clamp-2 group-hover:text-brand-500 transition-colors mb-3">
        {title}
      </h3>

      {/* Meta */}
      <div className="flex flex-col gap-1.5">
        {start_datetime && (
          <div className="flex items-center gap-1.5 text-xs text-fg-3">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {formatDate(start_datetime)}
          </div>
        )}
        {location && (
          <div className="flex items-center gap-1.5 text-xs text-fg-3">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}
      </div>

      {/* Spots */}
      {capacity != null && (
        <div className="mt-3 pt-3 border-t border-border">
          <SpotsIndicator capacity={capacity} registeredCount={registered_count} />
        </div>
      )}
    </div>
  )
}
