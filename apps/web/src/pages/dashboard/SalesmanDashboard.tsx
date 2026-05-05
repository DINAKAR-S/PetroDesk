import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { useShiftsStore } from '@/store/shiftsStore'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  closed: 'bg-emerald-50 text-emerald-700',
  open: 'bg-blue-50 text-blue-700',
  flagged: 'bg-rose-50 text-rose-700',
}

function hoursElapsed(openedAt: string): string {
  const diff = Date.now() - new Date(openedAt).getTime()
  const h = Math.floor(diff / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${h}h ${m}m`
}

export default function SalesmanDashboard() {
  const { nozzles } = useAppStore()
  const { currentUser } = useAuthStore()
  const { shifts } = useShiftsStore()

  const myShifts = shifts.filter((s) => s.salesmanId === currentUser?.id)
  const activeShift = myShifts.find((s) => s.status === 'open') ?? null
  const recentShifts = myShifts.slice(0, 10)

  const totalLitres = myShifts.reduce((sum, s) => sum + s.totalLitresSold, 0)
  const totalCash = myShifts.reduce((sum, s) => sum + s.totalCashCollected, 0)
  const avgVariance = myShifts.length > 0
    ? myShifts.reduce((sum, s) => sum + s.cashVariance, 0) / myShifts.length
    : 0

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-3xl">
      {activeShift ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              Shift Active
            </span>
          </div>
          <p className="text-on-surface font-semibold">
            Opened at {new Date(activeShift.openedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </p>
          <p className="text-on-surface-variant text-sm mt-1">
            Elapsed: {hoursElapsed(activeShift.openedAt)}
          </p>
          <p className="text-blue-600 text-sm mt-3 font-medium">
            Go to Shifts to close this shift
          </p>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-6">
          <p className="text-emerald-700 font-semibold">No active shift</p>
          <p className="text-emerald-600 text-sm mt-1">Start a new shift from the Shifts page</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-surface-container-lowest p-4 sm:p-6 rounded-xl border border-outline-variant shadow-sm">
          <p className="text-on-surface-variant text-sm font-medium">My Shifts</p>
          <p className="text-on-surface text-xl sm:text-2xl font-bold mt-2">{myShifts.length}</p>
          <p className="text-on-surface-variant text-xs mt-1">total shifts</p>
        </div>
        <div className="bg-surface-container-lowest p-4 sm:p-6 rounded-xl border border-outline-variant shadow-sm">
          <p className="text-on-surface-variant text-sm font-medium">Total Litres Sold</p>
          <p className="text-on-surface text-xl sm:text-2xl font-bold mt-2 break-words">
            {totalLitres.toLocaleString('en-IN')} L
          </p>
          <p className="text-on-surface-variant text-xs mt-1">across all shifts</p>
        </div>
        <div className="bg-surface-container-lowest p-4 sm:p-6 rounded-xl border border-outline-variant shadow-sm">
          <p className="text-on-surface-variant text-sm font-medium">Total Cash Collected</p>
          <p className="text-on-surface text-xl sm:text-2xl font-bold mt-2 break-words">
            ₹{totalCash.toLocaleString('en-IN')}
          </p>
          <p className="text-on-surface-variant text-xs mt-1">all time</p>
        </div>
        <div className="bg-surface-container-lowest p-4 sm:p-6 rounded-xl border border-outline-variant shadow-sm">
          <p className="text-on-surface-variant text-sm font-medium">Avg Cash Variance</p>
          <p className={cn('text-xl sm:text-2xl font-bold mt-2 break-words', avgVariance < 0 ? 'text-rose-600' : avgVariance > 0 ? 'text-emerald-600' : 'text-on-surface')}>
            {avgVariance > 0 ? '+' : ''}₹{Math.round(avgVariance).toLocaleString('en-IN')}
          </p>
          <p className="text-on-surface-variant text-xs mt-1">per shift</p>
        </div>
      </div>

      <section>
        <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-3 sm:mb-4">
          My Recent Shifts
        </h3>
        {/* Mobile cards */}
        <div className="flex flex-col gap-3 lg:hidden">
          {recentShifts.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 text-center text-on-surface-variant text-sm">
              No shifts yet
            </div>
          ) : (
            recentShifts.map((shift) => (
              <div key={shift.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm text-on-surface-variant">
                    {new Date(shift.openedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </p>
                  <span className={cn('shrink-0 px-2 py-1 rounded-full text-xs font-semibold capitalize', STATUS_STYLES[shift.status])}>
                    {shift.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm mt-2">
                  <div>
                    <p className="text-xs text-on-surface-variant">Litres</p>
                    <p className="text-on-surface font-medium">
                      {shift.totalLitresSold > 0 ? `${shift.totalLitresSold.toLocaleString('en-IN')} L` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant">Revenue</p>
                    <p className="text-on-surface font-medium">
                      {shift.totalCashCollected > 0 ? `₹${shift.totalCashCollected.toLocaleString('en-IN')}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant">Cash Var.</p>
                    {shift.cashVariance !== 0 ? (
                      <p className={cn('font-medium', shift.cashVariance < 0 ? 'text-rose-600' : 'text-emerald-600')}>
                        {shift.cashVariance > 0 ? '+' : ''}₹{shift.cashVariance.toLocaleString('en-IN')}
                      </p>
                    ) : <p className="text-on-surface-variant">—</p>}
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant">DIP Var%</p>
                    {shift.dipVariancePct > 0 ? (
                      <p className={cn('font-medium', shift.dipVariancePct > 2 ? 'text-red-600' : shift.dipVariancePct > 0.5 ? 'text-amber-600' : 'text-emerald-600')}>
                        {shift.dipVariancePct}%
                      </p>
                    ) : <p className="text-on-surface-variant">—</p>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {/* Desktop table */}
        <div className="hidden lg:block bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                {['Date', 'Litres', 'Revenue', 'Cash Variance', 'DIP Var%', 'Status'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentShifts.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-on-surface-variant text-sm">No shifts yet</td></tr>
              ) : (
                recentShifts.map((shift, i) => (
                  <tr key={shift.id} className={cn('border-b border-outline-variant last:border-0', i % 2 ? 'bg-surface-container-low/30' : '')}>
                    <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">
                      {new Date(shift.openedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-5 py-3 text-on-surface text-right">
                      {shift.totalLitresSold > 0 ? `${shift.totalLitresSold.toLocaleString('en-IN')} L` : '—'}
                    </td>
                    <td className="px-5 py-3 text-on-surface text-right">
                      {shift.totalCashCollected > 0 ? `₹${shift.totalCashCollected.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {shift.cashVariance !== 0 ? (
                        <span className={shift.cashVariance < 0 ? 'text-rose-600 font-medium' : 'text-emerald-600 font-medium'}>
                          {shift.cashVariance > 0 ? '+' : ''}₹{shift.cashVariance.toLocaleString('en-IN')}
                        </span>
                      ) : <span className="text-on-surface-variant">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {shift.dipVariancePct > 0 ? (
                        <span className={cn('font-medium', shift.dipVariancePct > 2 ? 'text-red-600' : shift.dipVariancePct > 0.5 ? 'text-amber-600' : 'text-emerald-600')}>
                          {shift.dipVariancePct}%
                        </span>
                      ) : <span className="text-on-surface-variant">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-semibold capitalize', STATUS_STYLES[shift.status])}>
                        {shift.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-3 sm:mb-4">
          Nozzle Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {nozzles.map((nozzle) => (
            <div
              key={nozzle.id}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    local_gas_station
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-on-surface font-semibold text-sm truncate">{nozzle.name}</p>
                  <p className="text-on-surface-variant text-xs">{nozzle.fuelType}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-on-surface font-bold text-base">
                  {nozzle.currentMeterReading.toLocaleString('en-IN')} L
                </p>
                <p className="text-on-surface-variant text-xs">Current meter</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
