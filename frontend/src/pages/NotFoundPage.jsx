import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-7xl font-bold text-brand mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-fg mb-2">Page Not Found</h2>
        <p className="text-fg-2 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface hover:bg-surface-alt text-fg-2 hover:text-fg text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand/90 text-sm font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
