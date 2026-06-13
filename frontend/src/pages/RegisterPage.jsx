import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Calendar, ArrowRight, Loader2, AlertCircle, User, Sun, Moon, Shield } from 'lucide-react'
import { authService } from '../services/authService'
import { useTheme } from '../context/ThemeContext'
import useDocumentTitle from '../hooks/useDocumentTitle'

function deriveRole(email) {
  return email.endsWith('@student.usv.ro') ? 'student' : 'organizer'
}

export default function RegisterPage() {
  useDocumentTitle('Sign Up')
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState(null)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm_password: '' })
  const role = deriveRole(form.email)

  const handleChange = (e) => {
    setFormError(null)
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    if (form.password !== form.confirm_password) {
      setFormError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    if (role === 'student') {
      setFormError('Student accounts must be created via Google OAuth. Please use "Sign in with Google" on the login page.')
      return
    }
    setLoading(true)
    try {
      await authService.register(form.email, form.password, form.full_name, role)
      navigate('/login?registered=1', { replace: true })
    } catch (err) {
      setFormError(err.message)
    } finally {
      setLoading(false)
    }
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
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold text-xl tracking-tight">Eventra</span>
          </div>
          <div className="relative w-48 h-48 mx-auto">
            <div className="absolute inset-0 rounded-full bg-white/5 animate-pulse" />
            <div className="absolute inset-6 rounded-full bg-white/8 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <User className="w-16 h-16 text-white/40" />
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <p className="text-usv-blue text-sm font-medium uppercase tracking-widest">
              Universitatea Ștefan cel Mare din Suceava
            </p>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Empower Your
              <br />
              <span className="text-usv-blue">Academic Journey.</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed max-w-sm">
              Create an account to start organizing events that drive innovation and community at USV.
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
            <h2 className="text-2xl font-bold text-fg">Create your account</h2>
            <p className="text-fg-2 text-sm">Fill in the details below to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name / Organization name */}
            <div className="space-y-1.5">
              <label htmlFor="full_name" className="block text-sm font-medium text-fg-2">
                {role === 'organizer' ? 'Organization Name' : 'Full Name'}
              </label>
              <div className="relative">
                <input
                  id="full_name" name="full_name" type="text" autoComplete="name" required
                  value={form.full_name} onChange={handleChange}
                  placeholder={role === 'organizer' ? 'USV Science Club' : 'Jane Doe'}
                  className={`${inputCls} pl-11`}
                />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-fg-2">Email address</label>
              <input
                id="email" name="email" type="email" autoComplete="email" required
                value={form.email} onChange={handleChange} placeholder="you@usv.ro"
                className={inputCls}
              />
            </div>

            {/* Role — derived from email */}
            {form.email && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-navy-800 border border-navy-700 text-sm shadow-inner">
                <Shield className="w-4 h-4 text-usv-blue shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] text-fg-3 uppercase font-bold tracking-widest leading-none mb-1">Account Type</p>
                  <p className={role === 'student' ? 'text-usv-blue font-bold' : 'text-usv-gold font-bold'}>
                    {role === 'student' ? 'USV Student' : 'Event Organizer'}
                  </p>
                </div>
                <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[10px] text-fg-3 font-medium">Auto-detected</span>
              </div>
            )}

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-fg-2">Password</label>
              <div className="relative">
                <input
                  id="password" name="password" type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password" required
                  value={form.password} onChange={handleChange} placeholder="Min. 8 characters"
                  className={`${inputCls} pr-11`}
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg-2 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label htmlFor="confirm_password" className="block text-sm font-medium text-fg-2">Confirm password</label>
              <div className="relative">
                <input
                  id="confirm_password" name="confirm_password" type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password" required
                  value={form.confirm_password} onChange={handleChange} placeholder="••••••••"
                  className={`${inputCls} pr-11`}
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg-2 transition-colors"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-brand-500/20 group mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-fg-3">
            Already have an account?{' '}
            <Link to="/login" className="text-link hover:text-brand-500 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'w-full px-4 py-3 rounded-xl bg-surface border border-border text-fg placeholder-fg-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200'
