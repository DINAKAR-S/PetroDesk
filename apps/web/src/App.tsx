import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { useShiftsStore } from '@/store/shiftsStore'
// useAuthStore.logout is invoked in DataLoader if the persisted user disappears.
import LoginPage from '@/pages/auth/LoginPage'
import RoleSelectorPage from '@/pages/auth/RoleSelectorPage'
import AppLayout from '@/components/layout/AppLayout'
import OwnerDashboard from '@/pages/dashboard/OwnerDashboard'
import ManagerDashboard from '@/pages/dashboard/ManagerDashboard'
import SalesmanDashboard from '@/pages/dashboard/SalesmanDashboard'
import SettingsPage from '@/pages/settings/SettingsPage'
import ShiftsPage from '@/pages/shifts/ShiftsPage'
import ReportsPage from '@/pages/reports/ReportsPage'

function DataLoader() {
  const { loadAll, users } = useAppStore()
  const { loadShifts, loadDeliveries, loadExpenses } = useShiftsStore()
  const { currentUser, isAuthenticated, logout } = useAuthStore()

  useEffect(() => {
    loadAll()
    loadShifts()
    loadDeliveries()
    loadExpenses()
  }, [loadAll, loadShifts, loadDeliveries, loadExpenses])

  // Stale-auth detection: after data loads, if the persisted user no longer
  // exists in the staff list (e.g. DB was wiped), force a clean logout so we
  // land on /login fresh instead of breaking on a phantom user id.
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return
    if (users.length === 0) return // still loading
    const stillExists = users.some((u) => u.id === currentUser.id)
    if (!stillExists) logout()
  }, [users, currentUser, isAuthenticated, logout])

  return null
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function DashboardRoute() {
  const currentUser = useAuthStore((s) => s.currentUser)
  if (currentUser?.role === 'owner') return <OwnerDashboard />
  if (currentUser?.role === 'manager') return <ManagerDashboard />
  return <SalesmanDashboard />
}

export default function App() {
  return (
    <BrowserRouter>
      <DataLoader />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/select-role" element={<RoleSelectorPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardRoute />} />
          <Route path="shifts" element={<ShiftsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="inventory" element={<Navigate to="/shifts" replace />} />
          <Route path="staff" element={<Navigate to="/settings" replace />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
