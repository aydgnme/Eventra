import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import Toast from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const OrganizerDashboard = lazy(() => import('./pages/OrganizerDashboard'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const MyRegistrationsPage = lazy(() => import('./pages/MyRegistrationsPage'))
const EventListPage = lazy(() => import('./pages/EventListPage'))
const EventDetailPage = lazy(() => import('./pages/EventDetailPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const CreateEventPage = lazy(() => import('./pages/CreateEventPage'))
const EditEventPage = lazy(() => import('./pages/EditEventPage'))
const ParticipantsPage = lazy(() => import('./pages/ParticipantsPage'))
const MaterialsPage = lazy(() => import('./pages/MaterialsPage'))
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminOverviewPage = lazy(() => import('./pages/admin/AdminOverviewPage'))
const EventValidationPage = lazy(() => import('./pages/admin/EventValidationPage'))
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'))
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function PageLoader() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function PublicRoute({ children }) {
  return children
}

export default function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Landing */}
                <Route path="/" element={<OnboardingPage />} />

                {/* Public auth routes */}
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

                {/* Unauthorized */}
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                {/* Public event routes */}
                <Route path="/events" element={<EventListPage />} />
                <Route path="/events/:id" element={<EventDetailPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/about" element={<AboutPage />} />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-registrations"
                  element={
                    <ProtectedRoute>
                      <MyRegistrationsPage />
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
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              </Suspense>
              <Toast />
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  )
}
