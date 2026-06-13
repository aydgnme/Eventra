import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, Pencil, Plus, Trash2, X,
  Loader2, AlertCircle, Users, ChevronRight,
  Eye, BarChart3, MapPin, AlertTriangle,
} from 'lucide-react'
import { useMyEvents, useDeleteEvent } from '../hooks/useEvents'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useToast } from '../context/ToastContext'
import useDocumentTitle from '../hooks/useDocumentTitle'
import ConfirmModal from '../components/ConfirmModal'

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function OrganizerDashboard() {
  useDocumentTitle('My Events')
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading, error } = useMyEvents()
  const deleteMutation = useDeleteEvent()

  const events = data?.events ?? []

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Navbar />

      <main className="px-6 py-8 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-fg tracking-tight text-white">Organizer Dashboard</h1>
            <p className="text-fg-3 text-sm mt-1">Manage your events, materials, and participant lists</p>
          </div>
          <button
            onClick={() => navigate('/organizer/events/create')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-sm transition-all shadow-lg shadow-brand-500/20"
          >
            <Plus className="w-5 h-5" />
            Create New Event
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-surface border border-border rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500">
            <AlertCircle className="w-6 h-6" />
            <p className="font-medium">Failed to load events: {error.message}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-32 bg-surface border border-border rounded-3xl shadow-sm">
            <Calendar className="w-20 h-20 mx-auto mb-6 opacity-10 text-fg" />
            <h2 className="text-2xl font-bold text-fg">No events created yet</h2>
            <p className="text-fg-3 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
              Start your journey as an organizer by creating your first event for the USV community.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                onEdit={() => navigate(`/organizer/events/${event.id}/edit`)}
                onDelete={() => setDeleteTarget(event)}
                onParticipants={() => navigate(`/organizer/events/${event.id}/participants`)}
                onMaterials={() => navigate(`/organizer/events/${event.id}/materials`)}
                onPreview={() => navigate(`/events/${event.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Event"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? All registrations and data associated with this event will be permanently removed.`}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id, {
          onSuccess: () => { addToast('Event deleted successfully', 'info'); setDeleteTarget(null) },
          onError: (err) => addToast(err.message, 'error'),
        })}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete Event'}
        danger={true}
      />
      <Footer />
    </div>
  )
}

function StatusPill({ event }) {
  if (event.is_published) {
    return (
      <span className="shrink-0 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
        Published
      </span>
    )
  }
  if (event.review_status === 'rejected') {
    return (
      <span className="shrink-0 flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20" title={event.rejection_reason || 'Rejected by admin'}>
        Rejected
      </span>
    )
  }
  return (
    <span className="shrink-0 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
      Pending Review
    </span>
  )
}

function EventRow({ event, onEdit, onDelete, onParticipants, onMaterials, onPreview }) {
  return (
    <div className="group rounded-2xl border border-border bg-surface p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all hover:shadow-md hover:border-brand-500/20">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="font-bold text-fg text-lg truncate group-hover:text-brand-500 transition-colors">{event.title}</h2>
          <StatusPill event={event} />
          {event.category && (
             <span className="shrink-0 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-navy-800 text-usv-blue border border-navy-700">
               {event.category}
             </span>
          )}
        </div>
        {event.review_status === 'rejected' && (
          <div className="flex items-start gap-2 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              {event.rejection_reason && (
                <p className="text-xs text-red-300 leading-snug">{event.rejection_reason}</p>
              )}
              <p className="text-xs text-red-400/70 mt-0.5">Edit your event to resubmit for review.</p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-brand-500" />
            <span>{formatDate(event.start_datetime)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-500" />
              <span className="truncate max-w-xs">{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 font-medium">
            <Users className="w-4 h-4 text-brand-500" />
            <span>{event.capacity ? `${event.capacity} spots` : 'Unlimited capacity'}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="h-8 w-px bg-border hidden lg:block mx-2" />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onParticipants}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-alt border border-border text-xs font-bold text-fg-2 hover:text-fg hover:bg-border transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Participants
          </button>
          <button
            onClick={onMaterials}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-alt border border-border text-xs font-bold text-fg-2 hover:text-fg hover:bg-border transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Materials
          </button>
        </div>

        <div className="flex items-center gap-1 ml-auto lg:ml-0">
          <button
            onClick={onPreview}
            className="p-2.5 rounded-lg text-fg-3 hover:text-brand-500 hover:bg-brand-500/10 transition-colors"
            title="View public page"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={onEdit}
            className="p-2.5 rounded-lg text-fg-3 hover:text-brand-500 hover:bg-brand-500/10 transition-colors"
            title="Edit details"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2.5 rounded-lg text-fg-3 hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Delete event"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
