import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function OAuthCallbackPage() {
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()
  const didRun = useRef(false)

  useEffect(() => {
    if (didRun.current) return
    didRun.current = true

    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (!token) {
      navigate('/login?error=oauth_failed', { replace: true })
      return
    }

    loginWithToken(token)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => navigate('/login?error=oauth_failed', { replace: true }))
  }, [loginWithToken, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-4 text-fg-2">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-sm">Signing you in…</p>
      </div>
    </div>
  )
}
