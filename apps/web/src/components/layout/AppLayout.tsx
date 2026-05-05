import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileBottomNav from './MobileBottomNav'

const TITLES: Record<string, string> = {
  '/': 'Overview',
  '/shifts': 'Shifts',
  '/inventory': 'Inventory',
  '/staff': 'Staff',
  '/settings': 'Settings',
  '/reports': 'Reports',
}

export default function AppLayout() {
  const location = useLocation()
  const title = TITLES[location.pathname] ?? 'PetroDisk'
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)

  // Close the drawer on every route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!drawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [drawerOpen])

  const closeDrawer = (): void => setDrawerOpen(false)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar (hidden < md) */}
      <Sidebar />

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/40"
          />
          {/* Drawer panel */}
          <div className="relative h-full animate-in slide-in-from-left">
            <Sidebar mobile onClose={closeDrawer} onNavigate={closeDrawer} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} onOpenMenu={() => setDrawerOpen(true)} />
        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <MobileBottomNav />
    </div>
  )
}
