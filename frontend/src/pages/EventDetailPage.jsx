import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Image,
  LogOut,
  MapPin,
  Paperclip,
  QrCode,
  Users,
} from 'lucide-react'
import QRCode from 'qrcode'
import { eventsApi, materialsApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const CATEGORY_COLORS = {
  academic: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  sport: 'bg-green-500/20 text-green-300 border-green-500/30',
  career: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  volunteer: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  cultural: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
}

const MODE_LABELS = {
  physical: '📍 Physical',
  online: '🌐 Online',
  hybrid: '🔀 Hybrid',
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function downloadICS(event) {
  function fmtDT(iso) {
    return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace('T', 'T') + 'Z'
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Eventra//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `DTSTART:${fmtDT(event.start_datetime)}`,
    `DTEND:${fmtDT(event.end_datetime)}`,
    `SUMMARY:${event.title}`,
    `UID:eventra-${event.id}@eventra.app`,
  ]

  if (event.description) {
    lines.push(`DESCRIPTION:${event.description.replace(/[\r\n]+/g, '\\n')}`)
  }
  if (event.location) {
    lines.push(`LOCATION:${event.location}`)
  }
  if (event.link_registration) {
    lines.push(`URL:${event.link_registration}`)
  }

  lines.push('END:VEVENT', 'END:VCALENDAR')

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const FILE_ICONS = {
  pdf: <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />,
  image: <Image className="w-4 h-4 text-blue-400 flex-shrink-0" />,
  presentation: <FileText className="w-4 h-4 text-orange-400 flex-shrink-0" />,
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function MaterialsList({ eventId }) {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    materialsApi
      .list(eventId)
      .then((d) => setMaterials(d.materials))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [eventId])

  if (loading || materials.length === 0) return null

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
        Materials
      </h2>
      <div className="space-y-2">
        {materials.map((m) => (
          <a
            key={m.id}
            href={materialsApi.downloadUrl(eventId, m.id)}
            className="flex items-center gap-3 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors group"
          >
            {FILE_ICONS[m.file_type] ?? <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />}
            <span className="flex-1 text-sm text-slate-200 truncate">{m.file_name}</span>
            <span className="text-xs text-slate-500">{formatBytes(m.file_size)}</span>
            <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors flex-shrink-0" />
          </a>
        ))}
      </div>
    </div>
  )
}

function QRCodeDisplay({ data }) {
  const canvasRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!canvasRef.current || !data) return
    QRCode.toCanvas(canvasRef.current, data, {
      width: 200,
      margin: 2,
      color: { dark: '#f1f5f9', light: '#0f172a' },
    }).catch((e) => setError(e.message))
  }, [data])

  if (error) return <p className="text-xs text-red-400">Failed to generate QR code</p>

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={canvasRef} className="rounded-lg" />
      <p className="text-xs text-slate-500 text-center max-w-[200px] break-all">{data}</p>
    </div>
  )
}

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    eventsApi
      .get(id)
      .then((data) => setEvent(data.event))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const qrData = event?.qr_code || (event ? `${window.location.origin}/events/${event.id}` : null)

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
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </button>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
          </div>
        ) : !event ? null : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {event.category && (
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                        CATEGORY_COLORS[event.category] ?? 'bg-slate-700 text-slate-300 border-slate-600'
                      }`}
                    >
                      {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                    </span>
                  )}
                  {event.participation_mode && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                      {MODE_LABELS[event.participation_mode] ?? event.participation_mode}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold leading-tight">{event.title}</h1>
              </div>

              {event.description && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                    About
                  </h2>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              )}

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                  Details
                </h2>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {formatDateTime(event.start_datetime)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ends · {formatDateTime(event.end_datetime)}
                    </p>
                  </div>
                </div>

                {event.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <p className="text-sm text-slate-200">{event.location}</p>
                  </div>
                )}

                {event.capacity && (
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <p className="text-sm text-slate-200">Capacity: {event.capacity} people</p>
                  </div>
                )}
              </div>

              <MaterialsList eventId={event.id} />

              {event.link_registration && (
                <a
                  href={event.link_registration}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Register for this event
                </a>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* ICS Export */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                  Add to Calendar
                </h2>
                <button
                  onClick={() => downloadICS(event)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download .ics
                </button>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Compatible with Google Calendar, Apple Calendar & Outlook
                </p>
              </div>

              {/* QR Code */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-4 h-4 text-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                    QR Code
                  </h2>
                </div>
                <QRCodeDisplay data={qrData} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
