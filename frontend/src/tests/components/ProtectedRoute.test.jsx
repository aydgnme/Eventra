import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'

// Mock useAuth
const mockAuth = { user: null, loading: false }
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

function renderRoute(props = {}) {
  return render(
    <MemoryRouter>
      <ProtectedRoute {...props}>
        <div>Protected Content</div>
      </ProtectedRoute>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('shows spinner when auth is loading', () => {
    mockAuth.user = null
    mockAuth.loading = true
    const { container } = renderRoute()
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('redirects to login when user is not authenticated', () => {
    mockAuth.user = null
    mockAuth.loading = false
    renderRoute()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when user is authenticated', () => {
    mockAuth.user = { role: 'student', email: 'test@test.com' }
    mockAuth.loading = false
    renderRoute()
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('renders children when user has required role', () => {
    mockAuth.user = { role: 'admin', email: 'admin@test.com' }
    mockAuth.loading = false
    renderRoute({ roles: ['admin'] })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to unauthorized when user lacks required role', () => {
    mockAuth.user = { role: 'student', email: 'student@test.com' }
    mockAuth.loading = false
    renderRoute({ roles: ['admin'] })
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('allows access when user role is in roles array', () => {
    mockAuth.user = { role: 'organizer', email: 'org@test.com' }
    mockAuth.loading = false
    renderRoute({ roles: ['organizer', 'admin'] })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})
