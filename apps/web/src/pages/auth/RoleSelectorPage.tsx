import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import type { Role } from '@/types'

const ROLES: {
  role: Role
  label: string
  description: string
  icon: string
  bg: string
  iconColor: string
}[] = [
  {
    role: 'owner',
    label: 'Owner',
    description: 'Full visibility — revenue, stock levels, shift summaries, and team management.',
    icon: 'business',
    bg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    role: 'manager',
    label: 'Manager',
    description: 'Monitor active shifts, review readings, approve reconciliations.',
    icon: 'manage_accounts',
    bg: 'bg-teal-50',
    iconColor: 'text-teal-700',
  },
  {
    role: 'salesman',
    label: 'Salesman',
    description: 'Open and close shifts, record nozzle readings and DIP measurements.',
    icon: 'local_gas_station',
    bg: 'bg-secondary-container/10',
    iconColor: 'text-secondary-container',
  },
]

export default function RoleSelectorPage() {
  const { loginAsRole, loginAsUser } = useAuthStore()
  const { users } = useAppStore()
  const navigate = useNavigate()

  function handleSelect(role: Role) {
    const match = users.find((u) => u.role === role)
    if (match) {
      loginAsUser(match)
    } else {
      loginAsRole(role)
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-sm sm:max-w-lg">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Choose Your Role</h1>
          <p className="text-on-surface-variant text-sm mt-2 px-2">
            Select how you'd like to enter PetroDisk for this session
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4">
          {ROLES.map(({ role, label, description, icon, bg, iconColor }) => (
            <button
              key={role}
              onClick={() => handleSelect(role)}
              className="w-full flex items-center gap-3 sm:gap-5 p-4 sm:p-5 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm hover:border-primary hover:shadow-md transition-all text-left group min-h-[72px]"
            >
              <div
                className={`flex-shrink-0 flex items-center justify-center size-12 sm:size-14 rounded-xl ${bg}`}
              >
                <span className={`material-symbols-outlined text-2xl sm:text-3xl ${iconColor}`}>{icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-on-surface text-base">{label}</p>
                <p className="text-on-surface-variant text-sm mt-0.5 leading-snug">{description}</p>
              </div>
              <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors flex-shrink-0 hidden sm:inline-block">
                arrow_forward
              </span>
            </button>
          ))}
        </div>

        <div className="text-center mt-5 sm:mt-6">
          <a
            href="/login"
            className="inline-block py-2 px-4 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            ← Back to login
          </a>
        </div>
      </div>
    </div>
  )
}
