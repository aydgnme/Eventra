import { X, AlertTriangle } from 'lucide-react'

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = true }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-surface border border-border rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-fg-3 hover:text-fg-2 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-red-500/10' : 'bg-brand-500/10'}`}>
            <AlertTriangle className={`w-5 h-5 ${danger ? 'text-red-500' : 'text-brand-500'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-fg">{title}</h3>
            {message && <p className="text-fg-2 text-sm mt-1 leading-relaxed">{message}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg text-fg-2 hover:text-fg hover:bg-surface-alt transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-500' : 'bg-brand-500 hover:bg-brand-400'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
