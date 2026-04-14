import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff, Calendar, ArrowRight, Loader2, AlertCircle, X, Sun, Moon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { getOAuthGoogleUrl } from '../lib/api'

export default function LoginPage() {
  const { login } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState(null)
  const [modal, setModal] = useState(searchParams.get('oauth_error') || null)
  const [registered] = useState(searchParams.get('registered') === '1')
  const [form, setForm] = useState({ email: '', password: '' })

  const handleChange = (e) => {
    setFormError(null)
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setFormError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = getOAuthGoogleUrl()
  }

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="fixed top-4 right-4 z-20 p-2 rounded-lg bg-surface border border-border text-fg-2 hover:text-fg transition-colors shadow-sm"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* ── OAuth error modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative w-full max-w-sm bg-surface border border-border rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setModal(null)}
              className="absolute top-4 right-4 text-fg-3 hover:text-fg-2 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-semibold text-fg">Sign-in failed</h3>
            </div>
            <p className="text-fg-2 text-sm leading-relaxed mb-6">{modal}</p>
            <button
              onClick={() => setModal(null)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-alt hover:bg-border text-fg text-sm font-medium transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ── Left panel — USV brand gradient ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-600 via-navy-800 to-brand-700" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-usv-blue/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold text-xl tracking-tight">Eventra</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <p className="text-usv-blue text-sm font-medium uppercase tracking-widest">
              Universitatea Ștefan cel Mare din Suceava
            </p>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Plan events that
              <br />
              <span className="text-usv-blue">people remember.</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed max-w-sm">
              Manage registrations, tickets, and attendees — all in one place.
            </p>
          </div>
          <div className="flex gap-8 pt-2">
            {[
              { value: '12k+', label: 'Events hosted' },
              { value: '98%', label: 'Satisfaction' },
              { value: '200+', label: 'Organizers' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-usv-blue/70 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-white/40 text-sm">
          &copy; {new Date().getFullYear()} Eventra · USV. All rights reserved.
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg text-fg">Eventra</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-fg">Welcome back</h2>
            <p className="text-fg-2 text-sm">Sign in to your account to continue</p>
          </div>

          {registered && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm">
              <span className="shrink-0">✓</span>
              Account created! You can now sign in.
            </div>
          )}

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-surface text-fg text-sm font-medium hover:bg-surface-alt transition-all duration-200"
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <p className="text-center text-xs text-fg-3">
            USV students and official staff accounts can sign in with Google.
          </p>

          <Divider />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-fg-2">
                Email address
              </label>
              <input
                id="email" name="email" type="email" autoComplete="email" required
                value={form.email} onChange={handleChange} placeholder="you@usv.ro"
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-fg-2">
                  Password
                </label>
                <a href="#" className="text-xs text-link hover:text-brand-500 transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password" name="password" type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password" required
                  value={form.password} onChange={handleChange} placeholder="••••••••"
                  className={`${inputCls} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg-2 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-brand-500/20 group mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-fg-3">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-link hover:text-brand-500 font-medium transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'w-full px-4 py-3 rounded-xl bg-surface border border-border text-fg placeholder-fg-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200'

function Divider() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-fg-3 font-medium">or</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
