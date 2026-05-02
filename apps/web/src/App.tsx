import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { useShiftsStore } from '@/store/shiftsStore'
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
  const { loadAll } = useAppStore()
  const { loadShifts, loadDeliveries, loadExpenses } = useShiftsStore()

  useEffect(() => {
    loadAll()
    loadShifts()
    loadDeliveries()
    loadExpenses()
  }, [loadAll, loadShifts, loadDeliveries, loadExpenses])

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
