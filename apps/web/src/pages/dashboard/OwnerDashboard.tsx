import { useAppStore } from '@/store/appStore'
import { useShiftsStore, type DateFilter } from '@/store/shiftsStore'
import { cn, stockPercent } from '@/lib/utils'

const DATE_FILTERS: { label: string; value: DateFilter }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All', value: 'all' },
]

const STATUS_STYLES: Record<string, string> = {
  closed: 'bg-emerald-50 text-emerald-700',
  open: 'bg-blue-50 text-blue-700',
  pending: 'bg-gray-100 text-gray-500',
  flagged: 'bg-rose-50 text-rose-700',
}

export default function OwnerDashboard() {
  const { tanks } = useAppStore()
  const { shifts, dateFilter, statusFilter, setDateFilter, setStatusFilter, loading } = useShiftsStore()

  const closedShifts = shifts.filter((s) => s.status === 'closed')
  const totalRevenue = closedShifts.reduce((sum, s) => sum + s.totalCashCollected, 0)
  const totalLitres = closedShifts.reduce((sum, s) => sum + s.totalLitresSold, 0)
  const openCount = shifts.filter((s) => s.status === 'open').length
  const flaggedCount = shifts.filter((s) => s.status === 'flagged').length

  const filteredShifts = statusFilter === 'all' ? shifts : shifts.filter((s) => s.status === statusFilter)

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 -mx-1 px-1 overflow-x-auto">
        <div className="flex bg-surface-container rounded-xl p-1 gap-1 shrink-0">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setDateFilter(f.value)}
              className={cn(
                'px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                dateFilter === f.value
                  ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex bg-surface-container rounded-xl p-1 gap-1 shrink-0">
          {(['all', 'open', 'closed', 'flagged'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize whitespace-nowrap',
                statusFilter === s
                  ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-surface-container-lowest p-4 sm:p-6 rounded-xl border border-outline-variant shadow-sm">
          <p className="text-on-surface-variant text-sm font-medium">Revenue</p>
          <p className="text-on-surface text-xl sm:text-2xl font-bold mt-2 break-words">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </p>
          <p className="text-on-surface-variant text-xs mt-1">{closedShifts.length} closed shifts</p>
        </div>
        <div className="bg-surface-container-lowest p-4 sm:p-6 rounded-xl border border-outline-variant shadow-sm">
          <p className="text-on-surface-variant text-sm font-medium">Litres Sold</p>
          <p className="text-on-surface text-xl sm:text-2xl font-bold mt-2 break-words">
            {totalLitres.toLocaleString('en-IN')} L
          </p>
          <p className="text-on-surface-variant text-xs mt-1">across {closedShifts.length} shifts</p>
        </div>
        <div className="bg-surface-container-lowest p-4 sm:p-6 rounded-xl border border-outline-variant shadow-sm">
          <p className="text-on-surface-variant text-sm font-medium">Open Shifts</p>
          <p className={cn('text-xl sm:text-2xl font-bold mt-2', openCount > 0 ? 'text-blue-600' : 'text-on-surface')}>
            {openCount}
          </p>
          <p className="text-on-surface-variant text-xs mt-1">currently active</p>
        </div>
        <div className="bg-surface-container-lowest p-4 sm:p-6 rounded-xl border border-outline-variant shadow-sm">
          <p className="text-on-surface-variant text-sm font-medium">Flagged</p>
          <p className={cn('text-xl sm:text-2xl font-bold mt-2', flaggedCount > 0 ? 'text-rose-600' : 'text-on-surface')}>
            {flaggedCount}
          </p>
          <p className="text-on-surface-variant text-xs mt-1">need review</p>
        </div>
      </div>

      {/* Tank Stock */}
      <section>
        <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-3 sm:mb-4">
          Tank Stock Levels
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {tanks.map((tank) => {
            const pct = stockPercent(tank.currentStockL, tank.capacityL)
            const isLow = pct < 30
            const isMed = pct >= 30 && pct < 60
            return (
              <div key={tank.id} className="bg-surface-container-lowest p-4 sm:p-5 rounded-xl border border-outline-variant shadow-sm">
                <div className="flex justify-between items-center gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-on-surface font-semibold truncate">{tank.name}</p>
                    <p className="text-on-surface-variant text-xs">{tank.fuelType === 'MS' ? 'Petrol (MS)' : tank.fuelType === 'HSD' ? 'Diesel (HSD)' : 'Premium (XP)'}</p>
                  </div>
                  <p className={cn('text-xl sm:text-2xl font-bold shrink-0', isLow ? 'text-red-600' : isMed ? 'text-amber-600' : 'text-emerald-600')}>
                    {pct}%
                  </p>
                </div>
                <div className="h-2.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', isLow ? 'bg-red-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-on-surface-variant mt-2">
                  {tank.currentStockL.toLocaleString('en-IN')} L / {tank.capacityL.toLocaleString('en-IN')} L
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Shifts — table on lg+, cards on mobile */}
      <section>
        <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-3 sm:mb-4">
          Shifts ({filteredShifts.length})
        </h3>
        {loading ? (
          <p className="text-on-surface-variant text-sm">Loading…</p>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="flex flex-col gap-3 lg:hidden">
              {filteredShifts.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 text-center text-on-surface-variant text-sm">
                  No shifts found
                </div>
              ) : (
                filteredShifts.map((shift) => (
                  <div key={shift.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-on-surface truncate">{shift.salesmanName}</p>
                        <p className="text-xs text-on-surface-variant">
                          {new Date(shift.openedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                      <span className={cn('shrink-0 px-2 py-1 rounded-full text-xs font-semibold capitalize', STATUS_STYLES[shift.status])}>
                        {shift.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm mt-3">
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
            {/* Desktop/tablet: table */}
            <div className="hidden lg:block bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    {['Salesman', 'Date', 'Litres', 'Revenue', 'Cash Variance', 'DIP Var%', 'Status'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredShifts.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-on-surface-variant text-sm">No shifts found</td></tr>
                  ) : (
                    filteredShifts.map((shift, i) => (
                      <tr key={shift.id} className={cn('border-b border-outline-variant last:border-0', i % 2 ? 'bg-surface-container-low/30' : '')}>
                        <td className="px-5 py-3 font-medium text-on-surface">{shift.salesmanName}</td>
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
          </>
        )}
      </section>
    </div>
  )
}
