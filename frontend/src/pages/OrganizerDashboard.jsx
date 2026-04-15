import { useCallback, useEffect, useState } from 'react'
import {
  Calendar, Pencil, Plus, Trash2, X,
  Loader2, AlertCircle, Users, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { eventsApi, registrationsApi } from '../lib/api'
import Navbar from '../components/Navbar'

const CATEGORIES = ['academic', 'sport', 'career', 'volunteer', 'cultural']
const MODES = ['physical', 'online', 'hybrid']

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'academic',
  participation_mode: 'physical',
  location: '',
  capacity: '',
  start_datetime: '',
  end_datetime: '',
  is_published: true,
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_BADGE = {
  registered: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25',
  waitlisted: 'bg-usv-gold/15 text-amber-700 dark:text-usv-gold border border-usv-gold/25',
  cancelled:  'bg-surface-alt text-fg-3 border border-border',
}

// ---------------------------------------------------------------------------
// Attendees Modal
// ---------------------------------------------------------------------------
function AttendeesModal({ event, onClose }) {
  const [registrations, setRegistrations] = useState([])
  const [count, setCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [regData, countData] = await Promise.all([
          registrationsApi.eventRegistrations(event.id),
          registrationsApi.eventCount(event.id),
        ])
        setRegistrations(regData.registrations ?? [])
        setCount(countData)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [event.id])

  const capacity = event.capacity
  const registered = count?.registered ?? 0
  const waitlisted = count?.waitlisted ?? 0
  const pct = capacity ? Math.min(100, Math.round((registered / capacity) * 100)) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h2 className="font-semibold text-lg text-fg truncate">{event.title}</h2>
            <p className="text-xs text-fg-3 mt-0.5">Attendees</p>
          </div>
          <button onClick={onClose} className="text-fg-3 hover:text-fg-2 transition-colors ml-3 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Capacity stats */}
        {!loading && !error && count && (
          <div className="px-6 py-4 border-b border-border shrink-0 space-y-3">
            {capacity ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-fg-2">Capacity</span>
                  <span className="font-semibold text-fg">{registered} / {capacity}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : 'bg-brand-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <span className="text-fg-2">Registered</span>
                <span className="font-semibold text-fg">{registered} (unlimited)</span>
              </div>
            )}
            {waitlisted > 0 && (
              <p className="text-xs text-amber-600 dark:text-usv-gold">
                {waitlisted} {waitlisted === 1 ? 'person' : 'people'} on waitlist
              </p>
            )}
          </div>
        )}

        {/* List */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-fg-3">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading…
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-500 text-sm py-6">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-10 text-fg-3 text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No registrations yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {registrations.map((reg) => (
                <div
                  key={reg.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-surface-alt border border-border"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{reg.user_email}</p>
                    <p className="text-xs text-fg-3 mt-0.5">{formatDate(reg.registered_at)}</p>
                  </div>
                  <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_BADGE[reg.status] ?? ''}`}>
                    {reg.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export default function OrganizerDashboard() {
  useAuth()

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [attendeesEvent, setAttendeesEvent] = useState(null)

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
      participation_mode: event.participation_mode ?? 'physical',
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

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Navbar />

      <main className="px-6 py-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-fg">My Events</h1>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Event
          </button>
        </div>

        {loading ? (
          <div className="text-fg-3 text-sm">Loading…</div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-fg-3">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No events yet. Create your first one!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-border bg-surface px-5 py-4 flex items-start justify-between gap-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-fg truncate">{event.title}</h2>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                      event.is_published
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : 'bg-surface-alt text-fg-2 border border-border'
                    }`}>
                      {event.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-xs text-fg-3">
                    {formatDate(event.start_datetime)}
                    {event.location ? ` · ${event.location}` : ''}
                    {event.capacity ? ` · ${event.capacity} spots` : ' · Unlimited'}
                    {event.category ? ` · ${event.category}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Attendees button */}
                  <button
                    onClick={() => setAttendeesEvent(event)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-fg-2 hover:text-fg hover:bg-surface-alt border border-border transition-colors"
                    title="View attendees"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Attendees
                    <ChevronRight className="w-3 h-3 opacity-50" />
                  </button>
                  <button
                    onClick={() => openEdit(event)}
                    className="p-2 rounded-lg text-fg-2 hover:text-fg hover:bg-surface-alt transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(event.id)}
                    className="p-2 rounded-lg text-fg-2 hover:text-red-500 hover:bg-red-500/10 transition-colors"
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

      {/* Attendees Modal */}
      {attendeesEvent && (
        <AttendeesModal
          event={attendeesEvent}
          onClose={() => setAttendeesEvent(null)}
        />
      )}

      {/* Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-lg text-fg">{editing ? 'Edit Event' : 'New Event'}</h2>
              <button onClick={closeForm} className="text-fg-3 hover:text-fg-2 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Field label="Title *">
                <input name="title" required value={form.title} onChange={handleChange}
                  placeholder="Event title" className={inputCls} />
              </Field>

              <Field label="Description">
                <textarea name="description" rows={3} value={form.description} onChange={handleChange}
                  placeholder="What is this event about?" className={inputCls} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Category *">
                  <select name="category" value={form.category} onChange={handleChange} className={inputCls}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Mode *">
                  <select name="participation_mode" value={form.participation_mode} onChange={handleChange} className={inputCls}>
                    {MODES.map((m) => (
                      <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Location">
                  <input name="location" value={form.location} onChange={handleChange}
                    placeholder="Room / building / URL" className={inputCls} />
                </Field>
                <Field label="Capacity">
                  <input name="capacity" type="number" min="1" value={form.capacity} onChange={handleChange}
                    placeholder="Unlimited" className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Start *">
                  <input name="start_datetime" type="datetime-local" required value={form.start_datetime}
                    onChange={handleChange} className={inputCls} />
                </Field>
                <Field label="End *">
                  <input name="end_datetime" type="datetime-local" required value={form.end_datetime}
                    onChange={handleChange} className={inputCls} />
                </Field>
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" name="is_published" checked={form.is_published}
                  onChange={handleChange} className="w-4 h-4 accent-brand-500" />
                <span className="text-sm text-fg-2">Publish immediately</span>
              </label>

              {formError && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm}
                  className="px-4 py-2 text-sm rounded-lg text-fg-2 hover:text-fg hover:bg-surface-alt transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm rounded-lg bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-medium transition-colors">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editing ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative w-full max-w-sm bg-surface border border-border rounded-2xl p-6 shadow-2xl">
            <h3 className="font-semibold text-lg mb-2 text-fg">Delete Event?</h3>
            <p className="text-fg-2 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm rounded-lg text-fg-2 hover:text-fg hover:bg-surface-alt transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-fg placeholder-fg-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all'

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-fg-2 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}
