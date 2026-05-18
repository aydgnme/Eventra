import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  User, Mail, Shield, Pencil, Check, X, Loader2, Lock, Eye, EyeOff, AlertCircle,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { authService } from '../services/authService'

const inputCls =
  'w-full px-4 py-3 rounded-xl bg-surface-alt border border-border text-fg placeholder-fg-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  // ── Edit name ────────────────────────────
  const [editing, setEditing] = useState(false)
  const [nameVal, setNameVal] = useState(user?.full_name ?? '')

  const nameMutation = useMutation({
    mutationFn: (full_name) => authService.updateProfile({ full_name }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      addToast('Profile updated successfully.', 'success')
      setEditing(false)
      if (data.user) {
        updateUser(data.user)
      }
    },
    onError: (e) => addToast(e.message, 'error'),
  })

  // ── Change password ──────────────────────
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, newPw: false })
  const [pwError, setPwError] = useState(null)

  const pwMutation = useMutation({
    mutationFn: () => authService.changePassword(pwForm.current, pwForm.newPw),
    onSuccess: () => {
      addToast('Password changed successfully.', 'success')
      setPwForm({ current: '', newPw: '', confirm: '' })
      setPwError(null)
    },
    onError: (e) => setPwError(e.message),
  })

  const handlePwSubmit = (e) => {
    e.preventDefault()
    setPwError(null)
    if (pwForm.newPw.length < 8) {
      setPwError('Password must be at least 8 characters.')
      return
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setPwError('Passwords do not match.')
      return
    }
    pwMutation.mutate()
  }

  const isGoogleUser = user?.oauth_provider === 'google'

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-fg mb-8">Profile</h1>

        {/* Avatar + Info */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-brand-500/20">
              {(user?.full_name || user?.email || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameVal}
                    onChange={(e) => setNameVal(e.target.value)}
                    className={`${inputCls} !py-2`}
                    autoFocus
                  />
                  <button
                    onClick={() => nameMutation.mutate(nameVal.trim())}
                    disabled={!nameVal.trim() || nameMutation.isPending}
                    className="p-2 rounded-lg bg-brand-500 text-white hover:bg-brand-400 disabled:opacity-50 transition-colors"
                  >
                    {nameMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setNameVal(user?.full_name ?? '') }}
                    className="p-2 rounded-lg text-fg-3 hover:text-fg hover:bg-surface-alt transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-fg truncate">{user?.full_name}</h2>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1.5 rounded-lg text-fg-3 hover:text-fg hover:bg-surface-alt transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p className="text-sm text-fg-3 capitalize">{user?.role}</p>
            </div>
          </div>

          <div className="space-y-4">
            <InfoRow icon={Mail} label="Email" value={user?.email} />
            <InfoRow icon={Shield} label="Role" value={user?.role} capitalize />
            <InfoRow icon={User} label="Account" value={isGoogleUser ? 'Google OAuth' : 'Email & Password'} />
          </div>
        </div>

        {/* Change Password */}
        {!isGoogleUser && (
          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-surface-alt flex items-center justify-center">
                <Lock className="w-4 h-4 text-fg-2" />
              </div>
              <h3 className="font-semibold text-fg">Change Password</h3>
            </div>

            <form onSubmit={handlePwSubmit} className="space-y-4">
              <PasswordField
                label="Current Password"
                value={pwForm.current}
                onChange={(v) => { setPwForm((p) => ({ ...p, current: v })); setPwError(null) }}
                show={showPw.current}
                onToggle={() => setShowPw((p) => ({ ...p, current: !p.current }))}
              />
              <PasswordField
                label="New Password"
                value={pwForm.newPw}
                onChange={(v) => { setPwForm((p) => ({ ...p, newPw: v })); setPwError(null) }}
                show={showPw.newPw}
                onToggle={() => setShowPw((p) => ({ ...p, newPw: !p.newPw }))}
                placeholder="Min 8 chars, 1 upper, 1 lower, 1 digit"
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-fg-2">Confirm New Password</label>
                <input
                  type="password"
                  value={pwForm.confirm}
                  onChange={(e) => { setPwForm((p) => ({ ...p, confirm: e.target.value })); setPwError(null) }}
                  placeholder="Re-enter new password"
                  className={inputCls}
                  required
                />
              </div>

              {pwError && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {pwError}
                </div>
              )}

              <button
                type="submit"
                disabled={pwMutation.isPending || !pwForm.current || !pwForm.newPw || !pwForm.confirm}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                {pwMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Update Password
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

// eslint-disable-next-line no-unused-vars
function InfoRow({ icon: InfoIcon, label, value, capitalize }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <InfoIcon className="w-4 h-4 text-fg-3 shrink-0" />
      <span className="text-sm text-fg-3 w-20">{label}</span>
      <span className={`text-sm font-medium text-fg ${capitalize ? 'capitalize' : ''}`}>
        {value || '—'}
      </span>
    </div>
  )
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-fg-2">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '••••••••'}
          className={`${inputCls} pr-11`}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg-2 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
