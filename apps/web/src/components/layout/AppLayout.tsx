import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const TITLES: Record<string, string> = {
  '/': 'Overview',
  '/shifts': 'Shifts',
  '/inventory': 'Inventory',
  '/staff': 'Staff',
  '/settings': 'Settings',
}

export default function AppLayout() {
  const location = useLocation()
  const title = TITLES[location.pathname] ?? 'PetroDisk'

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
