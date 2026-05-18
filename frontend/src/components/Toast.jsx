import { createPortal } from 'react-dom'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { useToast } from '../context/ToastContext'

const STYLES = {
  success: {
    wrapper: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700',
    icon: 'text-emerald-500',
    text: 'text-emerald-800 dark:text-emerald-200',
    Icon: CheckCircle,
  },
  error: {
    wrapper: 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700',
    icon: 'text-red-500',
    text: 'text-red-800 dark:text-red-200',
    Icon: XCircle,
  },
  info: {
    wrapper: 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700',
    icon: 'text-blue-500',
    text: 'text-blue-800 dark:text-blue-200',
    Icon: Info,
  },
}

function ToastItem({ toast, onRemove }) {
  const style = STYLES[toast.type] ?? STYLES.info
  const { Icon } = style

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg min-w-64 max-w-sm animate-in slide-in-from-right-4 ${style.wrapper}`}
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${style.icon}`} />
      <p className={`text-sm font-medium flex-1 leading-snug ${style.text}`}>{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className={`shrink-0 opacity-60 hover:opacity-100 transition-opacity ${style.icon}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function Toast() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>,
    document.body
  )
}
