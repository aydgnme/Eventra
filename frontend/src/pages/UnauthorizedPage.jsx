import { useNavigate } from 'react-router-dom'
import { ShieldX } from 'lucide-react'

export default function UnauthorizedPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-fg mb-2">Access Denied</h1>
        <p className="text-fg-2 text-sm mb-6 leading-relaxed">
          You don&apos;t have permission to view this page. Please contact an administrator if you believe this is a mistake.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-lg border border-border text-fg-2 hover:text-fg hover:bg-surface-alt text-sm font-medium transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={() => navigate('/events', { replace: true })}
            className="px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium transition-colors"
          >
            Go to Events
          </button>
        </div>
      </div>
    </div>
  )
}
