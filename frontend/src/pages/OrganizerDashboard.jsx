import { useCallback, useEffect, useState } from 'react'
import { Calendar, LogOut, Pencil, Plus, Trash2, X, Loader2, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { eventsApi } from '../lib/api'

const CATEGORIES = ['academic', 'sport', 'career', 'volunteer', 'cultural']
const MODES = ['in-person', 'online', 'hybrid']

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'academic',
  mode: 'in-person',
  location: '',
  capacity: '',
  start_datetime: '',
  end_datetime: '',
  is_published: false,
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function OrganizerDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)   // event object being edited
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [deleteId, setDeleteId] = useState(null)  // confirm dialog

  const load = useCallback(async () => {
    try {
      const data = await eventsApi.mine()
      setEvents(data.events ?? [])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(event) {
    setEditing(event)
    setForm({
      title: event.title ?? '',
      description: event.description ?? '',
      category: event.category ?? 'academic',
      mode: event.mode ?? 'in-person',
      location: event.location ?? '',
      capacity: event.capacity ?? '',
      start_datetime: event.start_datetime ? event.start_datetime.slice(0, 16) : '',
      end_datetime: event.end_datetime ? event.end_datetime.slice(0, 16) : '',
      is_published: event.is_published ?? false,
    })
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setFormError(null)
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    setFormError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    const payload = {
      ...form,
      capacity: form.capacity === '' ? null : Number(form.capacity),
    }
    try {
      if (editing) {
        const data = await eventsApi.update(editing.id, payload)
        setEvents((evs) => evs.map((ev) => (ev.id === editing.id ? data.event : ev)))
      } else {
        const data = await eventsApi.create(payload)
        setEvents((evs) => [data.event, ...evs])
      }
      closeForm()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await eventsApi.remove(id)
      setEvents((evs) => evs.filter((ev) => ev.id !== id))
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleteId(null)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg">Eventra</span>
          <span className="text-slate-500 text-sm ml-1">/ Organizer</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            All Events
          </button>
          <span className="text-sm text-slate-400">
            {user?.full_name ?? user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="px-6 py-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Events</h1>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Event
          </button>
        </div>

        {loading ? (
          <div className="text-slate-500 text-sm">Loading…</div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No events yet. Create your first one!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold truncate">{event.title}</h2>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                      event.is_published
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {event.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatDate(event.start_datetime)}
                    {event.location ? ` · ${event.location}` : ''}
                    {event.capacity ? ` · ${event.capacity} spots` : ''}
                    {event.category ? ` · ${event.category}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(event)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(event.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Event Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="font-semibold text-lg">{editing ? 'Edit Event' : 'New Event'}</h2>
              <button onClick={closeForm} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <Field label="Title *">
                <input
                  name="title" required value={form.title} onChange={handleChange}
                  placeholder="Event title"
                  className={inputCls}
                />
              </Field>

              {/* Description */}
              <Field label="Description">
                <textarea
                  name="description" rows={3} value={form.description} onChange={handleChange}
                  placeholder="What is this event about?"
                  className={inputCls}
                />
              </Field>

              {/* Category + Mode */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category *">
                  <select name="category" value={form.category} onChange={handleChange} className={inputCls}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Mode *">
                  <select name="mode" value={form.mode} onChange={handleChange} className={inputCls}>
                    {MODES.map((m) => (
                      <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Location + Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Location">
                  <input
                    name="location" value={form.location} onChange={handleChange}
                    placeholder="Room / building / URL"
                    className={inputCls}
                  />
                </Field>
                <Field label="Capacity">
                  <input
                    name="capacity" type="number" min="1" value={form.capacity} onChange={handleChange}
                    placeholder="Unlimited"
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start *">
                  <input
                    name="start_datetime" type="datetime-local" required value={form.start_datetime} onChange={handleChange}
                    className={inputCls}
                  />
                </Field>
                <Field label="End *">
                  <input
                    name="end_datetime" type="datetime-local" required value={form.end_datetime} onChange={handleChange}
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Publish */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox" name="is_published" checked={form.is_published} onChange={handleChange}
                  className="w-4 h-4 accent-indigo-500"
                />
                <span className="text-sm text-slate-300">Publish immediately</span>
              </label>

              {formError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} className="px-4 py-2 text-sm rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editing ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <h3 className="font-semibold text-lg mb-2">Delete Event?</h3>
            <p className="text-slate-400 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all'

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}
