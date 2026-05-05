import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { sendOtp, verifyOtp } = useAuthStore()
  const { users, loadAll } = useAppStore()
  const navigate = useNavigate()

  function handleSendOtp() {
    const trimmed = phone.replace(/\s/g, '')
    if (!/^\d{10}$/.test(trimmed)) {
      setError('Enter a valid 10-digit mobile number')
      return
    }
    setError('')
    setLoading(true)
    setTimeout(() => {
      sendOtp(trimmed)
      setStep('otp')
      setLoading(false)
    }, 600)
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP')
      return
    }
    setError('')
    setLoading(true)

    let verifyUsers = users
    if (verifyUsers.length === 0) {
      await loadAll()
      verifyUsers = useAppStore.getState().users
    }

    await new Promise((r) => setTimeout(r, 400))
    const result = verifyOtp(otp, verifyUsers)
    setLoading(false)
    if (result === 'dashboard') {
      navigate('/')
    } else if (result === 'role-select') {
      navigate('/select-role')
    } else {
      setError('Incorrect OTP. Use 123456 for demo.')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-sm sm:max-w-md bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-8 pb-4 sm:pb-6 text-center border-b border-outline-variant">
          <div className="inline-flex items-center justify-center size-14 sm:size-16 bg-secondary-container/10 text-secondary-container rounded-full mb-3 sm:mb-4">
            <svg className="size-7 sm:size-8" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface mb-1">PetroDisk</h1>
          <p className="text-on-surface-variant text-sm">Smart Management for Modern Fuel Stations</p>
        </div>

        {/* Form */}
        <div className="p-5 sm:p-8">
          {step === 'phone' ? (
            <div className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Language
                </label>
                <select className="block w-full h-11 rounded-lg border border-outline-variant bg-surface-container-low px-4 text-on-surface text-sm sm:text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                  <option value="en">English</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="ml">മലയാളം (Malayalam)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-on-surface-variant font-medium text-sm pointer-events-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                    placeholder="Enter 10-digit number"
                    className="block w-full h-11 rounded-lg border border-outline-variant bg-surface-container-low pl-12 pr-4 text-on-surface text-sm sm:text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <p className="mt-1.5 text-xs text-on-surface-variant leading-relaxed">
                  Demo: 9999999999 (Owner) · 8888888888 (Manager) · 7777777777 (Salesman)
                </p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full h-11 px-4 rounded-lg bg-secondary-container text-white font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              <div className="text-center">
                <p className="text-sm text-on-surface-variant">
                  OTP sent to <span className="font-semibold text-on-surface">+91 {phone}</span>
                </p>
                <p className="text-xs text-on-surface-variant mt-1">Demo OTP: 123456</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Enter OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                  placeholder="6-digit OTP"
                  className="block w-full h-12 sm:h-14 rounded-lg border border-outline-variant bg-surface-container-low px-4 text-on-surface text-center text-xl sm:text-2xl font-bold tracking-widest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  maxLength={6}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={handleVerifyOtp}
                disabled={loading}
                className="w-full h-11 px-4 rounded-lg bg-secondary-container text-white font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loading ? 'Verifying…' : 'Verify & Login'}
              </button>

              <button
                onClick={() => {
                  setStep('phone')
                  setOtp('')
                  setError('')
                }}
                className="w-full py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
              >
                ← Change number
              </button>
            </div>
          )}
        </div>

        <div className="px-5 sm:px-8 pb-5 sm:pb-6 text-center text-xs text-on-surface-variant leading-relaxed">
          By continuing, you agree to PetroDisk's{' '}
          <a href="#" className="text-secondary-container hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-secondary-container hover:underline">
            Privacy Policy
          </a>
          .
        </div>
      </div>
    </div>
  )
}
