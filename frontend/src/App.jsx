import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import Toast from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'

// Pages — existing (do not modify)
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'
import DashboardPage from './pages/DashboardPage'
import OrganizerDashboard from './pages/OrganizerDashboard'

// Pages — new
import EventListPage from './pages/EventListPage'
import EventDetailPage from './pages/EventDetailPage'
import CreateEventPage from './pages/CreateEventPage'
import EditEventPage from './pages/EditEventPage'
import ParticipantsPage from './pages/ParticipantsPage'
import MaterialsPage from './pages/MaterialsPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import {
  AdminDashboard,
  AdminOverviewPage,
  EventValidationPage,
  UserManagementPage,
  ReportsPage,
} from './pages/admin'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function PublicRoute({ children }) {
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* Public auth routes */}
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

                {/* Unauthorized */}
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                {/* Student / general routes */}
                <Route
                  path="/events"
                  element={
                    <ProtectedRoute>
                      <EventListPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/events/:id"
                  element={
                    <ProtectedRoute>
                      <EventDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />

                {/* Organizer routes */}
                <Route
                  path="/organizer"
                  element={
                    <ProtectedRoute roles={['organizer', 'admin']}>
                      <OrganizerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/events/create"
                  element={
                    <ProtectedRoute roles={['organizer', 'admin']}>
                      <CreateEventPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/events/:id/edit"
                  element={
                    <ProtectedRoute roles={['organizer', 'admin']}>
                      <EditEventPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/events/:id/participants"
                  element={
                    <ProtectedRoute roles={['organizer', 'admin']}>
                      <ParticipantsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/events/:id/materials"
                  element={
                    <ProtectedRoute roles={['organizer', 'admin']}>
                      <MaterialsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute roles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="validation" element={<EventValidationPage />} />
                  <Route path="users" element={<UserManagementPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/events" replace />} />
              </Routes>
              <Toast />
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
