import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { FullPageState } from './components/ui/FullPageState'
import { ConfigProvider } from './context/ConfigContext'
import { RequireSession, SessionProvider } from './context/SessionContext'
import { ToastProvider } from './context/ToastContext'

// Route-level code splitting keeps the initial bundle small.
const LoginPage = lazy(() => import('./features/auth/LoginPage'))
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'))
const MyWorkPage = lazy(() => import('./features/work/MyWorkPage'))
const ProjectsPage = lazy(() => import('./features/projects/ProjectsPage'))
const ProjectDetailPage = lazy(() => import('./features/projects/ProjectDetailPage'))
const CalendarPage = lazy(() => import('./features/meetings/CalendarPage'))
const MeetingsPage = lazy(() => import('./features/meetings/MeetingsPage'))
const AdminPage = lazy(() => import('./features/admin/AdminPage'))

export default function App() {
  return (
    <ToastProvider>
      <ConfigProvider>
        <SessionProvider>
          <Suspense fallback={<FullPageState title="df-pmp" message="Loading…" busy />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <RequireSession>
                    <AppShell />
                  </RequireSession>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="my-work" element={<MyWorkPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/:id" element={<ProjectDetailPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="meetings" element={<MeetingsPage />} />
                <Route
                  path="admin"
                  element={
                    <RequireSession permission="user:manage">
                      <AdminPage />
                    </RequireSession>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </SessionProvider>
      </ConfigProvider>
    </ToastProvider>
  )
}
