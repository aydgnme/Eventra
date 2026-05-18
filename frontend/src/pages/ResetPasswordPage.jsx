import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Calendar, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { authService } from '../services/authService'

const inputCls =
  'w-full px-4 py-3 rounded-xl bg-surface border border-border text-fg placeholder-fg-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all'

export default function ResetPasswordPage() {
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await authService.resetPassword(token, form.password)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-fg-2 mb-4">Invalid or missing reset token.</p>
          <Link to="/forgot-password" className="text-link hover:text-brand-500 text-sm font-medium">
            Request a new reset link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-12">
      <button
        onClick={toggle}
        className="fixed top-4 right-4 z-20 p-2 rounded-lg bg-surface border border-border text-fg-2 hover:text-fg transition-colors shadow-sm"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg text-fg">Eventra</span>
        </div>

        {done ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-fg mb-2">Password reset complete</h2>
            <p className="text-fg-2 text-sm leading-relaxed mb-6">
              Your password has been changed. You can now sign in with your new password.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold transition-all shadow-lg shadow-brand-500/20"
            >
              Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-fg">Set new password</h2>
              <p className="text-fg-2 text-sm">
                Your new password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 digit.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-fg-2">New Password</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => { setForm((p) => ({ ...p, password: e.target.value })); setError(null) }}
                    placeholder="••••••••"
                    className={`${inputCls} pr-11`}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg-2 transition-colors"
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-fg-2">Confirm Password</label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => { setForm((p) => ({ ...p, confirm: e.target.value })); setError(null) }}
                  placeholder="Re-enter password"
                  className={inputCls}
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white text-sm font-semibold transition-all shadow-lg shadow-brand-500/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
