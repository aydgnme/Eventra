import { X, Loader2, AlertCircle, Download, CheckCircle2 } from 'lucide-react'
import { useTicket, useConfirmAttendance } from '../hooks/useRegistrations'
import { useToast } from '../context/ToastContext'

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function QRTicketModal({ eventId, onClose }) {
  const { addToast } = useToast()
  const { data, isLoading, error } = useTicket(eventId)
  const confirmMutation = useConfirmAttendance()

  function handleDownload() {
    if (!data?.qr_code) return
    const a = document.createElement('a')
    a.href = data.qr_code
    a.download = `ticket-event-${eventId}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function handleConfirm() {
    confirmMutation.mutate(eventId, {
      onSuccess: () => addToast('Attendance confirmed!', 'success'),
      onError: (err) => addToast(err.message || 'Failed to confirm', 'error'),
    })
  }

  const reg = data?.registration
  const event = data?.event
  const needsConfirmation = reg?.confirmation_sent_at && !reg?.confirmed_at

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-fg text-lg">Your Ticket</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-fg-3 hover:text-fg hover:bg-surface-alt transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-fg-3">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Generating ticket...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-500 text-sm py-8 justify-center">
              <AlertCircle className="w-4 h-4" />
              {error.message || 'Failed to load ticket'}
            </div>
          ) : (
            <>
              {/* Event info */}
              <div className="text-center mb-4">
                <p className="font-bold text-fg text-base">{event?.title}</p>
                <p className="text-fg-3 text-sm mt-0.5">{formatDate(event?.start_datetime)}</p>
                {event?.location && <p className="text-fg-3 text-xs mt-0.5">{event.location}</p>}
              </div>

              {/* Confirmation required banner */}
              {needsConfirmation && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4 text-center">
                  <p className="text-yellow-500 text-sm font-medium mb-2">Attendance confirmation required</p>
                  <button
                    onClick={handleConfirm}
                    disabled={confirmMutation.isPending || !!reg?.confirmed_at}
                    className="px-4 py-1.5 rounded-lg bg-yellow-500 text-white text-xs font-bold hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                  >
                    {confirmMutation.isPending ? 'Confirming...' : 'Confirm Attendance'}
                  </button>
                </div>
              )}

              {reg?.confirmed_at && (
                <div className="flex items-center justify-center gap-2 text-green-500 text-sm mb-4">
                  <CheckCircle2 className="w-4 h-4" />
                  Attendance confirmed
                </div>
              )}

              {/* QR Code */}
              {data?.qr_code && (
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-white p-3 rounded-xl shadow-sm">
                    <img
                      src={data.qr_code}
                      alt="QR ticket"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                  <p className="text-xs text-fg-3 text-center">
                    Present this QR code at the event entrance
                  </p>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-fg-2 hover:text-fg hover:bg-surface-alt text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Save QR
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
