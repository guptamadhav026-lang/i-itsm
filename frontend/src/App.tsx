import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { useAuth } from './auth/AuthContext'
import type { Role } from './api/types'
import { AppShell } from './layout/AppShell'
import { PageLoader } from './components/ui/misc'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { IncidentsPage } from './pages/IncidentsPage'
import { ReportIncidentPage } from './pages/ReportIncidentPage'
import { IncidentDetailPage } from './pages/IncidentDetailPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { AccountPage } from './pages/AccountPage'

// Admin-only screens (and the charts library they use) are downloaded only when an admin opens them,
// so employees and technicians get a smaller, faster app.
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const UsersPage = lazy(() => import('./pages/admin/UsersPage').then((m) => ({ default: m.UsersPage })))
const CatalogPage = lazy(() => import('./pages/admin/CatalogPage').then((m) => ({ default: m.CatalogPage })))
const SlaPoliciesPage = lazy(() => import('./pages/admin/SlaPoliciesPage').then((m) => ({ default: m.SlaPoliciesPage })))
const StrategiesPage = lazy(() => import('./pages/admin/StrategiesPage').then((m) => ({ default: m.StrategiesPage })))
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage').then((m) => ({ default: m.AuditLogPage })))

/** Which page is shown for which URL, and who may open it. */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="incidents/new" element={<RequireRole roles={['EMPLOYEE', 'ADMIN']}><ReportIncidentPage /></RequireRole>} />
        <Route path="incidents/:id" element={<IncidentDetailPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="reports" element={<RequireRole roles={['ADMIN']}><ReportsPage /></RequireRole>} />
        <Route path="admin/users" element={<RequireRole roles={['ADMIN']}><UsersPage /></RequireRole>} />
        <Route path="admin/catalog" element={<RequireRole roles={['ADMIN']}><CatalogPage /></RequireRole>} />
        <Route path="admin/sla" element={<RequireRole roles={['ADMIN']}><SlaPoliciesPage /></RequireRole>} />
        <Route path="admin/strategies" element={<RequireRole roles={['ADMIN']}><StrategiesPage /></RequireRole>} />
        <Route path="admin/audit" element={<RequireRole roles={['ADMIN']}><AuditLogPage /></RequireRole>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth()
  const location = useLocation()
  if (initializing) return <PageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return children
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth()
  if (initializing) return <PageLoader />
  return user ? <Navigate to="/" replace /> : children
}

/** Hides pages from roles that may not use them (the backend checks again with @PreAuthorize). */
function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth()
  if (!user || !roles.includes(user.role)) return <NotFoundPage forbidden />
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}
