import { useShiftsStore, type DateFilter } from '@/store/shiftsStore'
import { cn } from '@/lib/utils'

const DATE_FILTERS: { label: string; value: DateFilter }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All', value: 'all' },
]

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

function formatOpenedAt(openedAt: string): string {
  const d = new Date(openedAt)
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  return `${time}, ${date}`
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

export default function ManagerDashboard() {
  const { shifts, dateFilter, statusFilter, setDateFilter, setStatusFilter, loading } = useShiftsStore()

  const closedShifts = shifts.filter((s) => s.status === 'closed')
  const totalRevenue = closedShifts.reduce((sum, s) => sum + s.totalCashCollected, 0)
  const totalLitres = closedShifts.reduce((sum, s) => sum + s.totalLitresSold, 0)
  const shiftsToday = shifts.filter((s) => isToday(s.openedAt)).length
  const flaggedCount = shifts.filter((s) => s.status === 'flagged').length

  const filteredShifts = statusFilter === 'all' ? shifts : shifts.filter((s) => s.status === statusFilter)

  const activeShifts = shifts.filter((s) => s.status === 'open')

  const salesmanMap = new Map<string, { name: string; count: number; litres: number; revenue: number; cashVariances: number[]; worstDip: number }>()
  for (const s of filteredShifts) {
    const existing = salesmanMap.get(s.salesmanId)
    if (existing) {
      existing.count += 1
      existing.litres += s.totalLitresSold
      existing.revenue += s.totalCashCollected
      existing.cashVariances.push(s.cashVariance)
      if (s.dipVariancePct > existing.worstDip) existing.worstDip = s.dipVariancePct
    } else {
      salesmanMap.set(s.salesmanId, {
        name: s.salesmanName,
        count: 1,
        litres: s.totalLitresSold,
        revenue: s.totalCashCollected,
        cashVariances: [s.cashVariance],
        worstDip: s.dipVariancePct,
      })
    }
  }
  const teamRows = Array.from(salesmanMap.values())

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-surface-container rounded-xl p-1 gap-1">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setDateFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                dateFilter === f.value
                  ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex bg-surface-container rounded-xl p-1 gap-1">
          {(['all', 'open', 'closed', 'flagged'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize',
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
          <p className="text-on-surface-variant text-sm font-medium">Total Revenue</p>
          <p className="text-on-surface text-2xl font-bold mt-2">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </p>
          <p className="text-on-surface-variant text-xs mt-1">{closedShifts.length} closed shifts</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
          <p className="text-on-surface-variant text-sm font-medium">Litres Sold</p>
          <p className="text-on-surface text-2xl font-bold mt-2">
            {totalLitres.toLocaleString('en-IN')} L
          </p>
          <p className="text-on-surface-variant text-xs mt-1">across {closedShifts.length} shifts</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
          <p className="text-on-surface-variant text-sm font-medium">Shifts Today</p>
          <p className={cn('text-2xl font-bold mt-2', shiftsToday > 0 ? 'text-blue-600' : 'text-on-surface')}>
            {shiftsToday}
          </p>
          <p className="text-on-surface-variant text-xs mt-1">opened today</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
          <p className="text-on-surface-variant text-sm font-medium">Flagged</p>
          <p className={cn('text-2xl font-bold mt-2', flaggedCount > 0 ? 'text-rose-600' : 'text-on-surface')}>
            {flaggedCount}
          </p>
          <p className="text-on-surface-variant text-xs mt-1">need review</p>
        </div>
      </div>

      <section>
        <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-4">
          Team Performance
        </h3>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                {['Salesman', 'Shifts', 'Total Litres', 'Total Revenue', 'Avg Cash Variance', 'Worst DIP%'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamRows.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-on-surface-variant text-sm">No data</td></tr>
              ) : (
                teamRows.map((row, i) => {
                  const avgVariance = row.cashVariances.length > 0
                    ? row.cashVariances.reduce((a, b) => a + b, 0) / row.cashVariances.length
                    : 0
                  return (
                    <tr key={row.name} className={cn('border-b border-outline-variant last:border-0', i % 2 ? 'bg-surface-container-low/30' : '')}>
                      <td className="px-5 py-3 font-medium text-on-surface">{row.name}</td>
                      <td className="px-5 py-3 text-on-surface-variant">{row.count}</td>
                      <td className="px-5 py-3 text-on-surface text-right">{row.litres.toLocaleString('en-IN')} L</td>
                      <td className="px-5 py-3 text-on-surface text-right">₹{row.revenue.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={cn('font-medium', avgVariance < 0 ? 'text-rose-600' : avgVariance > 0 ? 'text-emerald-600' : 'text-on-surface-variant')}>
                          {avgVariance > 0 ? '+' : ''}₹{Math.round(avgVariance).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {row.worstDip > 0 ? (
                          <span className={cn('font-medium', row.worstDip > 2 ? 'text-red-600' : row.worstDip > 0.5 ? 'text-amber-600' : 'text-emerald-600')}>
                            {row.worstDip}%
                          </span>
                        ) : <span className="text-on-surface-variant">—</span>}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-4">
          Active Shifts ({activeShifts.length})
        </h3>
        {activeShifts.length === 0 ? (
          <p className="text-on-surface-variant text-sm">No active shifts right now.</p>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  {['Salesman', 'Opened At', 'Hours Active'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeShifts.map((shift, i) => (
                  <tr key={shift.id} className={cn('border-b border-outline-variant last:border-0', i % 2 ? 'bg-surface-container-low/30' : '')}>
                    <td className="px-5 py-3 font-medium text-on-surface">{shift.salesmanName}</td>
                    <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">{formatOpenedAt(shift.openedAt)}</td>
                    <td className="px-5 py-3 text-blue-600 font-medium">{hoursElapsed(shift.openedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-4">
          Shift Log ({filteredShifts.length})
        </h3>
        {loading ? (
          <p className="text-on-surface-variant text-sm">Loading…</p>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-x-auto">
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
        )}
      </section>
    </div>
  )
}
