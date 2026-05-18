import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import adminService from '../../services/adminService'
import { useToast } from '../../context/ToastContext'

const MIN_REASON_LENGTH = 20

/**
 * RejectModal
 * Props: event, onClose, onSuccess
 */
export default function RejectModal({ event, onClose, onSuccess }) {
  const { addToast } = useToast()
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!event) return null

  const isValid = reason.trim().length >= MIN_REASON_LENGTH

  async function handleConfirm() {
    if (!isValid) {
      setError(`Reason must be at least ${MIN_REASON_LENGTH} characters.`)
      return
    }
    setLoading(true)
    setError('')
    try {
      await adminService.rejectEvent(event.id, reason.trim())
      addToast('Event rejected successfully', 'info')
      onSuccess()
    } catch (err) {
      addToast(err.message || 'Failed to reject event', 'error')
      setError(err.message || 'Failed to reject event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="font-bold text-fg">Reject Event</h2>
              <p className="text-xs text-fg-3">This action will notify the organizer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg-3 hover:text-fg hover:bg-surface-alt transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-fg-2 mb-4">
            You are rejecting: <span className="font-semibold text-fg">"{event.title}"</span>
          </p>

          <div>
            <label className="block text-sm font-medium text-fg mb-1.5">
              Rejection reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError('') }}
              rows={4}
              placeholder="Explain why this event is being rejected (min. 20 characters)..."
              className="w-full px-3 py-2.5 rounded-lg bg-surface-alt border border-border text-fg placeholder-fg-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all resize-none"
            />
            <div className="flex items-center justify-between mt-1.5">
              {error ? (
                <p className="text-xs text-red-500">{error}</p>
              ) : (
                <p className="text-xs text-fg-3">
                  {reason.length < MIN_REASON_LENGTH
                    ? `${MIN_REASON_LENGTH - reason.length} more characters needed`
                    : 'Reason is sufficient'}
                </p>
              )}
              <span className={`text-xs ${reason.length >= MIN_REASON_LENGTH ? 'text-green-500' : 'text-fg-3'}`}>
                {reason.length} chars
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg border border-border text-fg-2 hover:text-fg hover:bg-surface-alt text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid || loading}
            className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Rejecting...' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  )
}
