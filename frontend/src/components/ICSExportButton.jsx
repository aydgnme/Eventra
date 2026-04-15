import { CalendarPlus } from 'lucide-react'

function formatICSDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

export default function ICSExportButton({ event, className = '' }) {
  function handleExport() {
    const start = formatICSDate(event.start_datetime)
    const end = formatICSDate(event.end_datetime)
    const title = (event.title || 'Event').replace(/[,;]/g, ' ')
    const description = (event.description || '').replace(/\n/g, '\\n').replace(/[,;]/g, ' ')
    const location = (event.location || '').replace(/[,;]/g, ' ')

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Eventra//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${title}`,
      description ? `DESCRIPTION:${description}` : '',
      location ? `LOCATION:${location}` : '',
      `UID:event-${event.id}@eventra`,
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .filter(Boolean)
      .join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(event.title || 'event').replace(/\s+/g, '-').toLowerCase()}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface hover:bg-surface-alt text-fg-2 hover:text-fg text-sm font-medium transition-colors ${className}`}
    >
      <CalendarPlus className="w-4 h-4" />
      Add to Calendar
    </button>
  )
}
