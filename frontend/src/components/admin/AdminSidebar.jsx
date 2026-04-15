import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, Users, BarChart3, X, Calendar } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/validation', label: 'Validation', icon: CheckSquare },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
]

/**
 * AdminSidebar
 * Props: pendingCount, isOpen (mobile), onClose
 */
export default function AdminSidebar({ pendingCount = 0, isOpen, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40 w-60 bg-surface border-r border-border flex flex-col
          transition-transform duration-200
          md:relative md:translate-x-0 md:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-sm">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-fg text-sm leading-none">Admin Panel</p>
              <p className="text-xs text-fg-3 mt-0.5">Eventra</p>
            </div>
          </div>
          {/* Mobile close */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-fg-3 hover:text-fg hover:bg-surface-alt transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => onClose?.()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-500 border-l-2 border-brand-500 pl-[10px]'
                    : 'text-fg-2 hover:text-fg hover:bg-surface-alt'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {label === 'Validation' && pendingCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
