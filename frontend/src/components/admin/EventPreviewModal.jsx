import { X, Calendar, MapPin, Users, User, Mail, Tag, Monitor } from 'lucide-react'

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
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/**
 * EventPreviewModal
 * Props: event, onClose, onValidate, onReject
 */
export default function EventPreviewModal({ event, onClose, onValidate, onReject }) {
  if (!event) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface border-b border-border px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-fg truncate">{event.title}</h2>
            <p className="text-xs text-fg-3 mt-0.5">Event Preview</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg-3 hover:text-fg hover:bg-surface-alt transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {event.category && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${CATEGORY_BADGE[event.category] ?? 'bg-surface-alt text-fg-2 border-border'}`}>
                <Tag className="w-3 h-3 inline mr-1" />
                {event.category}
              </span>
            )}
            {event.participation_mode && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${MODE_BADGE[event.participation_mode] ?? 'bg-surface-alt text-fg-2 border-border'}`}>
                <Monitor className="w-3 h-3 inline mr-1" />
                {event.participation_mode}
              </span>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <h3 className="text-xs font-semibold text-fg-3 uppercase tracking-wide mb-2">Description</h3>
              <p className="text-sm text-fg-2 leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Organizer */}
          <div className="bg-surface-alt border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-fg-3 uppercase tracking-wide mb-3">Organizer</h3>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {(event.organizer_name || event.organizer_email || '?')[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-fg-3" />
                  <span className="text-sm text-fg font-medium">{event.organizer_name || '—'}</span>
                </div>
                {event.organizer_email && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-fg-3" />
                    <span className="text-xs text-fg-3">{event.organizer_email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold text-fg-3 uppercase tracking-wide mb-2">Start Date</h3>
              <div className="flex items-center gap-2 text-sm text-fg-2">
                <Calendar className="w-4 h-4 text-fg-3 shrink-0" />
                <span>{formatDate(event.start_datetime)}</span>
              </div>
            </div>
            {event.end_datetime && (
              <div>
                <h3 className="text-xs font-semibold text-fg-3 uppercase tracking-wide mb-2">End Date</h3>
                <div className="flex items-center gap-2 text-sm text-fg-2">
                  <Calendar className="w-4 h-4 text-fg-3 shrink-0" />
                  <span>{formatDate(event.end_datetime)}</span>
                </div>
              </div>
            )}
            {event.location && (
              <div>
                <h3 className="text-xs font-semibold text-fg-3 uppercase tracking-wide mb-2">Location</h3>
                <div className="flex items-center gap-2 text-sm text-fg-2">
                  <MapPin className="w-4 h-4 text-fg-3 shrink-0" />
                  <span>{event.location}</span>
                </div>
              </div>
            )}
            {event.capacity && (
              <div>
                <h3 className="text-xs font-semibold text-fg-3 uppercase tracking-wide mb-2">Capacity</h3>
                <div className="flex items-center gap-2 text-sm text-fg-2">
                  <Users className="w-4 h-4 text-fg-3 shrink-0" />
                  <span>{event.capacity} attendees</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-surface border-t border-border px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-border text-fg-2 hover:text-fg hover:bg-surface-alt text-sm font-medium transition-colors"
          >
            Close
          </button>
          <button
            onClick={onReject}
            className="flex-1 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 text-sm font-medium transition-colors"
          >
            Reject
          </button>
          <button
            onClick={onValidate}
            className="flex-1 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 text-sm font-medium transition-colors"
          >
            Validate
          </button>
        </div>
      </div>
    </div>
  )
}
