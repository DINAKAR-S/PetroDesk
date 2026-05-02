import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'

interface NavItem { label: string; icon: string; path: string }

const NAV_ITEMS: Record<Role, NavItem[]> = {
  owner: [
    { label: 'Dashboard', icon: 'home', path: '/' },
    { label: 'Shifts', icon: 'schedule', path: '/shifts' },
    { label: 'Reports', icon: 'bar_chart', path: '/reports' },
    { label: 'Settings', icon: 'settings', path: '/settings' },
  ],
  manager: [
    { label: 'Dashboard', icon: 'home', path: '/' },
    { label: 'Shifts', icon: 'schedule', path: '/shifts' },
    { label: 'Reports', icon: 'bar_chart', path: '/reports' },
    { label: 'Settings', icon: 'settings', path: '/settings' },
  ],
  salesman: [
    { label: 'Dashboard', icon: 'home', path: '/' },
    { label: 'My Shifts', icon: 'schedule', path: '/shifts' },
    { label: 'Settings', icon: 'settings', path: '/settings' },
  ],
}

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, logout } = useAuthStore()
  if (!currentUser) return null

  const navItems = NAV_ITEMS[currentUser.role]

  return (
    <aside className="w-64 bg-surface-container-lowest border-r border-outline-variant flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-outline-variant">
        <div className="size-7 text-secondary-container">
          <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" />
          </svg>
        </div>
        <h2 className="text-on-surface text-lg font-bold tracking-tight">PetroDisk</h2>
      </div>

      <div className="px-4 py-3 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-primary flex items-center justify-center text-on-primary text-sm font-bold">
            {currentUser.avatarInitials}
          </div>
          <div>
            <p className="text-on-surface text-sm font-semibold">{currentUser.name}</p>
            <p className="text-on-surface-variant text-xs capitalize">{currentUser.role}</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
            >
              <span className="material-symbols-outlined text-[20px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                {item.icon}
              </span>
              <span className="text-sm">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-outline-variant">
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-on-surface-variant hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </aside>
  )
}
