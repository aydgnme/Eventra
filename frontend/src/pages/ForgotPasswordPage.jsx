import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Mail, ArrowLeft, Loader2, CheckCircle2, Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { authService } from '../services/authService'

const inputCls =
  'w-full px-4 py-3 rounded-xl bg-surface border border-border text-fg placeholder-fg-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all'

export default function ForgotPasswordPage() {
  useDocumentTitle('Forgot Password')
  const { theme, toggle } = useTheme()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.forgotPassword(email.trim())
    } catch {
      // Always show success to prevent email enumeration
    } finally {
      setLoading(false)
      setSent(true)
    }
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
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg text-fg">Eventra</span>
        </div>

        {sent ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-fg mb-2">Check your inbox</h2>
            <p className="text-fg-2 text-sm leading-relaxed mb-6">
              If an account exists for <strong className="text-fg">{email}</strong>,
              we&apos;ve sent a password reset link. It expires in 1 hour.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-link hover:text-brand-500 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-fg">Reset your password</h2>
              <p className="text-fg-2 text-sm">
                Enter the email address associated with your account and we&apos;ll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-fg-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@usv.ro"
                    className={`${inputCls} pl-10`}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white text-sm font-semibold transition-all shadow-lg shadow-brand-500/20"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <p className="text-center text-sm text-fg-3">
              Remember your password?{' '}
              <Link to="/login" className="text-link hover:text-brand-500 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
