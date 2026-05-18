/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

const TOKEN_KEY = 'eventra_token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY))

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return
    authService
      .getMe()
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  function saveSession(token, userData) {
    localStorage.setItem(TOKEN_KEY, token)
    setUser(userData)
  }

  async function login(email, password) {
    const data = await authService.login(email, password)
    saveSession(data.access_token, data.user)
    return data.user
  }

  function loginWithToken(token) {
    localStorage.setItem(TOKEN_KEY, token)
    // Fetch user info with the new token
    return authService.getMe().then((data) => {
      setUser(data.user)
      return data.user
    })
  }

  function logout() {
    authService.logout()
    setUser(null)
  }

  function updateUser(userData) {
    setUser(userData)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithToken, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
