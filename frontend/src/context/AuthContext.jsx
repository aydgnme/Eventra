import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../lib/api'

const AuthContext = createContext(null)

const TOKEN_KEY = 'eventra_token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    authApi
      .me()
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  function saveSession(token, userData) {
    localStorage.setItem(TOKEN_KEY, token)
    setUser(userData)
  }

  async function login(email, password) {
    const data = await authApi.login(email, password)
    saveSession(data.access_token, data.user)
    return data.user
  }

  function loginWithToken(token) {
    localStorage.setItem(TOKEN_KEY, token)
    // Fetch user info with the new token
    return authApi.me().then((data) => {
      setUser(data.user)
      return data.user
    })
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
