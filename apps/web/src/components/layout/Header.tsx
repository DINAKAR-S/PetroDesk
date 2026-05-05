import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'

interface HeaderProps {
  title: string
  onOpenMenu?: () => void
}

export default function Header({ title, onOpenMenu }: HeaderProps) {
  const { currentUser } = useAuthStore()
  const { bunk } = useAppStore()

  return (
    <header className="bg-surface-container-lowest border-b border-outline-variant px-4 py-3 md:px-8 md:py-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="md:hidden p-2 -ml-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>
        <div className="min-w-0">
          <h2 className="text-on-surface text-lg md:text-xl font-bold tracking-tight truncate">{title}</h2>
          <p className="hidden sm:block text-on-surface-variant text-xs mt-0.5 truncate">{bunk.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <button className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors relative">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-2 right-2 size-2 bg-secondary-container rounded-full" />
        </button>
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-primary flex items-center justify-center text-on-primary text-xs font-bold">
            {currentUser?.avatarInitials}
          </div>
          <div className="hidden md:block">
            <p className="text-on-surface text-sm font-semibold leading-tight">{currentUser?.name}</p>
            <p className="text-on-surface-variant text-xs capitalize leading-tight">
              {currentUser?.role}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
