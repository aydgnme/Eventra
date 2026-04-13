import { Calendar, LogOut, ArrowRight, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg">Eventra</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </header>

      <main className="px-6 py-12 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">
          Welcome, {user?.full_name ?? user?.email} 👋
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          Role: <span className="text-indigo-400 font-medium">{user?.role}</span>
        </p>

        <div className="space-y-3">
          <Link
            to="/events"
            className="flex items-center justify-between px-5 py-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="font-medium text-slate-100">Browse Events</p>
                <p className="text-xs text-slate-500">Search, filter, and explore events</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </Link>

          {(user?.role === 'organizer' || user?.role === 'admin') && (
            <Link
              to="/organizer"
              className="flex items-center justify-between px-5 py-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-100">Organizer Dashboard</p>
                  <p className="text-xs text-slate-500">Manage your events and materials</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
