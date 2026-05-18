import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Calendar, LogOut, Menu, X, ChevronDown, Sun, Moon, UserCircle, Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { usePendingEvents } from '../hooks/useAdmin'
import { useNotifications, useMarkRead, useMarkAllRead } from '../hooks/useNotifications'

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { data } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const notifications = data?.notifications ?? []
  const unread = data?.unread_count ?? 0

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleOpen(note) {
    if (!note.is_read) markRead.mutate(note.id)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-80 bg-surface border border-border rounded-xl shadow-xl z-20 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-fg">Notifications</span>
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-brand-500 hover:text-brand-400 font-medium transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-10 text-fg-3 text-sm">No notifications</div>
              ) : (
                notifications.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => handleOpen(note)}
                    className={`px-4 py-3 border-b border-border/50 last:border-0 cursor-pointer transition-colors hover:bg-surface-alt ${
                      !note.is_read ? 'bg-brand-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!note.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                      )}
                      <div className={!note.is_read ? '' : 'ml-3.5'}>
                        <p className="text-sm text-fg leading-snug">{note.message}</p>
                        <p className="text-xs text-fg-3 mt-1">{timeAgo(note.sent_at)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const { data: pendingData } = usePendingEvents({ enabled: user?.role === 'admin' })
  const pendingCount = pendingData?.events?.length ?? 0

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const publicLinks = [
    { to: '/events', label: 'Events' },
    { to: '/calendar', label: 'Calendar' },
    { to: '/about', label: 'About' },
  ]

  const roleLinks =
    user?.role === 'organizer'
      ? [{ to: '/organizer', label: 'My Dashboard' }]
      : user?.role === 'admin'
      ? [{ to: '/admin', label: 'Admin Panel' }]
      : user
      ? [{ to: '/dashboard', label: 'Dashboard' }]
      : []

  const navLinks = [...publicLinks, ...roleLinks]

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-menu">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/events" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-base text-white tracking-tight">Eventra</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.to)
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              }`}
            >
              {link.label}
              {link.to === '/admin' && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notification bell — logged-in users */}
          {user && <NotificationBell />}

          {/* User dropdown */}
          {user ? (
            <div className="relative hidden md:block">
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
              >
                <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {(user.full_name || user.email || '?')[0].toUpperCase()}
                </div>
                <span className="max-w-28 truncate">
                  {user.full_name || user.email}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-48 bg-surface border border-border rounded-xl shadow-lg z-20 py-1">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-xs font-medium text-fg truncate">
                        {user.full_name || user.email}
                      </p>
                      <p className="text-xs text-fg-3 capitalize">{user.role}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-fg-2 hover:text-fg hover:bg-surface-alt transition-colors"
                    >
                      <UserCircle className="w-3.5 h-3.5" />
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-fg-2 hover:text-fg hover:bg-surface-alt transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden md:inline-flex px-3 py-1.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              Sign in
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-menu border-t border-white/10 px-4 py-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.to)
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white transition-colors mt-1 border-t border-white/10 pt-3"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          )}
          {!user && (
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white transition-colors mt-1 border-t border-white/10 pt-3"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  )
}
