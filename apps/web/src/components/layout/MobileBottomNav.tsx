import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'

interface BottomNavItem {
  label: string
  icon: string
  path: string
}

const BOTTOM_NAV_ITEMS: Record<Role, BottomNavItem[]> = {
  owner: [
    { label: 'Home', icon: 'home', path: '/' },
    { label: 'Shifts', icon: 'schedule', path: '/shifts' },
    { label: 'Khaata', icon: 'account_balance_wallet', path: '/customers' },
    { label: 'Reports', icon: 'bar_chart', path: '/reports' },
    { label: 'Settings', icon: 'settings', path: '/settings' },
  ],
  manager: [
    { label: 'Home', icon: 'home', path: '/' },
    { label: 'Shifts', icon: 'schedule', path: '/shifts' },
    { label: 'Khaata', icon: 'account_balance_wallet', path: '/customers' },
    { label: 'Reports', icon: 'bar_chart', path: '/reports' },
    { label: 'Settings', icon: 'settings', path: '/settings' },
  ],
  salesman: [
    { label: 'Home', icon: 'home', path: '/' },
    { label: 'Shifts', icon: 'schedule', path: '/shifts' },
    { label: 'Settings', icon: 'settings', path: '/settings' },
  ],
}

export default function MobileBottomNav() {
  const location = useLocation()
  const { currentUser } = useAuthStore()
  if (!currentUser) return null

  const items = BOTTOM_NAV_ITEMS[currentUser.role]

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface-container-lowest border-t border-outline-variant pb-safe"
      aria-label="Bottom navigation"
    >
      <ul className="flex items-stretch justify-around">
        {items.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <li key={item.path} className="flex-1">
              <Link
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className={cn('text-[11px] leading-tight', isActive && 'font-semibold')}>
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
