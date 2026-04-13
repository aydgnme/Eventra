import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  Edit2,
  ExternalLink,
  FileText,
  Image,
  LogOut,
  Paperclip,
  Plus,
  PresentationIcon,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { eventsApi, materialsApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['academic', 'sport', 'career', 'volunteer', 'cultural']
const MODES = ['physical', 'online', 'hybrid']

const EMPTY_FORM = {
  title: '',
  description: '',
  start_datetime: '',
  end_datetime: '',
  location: '',
  category: '',
  participation_mode: '',
  capacity: '',
  link_registration: '',
  is_published: false,
}

function toLocalInput(iso) {
  if (!iso) return ''
  return iso.slice(0, 16)
}

function toISOString(localInput) {
  if (!localInput) return undefined
  return new Date(localInput).toISOString()
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const FILE_ICONS = {
  pdf: <FileText className="w-4 h-4 text-red-400" />,
  image: <Image className="w-4 h-4 text-blue-400" />,
  presentation: <PresentationIcon className="w-4 h-4 text-orange-400" />,
}

// ---------------------------------------------------------------------------
// Event Form (create / edit)
// ---------------------------------------------------------------------------

function EventForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(
    initial
      ? {
          ...initial,
          start_datetime: toLocalInput(initial.start_datetime),
          end_datetime: toLocalInput(initial.end_datetime),
          category: initial.category ?? '',
          participation_mode: initial.participation_mode ?? '',
          capacity: initial.capacity ?? '',
          link_registration: initial.link_registration ?? '',
        }
      : { ...EMPTY_FORM }
  )
  const [error, setError] = useState(null)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const payload = {
      title: form.title,
      description: form.description || undefined,
      start_datetime: toISOString(form.start_datetime),
      end_datetime: toISOString(form.end_datetime),
      location: form.location || undefined,
      category: form.category || undefined,
      participation_mode: form.participation_mode || undefined,
      capacity: form.capacity ? parseInt(form.capacity, 10) : undefined,
      link_registration: form.link_registration || undefined,
      is_published: form.is_published,
    }
    try {
      await onSave(payload)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-400 mb-1">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            required
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            placeholder="Event title"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Start <span className="text-red-400">*</span>
          </label>
          <input
            required
            type="datetime-local"
            value={form.start_datetime}
            onChange={(e) => set('start_datetime', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            End <span className="text-red-400">*</span>
          </label>
          <input
            required
            type="datetime-local"
            value={form.end_datetime}
            onChange={(e) => set('end_datetime', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Location</label>
          <input
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            placeholder="e.g. Main Hall, Room 101"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Capacity</label>
          <input
            type="number"
            min="1"
            value={form.capacity}
            onChange={(e) => set('capacity', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            placeholder="Max attendees"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Category</label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">None</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Mode</label>
          <select
            value={form.participation_mode}
            onChange={(e) => set('participation_mode', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">None</option>
            {MODES.map((m) => (
              <option key={m} value={m}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-400 mb-1">Registration link</label>
          <input
            type="url"
            value={form.link_registration}
            onChange={(e) => set('link_registration', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            placeholder="https://..."
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-400 mb-1">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none"
            placeholder="Event description…"
          />
        </div>

        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            id="is_published"
            type="checkbox"
            checked={form.is_published}
            onChange={(e) => set('is_published', e.target.checked)}
            className="w-4 h-4 accent-indigo-500"
          />
          <label htmlFor="is_published" className="text-sm text-slate-300">
            Publish immediately
          </label>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? 'Saving…' : initial ? 'Save changes' : 'Create event'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Materials panel for one event
// ---------------------------------------------------------------------------

function MaterialsPanel({ eventId }) {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    materialsApi
      .list(eventId)
      .then((d) => setMaterials(d.materials))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [eventId])

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const data = await materialsApi.upload(eventId, file)
      setMaterials((prev) => [...prev, data.material])
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(materialId) {
    try {
      await materialsApi.remove(eventId, materialId)
      setMaterials((prev) => prev.filter((m) => m.id !== materialId))
    } catch (e) {
      setError(e.message)
    }
  }

  if (loading)
    return (
      <div className="py-3 flex justify-center">
        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )

  return (
    <div className="pt-2 space-y-2">
      {error && (
        <p className="text-xs text-red-400 px-1">{error}</p>
      )}

      {materials.length === 0 ? (
        <p className="text-xs text-slate-500 px-1">No materials uploaded yet.</p>
      ) : (
        <div className="space-y-1">
          {materials.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg group"
            >
              {FILE_ICONS[m.file_type] ?? <Paperclip className="w-4 h-4 text-slate-400" />}
              <span className="flex-1 text-xs text-slate-200 truncate">{m.file_name}</span>
              <span className="text-xs text-slate-500">{formatBytes(m.file_size)}</span>
              <a
                href={materialsApi.downloadUrl(eventId, m.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-200 transition-all"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => handleDelete(m.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.gif,.pptx,.ppt"
          onChange={handleUpload}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Uploading…' : 'Upload file'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Event row card
// ---------------------------------------------------------------------------

function EventRow({ event, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${event.title}"?`)) return
    setDeleting(true)
    await onDelete(event.id)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${
                event.is_published
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {event.is_published ? 'Published' : 'Draft'}
            </span>
            {event.category && (
              <span className="text-xs text-slate-500">{event.category}</span>
            )}
          </div>
          <h3 className="font-medium text-slate-100 mt-1 truncate">{event.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{formatDate(event.start_datetime)}</p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Link
            to={`/events/${event.id}`}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="View"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
          <button
            onClick={() => onEdit(event)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 disabled:opacity-40 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Materials"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-800 px-4 py-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Materials
          </p>
          <MaterialsPanel eventId={event.id} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function OrganizerDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [panel, setPanel] = useState(null) // null | 'create' | event-object (edit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    eventsApi
      .mine()
      .then((d) => setEvents(d.events))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  async function handleSave(payload) {
    setSaving(true)
    try {
      if (panel === 'create') {
        const data = await eventsApi.create(payload)
        setEvents((prev) => [data.event, ...prev])
      } else {
        const data = await eventsApi.update(panel.id, payload)
        setEvents((prev) => prev.map((e) => (e.id === panel.id ? data.event : e)))
      }
      setPanel(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    await eventsApi.remove(id)
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  const published = events.filter((e) => e.is_published).length
  const drafts = events.length - published

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg">Eventra</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">{user?.full_name ?? user?.email}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="px-6 py-8 max-w-4xl mx-auto">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Events</h1>
            {!loading && (
              <p className="text-sm text-slate-400 mt-0.5">
                {events.length} total · {published} published · {drafts} draft{drafts !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={() => setPanel('create')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New event
          </button>
        </div>

        {/* Create / Edit panel */}
        {panel !== null && (
          <div className="mb-6 bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">
                {panel === 'create' ? 'Create new event' : `Edit: ${panel.title}`}
              </h2>
              <button
                onClick={() => setPanel(null)}
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <EventForm
              initial={panel === 'create' ? null : panel}
              onSave={handleSave}
              onCancel={() => setPanel(null)}
              loading={saving}
            />
          </div>
        )}

        {/* Event list */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="mb-3">No events yet.</p>
            <button
              onClick={() => setPanel('create')}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Create your first event →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((e) => (
              <EventRow
                key={e.id}
                event={e}
                onEdit={(ev) => setPanel(ev)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
