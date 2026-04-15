import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useToast } from '../context/ToastContext'
import { eventService } from '../services/eventService'

const CATEGORIES = ['academic', 'sport', 'career', 'volunteer', 'cultural']
const MODES = ['physical', 'online', 'hybrid']

const inputCls =
  'w-full px-3 py-2.5 rounded-lg bg-surface-alt border border-border text-fg placeholder-fg-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all'

function Field({ label, required, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-fg-2 uppercase tracking-wide">
        {label}{required && ' *'}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

function toLocalInput(isoString) {
  if (!isoString) return ''
  return isoString.slice(0, 16)
}

export default function EditEventPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventService.getEvent(id),
    staleTime: 0,
  })

  const event = data?.event

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm({ defaultValues: {} })

  // Populate form when event loads
  if (event && !watch('title')) {
    reset({
      title: event.title ?? '',
      description: event.description ?? '',
      start_datetime: toLocalInput(event.start_datetime),
      end_datetime: toLocalInput(event.end_datetime),
      location: event.location ?? '',
      category: event.category ?? 'academic',
      participation_mode: event.participation_mode ?? 'physical',
      capacity: event.capacity ?? '',
      registration_deadline: '',
      link_registration: event.link_registration ?? '',
      is_published: event.is_published ?? false,
      sponsors: [],
    })
  }

  const { fields: sponsorFields, append: addSponsor, remove: removeSponsor } = useFieldArray({
    control,
    name: 'sponsors',
  })

  const startDatetime = watch('start_datetime')

  const updateMutation = useMutation({
    mutationFn: (payload) => eventService.updateEvent(id, payload),
    onSuccess: () => {
      addToast('Event updated successfully!', 'success')
      navigate('/organizer')
    },
    onError: (err) => addToast(err.message, 'error'),
  })

  function onSubmit(values) {
    const payload = {
      ...values,
      capacity: values.capacity ? Number(values.capacity) : null,
      registration_deadline: values.registration_deadline || null,
      link_registration: values.link_registration || null,
    }
    updateMutation.mutate(payload)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <div className="flex items-center justify-center py-20 text-fg-3">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading event…
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <p className="text-fg-2">Event not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/organizer')}
            className="p-2 rounded-lg text-fg-3 hover:text-fg hover:bg-surface-alt transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-fg">Edit Event</h1>
            <p className="text-fg-3 text-sm truncate max-w-sm">{event.title}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic info */}
          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-fg text-sm uppercase tracking-wide">Basic Information</h2>

            <Field label="Title" required error={errors.title?.message}>
              <input
                {...register('title', {
                  required: 'Title is required',
                  maxLength: { value: 255, message: 'Max 255 characters' },
                })}
                placeholder="Event title"
                className={inputCls}
              />
            </Field>

            <Field label="Description" required error={errors.description?.message}>
              <textarea
                {...register('description', { required: 'Description is required' })}
                rows={4}
                placeholder="What is this event about?"
                className={`${inputCls} resize-none`}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Category" required error={errors.category?.message}>
                <select {...register('category', { required: true })} className={inputCls}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Participation Mode" required error={errors.participation_mode?.message}>
                <select {...register('participation_mode', { required: true })} className={inputCls}>
                  {MODES.map((m) => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* Date & Location */}
          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-fg text-sm uppercase tracking-wide">Date & Location</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Start Date & Time" required error={errors.start_datetime?.message}>
                <input
                  type="datetime-local"
                  {...register('start_datetime', { required: 'Start date is required' })}
                  className={inputCls}
                />
              </Field>
              <Field label="End Date & Time" required error={errors.end_datetime?.message}>
                <input
                  type="datetime-local"
                  {...register('end_datetime', {
                    required: 'End date is required',
                    validate: (v) =>
                      !startDatetime || v > startDatetime || 'End must be after start',
                  })}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Location" required error={errors.location?.message}>
              <input
                {...register('location', { required: 'Location is required' })}
                placeholder="Room / building / online URL"
                className={inputCls}
              />
            </Field>
          </div>

          {/* Capacity & Registration */}
          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-fg text-sm uppercase tracking-wide">Capacity & Registration</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Capacity" error={errors.capacity?.message}>
                <input
                  type="number"
                  min="1"
                  {...register('capacity', { min: { value: 1, message: 'Minimum 1' } })}
                  placeholder="Leave empty for unlimited"
                  className={inputCls}
                />
              </Field>
              <Field label="Registration Deadline" error={errors.registration_deadline?.message}>
                <input type="datetime-local" {...register('registration_deadline')} className={inputCls} />
              </Field>
            </div>

            <Field label="External Registration Link" error={errors.link_registration?.message}>
              <input
                type="url"
                {...register('link_registration', {
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: 'Must be a valid URL',
                  },
                })}
                placeholder="https://..."
                className={inputCls}
              />
            </Field>
          </div>

          {/* Sponsors */}
          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-fg text-sm uppercase tracking-wide">Sponsors</h2>
              <button
                type="button"
                onClick={() => addSponsor({ name: '', logo_url: '' })}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-dashed border-brand-500/50 text-brand-500 hover:bg-brand-500/5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Sponsor
              </button>
            </div>
            {sponsorFields.length === 0 ? (
              <p className="text-fg-3 text-sm text-center py-3">No sponsors added</p>
            ) : (
              <div className="space-y-3">
                {sponsorFields.map((field, index) => (
                  <div key={field.id} className="flex gap-3 items-start p-3 bg-surface-alt rounded-lg border border-border">
                    <div className="flex-1 space-y-2">
                      <input {...register(`sponsors.${index}.name`)} placeholder="Sponsor name" className={inputCls} />
                      <input {...register(`sponsors.${index}.logo_url`)} placeholder="Logo URL" className={inputCls} />
                    </div>
                    <button type="button" onClick={() => removeSponsor(index)} className="p-2 rounded-lg text-fg-3 hover:text-red-500 hover:bg-red-500/10 transition-colors mt-0.5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Publish */}
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" {...register('is_published')} className="w-4 h-4 accent-brand-500" />
              <div>
                <span className="font-medium text-fg text-sm">Published</span>
                <p className="text-fg-3 text-xs mt-0.5">Visible to all students</p>
              </div>
            </label>
          </div>

          {updateMutation.isError && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {updateMutation.error?.message}
            </div>
          )}

          <div className="flex justify-end gap-3 pb-6">
            <button type="button" onClick={() => navigate('/organizer')} className="px-5 py-2.5 text-sm rounded-lg text-fg-2 hover:text-fg hover:bg-surface border border-border transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={updateMutation.isPending} className="flex items-center gap-2 px-6 py-2.5 text-sm rounded-lg bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-medium transition-colors shadow-sm">
              {updateMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
