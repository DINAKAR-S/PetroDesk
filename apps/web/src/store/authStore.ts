import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Role } from '@/types'

const DUMMY_OTP = '123456'

interface AuthState {
  currentUser: User | null
  isAuthenticated: boolean
  pendingPhone: string
  otpSent: boolean
  sendOtp: (phone: string) => void
  verifyOtp: (otp: string, users: User[]) => 'dashboard' | 'role-select' | 'error'
  loginAsUser: (user: User) => void
  loginAsRole: (role: Role) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  pendingPhone: '',
  otpSent: false,

  sendOtp: (phone) => set({ pendingPhone: phone, otpSent: true }),

  verifyOtp: (otp, users) => {
    if (otp !== DUMMY_OTP) return 'error'
    const { pendingPhone } = get()
    const found = users.find((u) => u.phone === pendingPhone)
    if (found) {
      set({ currentUser: found, isAuthenticated: true, otpSent: false })
      return 'dashboard'
    }
    set({ otpSent: false })
    return 'role-select'
  },

  loginAsUser: (user) => set({ currentUser: user, isAuthenticated: true }),

  loginAsRole: (role) =>
    set({
      currentUser: {
        id: `demo-${role}`,
        name: role === 'owner' ? 'Rajan' : role === 'manager' ? 'Kumar' : 'Murugan',
        role,
        phone:
          role === 'owner' ? '9999999999' : role === 'manager' ? '8888888888' : '7777777777',
        avatarInitials: role === 'owner' ? 'RJ' : role === 'manager' ? 'KM' : 'MG',
      },
      isAuthenticated: true,
    }),

  logout: () =>
    set({ currentUser: null, isAuthenticated: false, pendingPhone: '', otpSent: false }),
    }),
    { name: 'petrodisk-auth' }
  )
)
