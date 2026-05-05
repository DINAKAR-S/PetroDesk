import { useState } from 'react'
import { useShiftsStore, type DateFilter } from '@/store/shiftsStore'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'
import { FUEL_LABELS, VAT_RATES, EXPENSE_CATEGORIES } from '@/lib/constants'
import type { TankerDelivery, Expense, FuelType } from '@/types'

type Tab = 'daily' | 'tax' | 'deliveries' | 'expenses'

const DATE_FILTERS: { label: string; value: DateFilter }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All', value: 'all' },
]

const TABS: { label: string; value: Tab }[] = [
  { label: 'Daily Sales', value: 'daily' },
  { label: 'Tax / VAT Report', value: 'tax' },
  { label: 'Tanker Deliveries', value: 'deliveries' },
  { label: 'Expenses', value: 'expenses' },
]

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

const INPUT = 'w-full border border-outline-variant rounded-lg px-3 py-2 text-on-surface bg-surface-container text-sm focus:outline-none focus:ring-2 focus:ring-primary/40'

/* ── Delivery Modal ── */
interface DeliveryModalProps {
  initial?: TankerDelivery
  onClose: () => void
  onSubmit: (d: Omit<TankerDelivery, 'id'>) => Promise<void>
}

function DeliveryModal({ initial, onClose, onSubmit }: DeliveryModalProps) {
  const { tanks } = useAppStore()

  const [tankId, setTankId] = useState(initial?.tankId ?? (tanks[0]?.id ?? ''))
  const [quantityL, setQuantityL] = useState(initial ? String(initial.quantityL) : '')
  const [ratePerLitre, setRatePerLitre] = useState(initial?.ratePerLitre != null ? String(initial.ratePerLitre) : '')
  const [totalAmount, setTotalAmount] = useState(initial?.totalAmount != null ? String(initial.totalAmount) : '')
  const [supplierName, setSupplierName] = useState(initial?.supplierName ?? '')
  const [invoiceNumber, setInvoiceNumber] = useState(initial?.invoiceNumber ?? '')
  const [deliveryDate, setDeliveryDate] = useState(initial?.deliveryDate ?? today())
  const [submitting, setSubmitting] = useState(false)

  const selectedTank = tanks.find((t) => t.id === tankId)

  function handleQuantityChange(val: string) {
    setQuantityL(val)
    const q = parseFloat(val), r = parseFloat(ratePerLitre)
    if (!isNaN(q) && !isNaN(r)) setTotalAmount((q * r).toFixed(2))
  }
  function handleRateChange(val: string) {
    setRatePerLitre(val)
    const q = parseFloat(quantityL), r = parseFloat(val)
    if (!isNaN(q) && !isNaN(r)) setTotalAmount((q * r).toFixed(2))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTank || !quantityL) return
    setSubmitting(true)
    await onSubmit({
      tankId: selectedTank.id,
      tankName: selectedTank.name,
      fuelType: selectedTank.fuelType as FuelType,
      quantityL: parseFloat(quantityL),
      ratePerLitre: ratePerLitre ? parseFloat(ratePerLitre) : null,
      totalAmount: totalAmount ? parseFloat(totalAmount) : null,
      supplierName: supplierName || null,
      invoiceNumber: invoiceNumber || null,
      deliveryDate,
    })
    setSubmitting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-on-surface text-lg font-semibold mb-5">{initial ? 'Edit' : 'Add'} Tanker Delivery</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-on-surface-variant text-sm font-medium mb-1">Tank</label>
            <select value={tankId} onChange={(e) => setTankId(e.target.value)} className={INPUT}>
              {tanks.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.fuelType})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-on-surface-variant text-sm font-medium mb-1">Quantity (L)</label>
            <input type="number" min="0" step="0.01" required value={quantityL} onChange={(e) => handleQuantityChange(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="block text-on-surface-variant text-sm font-medium mb-1">Rate per Litre (₹)</label>
            <input type="number" min="0" step="0.01" value={ratePerLitre} onChange={(e) => handleRateChange(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="block text-on-surface-variant text-sm font-medium mb-1">Total Amount (₹)</label>
            <input type="number" min="0" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="block text-on-surface-variant text-sm font-medium mb-1">Supplier Name</label>
            <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="block text-on-surface-variant text-sm font-medium mb-1">Invoice Number</label>
            <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="block text-on-surface-variant text-sm font-medium mb-1">Delivery Date</label>
            <input type="date" required value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={INPUT} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Add Delivery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Expense Modal ── */
interface ExpenseModalProps {
  initial?: Expense
  onClose: () => void
  onSubmit: (e: Omit<Expense, 'id'>) => Promise<void>
}

function ExpenseModal({ initial, onClose, onSubmit }: ExpenseModalProps) {
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [category, setCategory] = useState(initial?.category ?? EXPENSE_CATEGORIES[0])
  const [expenseDate, setExpenseDate] = useState(initial?.expenseDate ?? today())
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description || !amount) return
    setSubmitting(true)
    await onSubmit({ description, amount: parseFloat(amount), category, expenseDate })
    setSubmitting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-on-surface text-lg font-semibold mb-5">{initial ? 'Edit' : 'Add'} Expense</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-on-surface-variant text-sm font-medium mb-1">Description</label>
            <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="block text-on-surface-variant text-sm font-medium mb-1">Amount (₹)</label>
            <input type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="block text-on-surface-variant text-sm font-medium mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT}>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-on-surface-variant text-sm font-medium mb-1">Date</label>
            <input type="date" required value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className={INPUT} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('daily')
  const [deliveryModal, setDeliveryModal] = useState<{ open: boolean; item?: TankerDelivery }>({ open: false })
  const [expenseModal, setExpenseModal] = useState<{ open: boolean; item?: Expense }>({ open: false })

  const { shifts, deliveries, expenses, dateFilter, setDateFilter, loading, addDelivery, updateDelivery, deleteDelivery, addExpense, updateExpense, deleteExpense } = useShiftsStore()

  const closedShifts = shifts.filter((s) => s.status === 'closed')
  const totalRevenue = closedShifts.reduce((sum, s) => sum + s.totalCashCollected, 0)
  const totalLitres = closedShifts.reduce((sum, s) => sum + s.totalLitresSold, 0)

  const msLitresTotal = closedShifts.reduce((sum, s) => sum + s.msLitres, 0)
  const hsdLitresTotal = closedShifts.reduce((sum, s) => sum + s.hsdLitres, 0)
  const xpLitresTotal = closedShifts.reduce((sum, s) => sum + s.xpLitres, 0)
  const msRevenueTotal = closedShifts.reduce((sum, s) => sum + s.msRevenue, 0)
  const hsdRevenueTotal = closedShifts.reduce((sum, s) => sum + s.hsdRevenue, 0)
  const xpRevenueTotal = closedShifts.reduce((sum, s) => sum + s.xpRevenue, 0)

  const fuelBreakdown: { fuelType: FuelType; litres: number; revenue: number }[] = [
    { fuelType: 'MS', litres: msLitresTotal, revenue: msRevenueTotal },
    { fuelType: 'HSD', litres: hsdLitresTotal, revenue: hsdRevenueTotal },
    { fuelType: 'XP', litres: xpLitresTotal, revenue: xpRevenueTotal },
  ]

  const totalVat = fuelBreakdown.reduce((sum, fb) => {
    const rate = VAT_RATES[fb.fuelType]
    return sum + (fb.revenue * rate) / (1 + rate)
  }, 0)

  const dailyTotalsMap: Record<string, { litres: number; revenue: number }> = {}
  for (const s of closedShifts) {
    const dateKey = s.closedAt ? s.closedAt.split('T')[0] : s.openedAt.split('T')[0]
    if (!dailyTotalsMap[dateKey]) dailyTotalsMap[dateKey] = { litres: 0, revenue: 0 }
    dailyTotalsMap[dateKey].litres += s.totalLitresSold
    dailyTotalsMap[dateKey].revenue += s.totalCashCollected
  }
  const dailyTotals = Object.entries(dailyTotalsMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, vals]) => ({ date, ...vals }))

  const deliverySummaryMap: Record<FuelType, { quantity: number; amount: number }> = {
    MS: { quantity: 0, amount: 0 },
    HSD: { quantity: 0, amount: 0 },
    XP: { quantity: 0, amount: 0 },
  }
  for (const d of deliveries) {
    deliverySummaryMap[d.fuelType].quantity += d.quantityL
    deliverySummaryMap[d.fuelType].amount += d.totalAmount ?? 0
  }
  const totalDeliveryAmount = deliveries.reduce((sum, d) => sum + (d.totalAmount ?? 0), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  function handleDeleteDelivery(d: TankerDelivery) {
    if (!confirm(`Delete delivery of ${d.quantityL}L ${d.fuelType} from ${d.supplierName ?? 'unknown supplier'}?`)) return
    deleteDelivery(d.id)
  }

  function handleDeleteExpense(e: Expense) {
    if (!confirm(`Delete expense "${e.description}"?`)) return
    deleteExpense(e.id)
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="bg-surface-container rounded-xl p-1 overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-1">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                activeTab === tab.value
                  ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {(activeTab === 'daily' || activeTab === 'tax') && (
        <div className="bg-surface-container rounded-xl p-1 overflow-x-auto sm:w-fit">
          <div className="flex gap-1 min-w-max">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setDateFilter(f.value)}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                  dateFilter === f.value
                    ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'daily' && (
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, sub: 'from closed shifts' },
              { label: 'Total Litres', value: `${totalLitres.toLocaleString('en-IN')} L`, sub: 'fuel dispensed' },
              { label: 'Shifts Closed', value: String(closedShifts.length), sub: 'in selected period' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-surface-container-lowest p-4 sm:p-6 rounded-xl border border-outline-variant shadow-sm">
                <p className="text-on-surface-variant text-sm font-medium">{kpi.label}</p>
                <p className="text-on-surface text-xl sm:text-2xl font-bold mt-2">{kpi.value}</p>
                <p className="text-on-surface-variant text-xs mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>

          <section>
            <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-3">Sales by Shift</h3>
            {loading ? <p className="text-on-surface-variant text-sm">Loading…</p> : (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-container border-b border-outline-variant">
                    <tr>
                      <th className="text-left px-3 sm:px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Date</th>
                      <th className="text-left px-3 sm:px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Salesman</th>
                      <th className="hidden md:table-cell text-left px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">MS Litres</th>
                      <th className="hidden md:table-cell text-left px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">HSD Litres</th>
                      <th className="text-left px-3 sm:px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Total Litres</th>
                      <th className="text-left px-3 sm:px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Revenue</th>
                      <th className="hidden sm:table-cell text-left px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Cash Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedShifts.length === 0 ? (
                      <tr><td colSpan={7} className="px-5 py-8 text-center text-on-surface-variant text-sm">No closed shifts found</td></tr>
                    ) : (
                      closedShifts.map((shift, i) => (
                        <tr key={shift.id} className={cn('border-b border-outline-variant last:border-0', i % 2 ? 'bg-surface-container/30' : '')}>
                          <td className="px-3 sm:px-5 py-3 text-on-surface-variant whitespace-nowrap">{formatDate(shift.closedAt ?? shift.openedAt)}</td>
                          <td className="px-3 sm:px-5 py-3 font-medium text-on-surface">{shift.salesmanName}</td>
                          <td className="hidden md:table-cell px-5 py-3 text-on-surface text-right">{shift.msLitres > 0 ? shift.msLitres.toLocaleString('en-IN') : '—'}</td>
                          <td className="hidden md:table-cell px-5 py-3 text-on-surface text-right">{shift.hsdLitres > 0 ? shift.hsdLitres.toLocaleString('en-IN') : '—'}</td>
                          <td className="px-3 sm:px-5 py-3 text-on-surface text-right whitespace-nowrap">{shift.totalLitresSold.toLocaleString('en-IN')} L</td>
                          <td className="px-3 sm:px-5 py-3 text-on-surface text-right whitespace-nowrap">₹{shift.totalCashCollected.toLocaleString('en-IN')}</td>
                          <td className="hidden sm:table-cell px-5 py-3 text-right whitespace-nowrap">
                            {shift.cashVariance !== 0 ? (
                              <span className={cn('font-medium', shift.cashVariance < 0 ? 'text-rose-600' : 'text-emerald-600')}>
                                {shift.cashVariance > 0 ? '+' : ''}₹{shift.cashVariance.toLocaleString('en-IN')}
                              </span>
                            ) : <span className="text-on-surface-variant">—</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {dailyTotals.length > 0 && (
            <section>
              <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-3">Daily Totals</h3>
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-container border-b border-outline-variant">
                    <tr>
                      {['Date', 'Total Litres', 'Total Revenue'].map((h) => (
                        <th key={h} className="text-left px-3 sm:px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dailyTotals.map((row, i) => (
                      <tr key={row.date} className={cn('border-b border-outline-variant last:border-0', i % 2 ? 'bg-surface-container/30' : '')}>
                        <td className="px-3 sm:px-5 py-3 text-on-surface-variant whitespace-nowrap">{formatDate(row.date + 'T00:00:00')}</td>
                        <td className="px-3 sm:px-5 py-3 text-on-surface whitespace-nowrap">{row.litres.toLocaleString('en-IN')} L</td>
                        <td className="px-3 sm:px-5 py-3 text-on-surface font-medium whitespace-nowrap">₹{row.revenue.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'tax' && (
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, sub: 'VAT-inclusive' },
              { label: 'Total Tax Collected', value: `₹${Math.round(totalVat).toLocaleString('en-IN')}`, sub: 'state VAT (indicative)' },
              { label: 'Net Revenue', value: `₹${Math.round(totalRevenue - totalVat).toLocaleString('en-IN')}`, sub: 'after VAT' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-surface-container-lowest p-4 sm:p-6 rounded-xl border border-outline-variant shadow-sm">
                <p className="text-on-surface-variant text-sm font-medium">{kpi.label}</p>
                <p className="text-on-surface text-xl sm:text-2xl font-bold mt-2">{kpi.value}</p>
                <p className="text-on-surface-variant text-xs mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>
          <section>
            <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-3">Fuel Type Breakdown</h3>
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container border-b border-outline-variant">
                  <tr>
                    <th className="text-left px-3 sm:px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Fuel Type</th>
                    <th className="text-left px-3 sm:px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Litres Sold</th>
                    <th className="hidden md:table-cell text-left px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Rate/L</th>
                    <th className="text-left px-3 sm:px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Gross Revenue</th>
                    <th className="hidden md:table-cell text-left px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">VAT Rate</th>
                    <th className="text-left px-3 sm:px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">VAT Amount</th>
                    <th className="hidden sm:table-cell text-left px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Net Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelBreakdown.map((fb, i) => {
                    const vatRate = VAT_RATES[fb.fuelType]
                    const vatAmount = (fb.revenue * vatRate) / (1 + vatRate)
                    const netRevenue = fb.revenue - vatAmount
                    const ratePerL = fb.litres > 0 ? fb.revenue / fb.litres : 0
                    return (
                      <tr key={fb.fuelType} className={cn('border-b border-outline-variant last:border-0', i % 2 ? 'bg-surface-container/30' : '')}>
                        <td className="px-3 sm:px-5 py-3 font-medium text-on-surface whitespace-nowrap">{FUEL_LABELS[fb.fuelType]}</td>
                        <td className="px-3 sm:px-5 py-3 text-on-surface text-right whitespace-nowrap">{fb.litres > 0 ? fb.litres.toLocaleString('en-IN') : '—'}</td>
                        <td className="hidden md:table-cell px-5 py-3 text-on-surface text-right whitespace-nowrap">{ratePerL > 0 ? `₹${ratePerL.toFixed(2)}` : '—'}</td>
                        <td className="px-3 sm:px-5 py-3 text-on-surface text-right whitespace-nowrap">{fb.revenue > 0 ? `₹${Math.round(fb.revenue).toLocaleString('en-IN')}` : '—'}</td>
                        <td className="hidden md:table-cell px-5 py-3 text-on-surface-variant text-right whitespace-nowrap">{(vatRate * 100).toFixed(2)}%</td>
                        <td className="px-3 sm:px-5 py-3 text-amber-700 font-medium text-right whitespace-nowrap">{fb.revenue > 0 ? `₹${Math.round(vatAmount).toLocaleString('en-IN')}` : '—'}</td>
                        <td className="hidden sm:table-cell px-5 py-3 text-emerald-700 font-medium text-right whitespace-nowrap">{fb.revenue > 0 ? `₹${Math.round(netRevenue).toLocaleString('en-IN')}` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <p className="text-on-surface-variant text-xs">
            Note: Petroleum products are taxed under State VAT, not GST. Rates are indicative — consult your CA for filing.
          </p>
        </div>
      )}

      {activeTab === 'deliveries' && (
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
              Tanker Deliveries ({deliveries.length})
            </h3>
            <button
              onClick={() => setDeliveryModal({ open: true })}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-opacity"
            >
              + Add Delivery
            </button>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container border-b border-outline-variant">
                <tr>
                  <th className="text-left px-3 sm:px-4 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Date</th>
                  <th className="hidden md:table-cell text-left px-4 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Tank</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Fuel</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Quantity (L)</th>
                  <th className="hidden md:table-cell text-left px-4 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Rate/L</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Total</th>
                  <th className="hidden lg:table-cell text-left px-4 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Supplier</th>
                  <th className="hidden lg:table-cell text-left px-4 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Invoice</th>
                  <th className="text-left px-3 sm:px-4 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody>
                {deliveries.length === 0 ? (
                  <tr><td colSpan={9} className="px-5 py-8 text-center text-on-surface-variant text-sm">No deliveries yet</td></tr>
                ) : (
                  deliveries.map((d, i) => (
                    <tr key={d.id} className={cn('border-b border-outline-variant last:border-0', i % 2 ? 'bg-surface-container/30' : '')}>
                      <td className="px-3 sm:px-4 py-3 text-on-surface-variant whitespace-nowrap">{formatDate(d.deliveryDate)}</td>
                      <td className="hidden md:table-cell px-4 py-3 font-medium text-on-surface whitespace-nowrap">{d.tankName}</td>
                      <td className="px-3 sm:px-4 py-3 text-on-surface whitespace-nowrap">{FUEL_LABELS[d.fuelType]}</td>
                      <td className="px-3 sm:px-4 py-3 text-on-surface text-right whitespace-nowrap">{d.quantityL.toLocaleString('en-IN')}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-on-surface text-right whitespace-nowrap">{d.ratePerLitre != null ? `₹${d.ratePerLitre.toFixed(2)}` : '—'}</td>
                      <td className="px-3 sm:px-4 py-3 text-on-surface text-right whitespace-nowrap">{d.totalAmount != null ? `₹${d.totalAmount.toLocaleString('en-IN')}` : '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-on-surface-variant whitespace-nowrap">{d.supplierName ?? '—'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-on-surface-variant whitespace-nowrap">{d.invoiceNumber ?? '—'}</td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDeliveryModal({ open: true, item: d })} className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors" title="Edit">
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button onClick={() => handleDeleteDelivery(d)} className="p-1 rounded text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Delete">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {deliveries.length > 0 && (
            <section>
              <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-3">Delivery Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {(['MS', 'HSD', 'XP'] as FuelType[]).map((ft) => (
                  <div key={ft} className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm">
                    <p className="text-on-surface-variant text-sm font-medium">{FUEL_LABELS[ft]}</p>
                    <p className="text-on-surface text-lg font-bold mt-1">{deliverySummaryMap[ft].quantity.toLocaleString('en-IN')} L</p>
                    {deliverySummaryMap[ft].amount > 0 && (
                      <p className="text-on-surface-variant text-xs mt-0.5">₹{deliverySummaryMap[ft].amount.toLocaleString('en-IN')}</p>
                    )}
                  </div>
                ))}
                <div className="bg-secondary-container p-4 rounded-xl shadow-sm">
                  <p className="text-on-surface-variant text-sm font-medium">Total Spent</p>
                  <p className="text-on-surface text-lg font-bold mt-1">₹{totalDeliveryAmount.toLocaleString('en-IN')}</p>
                  <p className="text-on-surface-variant text-xs mt-0.5">{deliveries.length} deliveries</p>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
              Expenses ({expenses.length})
            </h3>
            <button
              onClick={() => setExpenseModal({ open: true })}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-opacity"
            >
              + Add Expense
            </button>
          </div>

          {expenses.length > 0 && (
            <div className="bg-secondary-container px-4 sm:px-5 py-3 rounded-xl">
              <span className="text-on-surface-variant text-sm font-medium">Total Expenses: </span>
              <span className="text-on-surface text-sm font-bold">₹{totalExpenses.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container border-b border-outline-variant">
                <tr>
                  <th className="text-left px-3 sm:px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Date</th>
                  <th className="text-left px-3 sm:px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Description</th>
                  <th className="hidden sm:table-cell text-left px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Category</th>
                  <th className="text-left px-3 sm:px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Amount</th>
                  <th className="text-left px-3 sm:px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-on-surface-variant text-sm">No expenses yet</td></tr>
                ) : (
                  expenses.map((exp, i) => (
                    <tr key={exp.id} className={cn('border-b border-outline-variant last:border-0', i % 2 ? 'bg-surface-container/30' : '')}>
                      <td className="px-3 sm:px-5 py-3 text-on-surface-variant whitespace-nowrap">{formatDate(exp.expenseDate)}</td>
                      <td className="px-3 sm:px-5 py-3 text-on-surface">{exp.description}</td>
                      <td className="hidden sm:table-cell px-5 py-3 text-on-surface-variant capitalize whitespace-nowrap">{exp.category}</td>
                      <td className="px-3 sm:px-5 py-3 text-on-surface font-medium text-right whitespace-nowrap">₹{exp.amount.toLocaleString('en-IN')}</td>
                      <td className="px-3 sm:px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setExpenseModal({ open: true, item: exp })} className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors" title="Edit">
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button onClick={() => handleDeleteExpense(exp)} className="p-1 rounded text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Delete">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deliveryModal.open && (
        <DeliveryModal
          initial={deliveryModal.item}
          onClose={() => setDeliveryModal({ open: false })}
          onSubmit={async (d) => {
            if (deliveryModal.item) {
              await updateDelivery(deliveryModal.item.id, d)
            } else {
              await addDelivery(d)
            }
          }}
        />
      )}

      {expenseModal.open && (
        <ExpenseModal
          initial={expenseModal.item}
          onClose={() => setExpenseModal({ open: false })}
          onSubmit={async (e) => {
            if (expenseModal.item) {
              await updateExpense(expenseModal.item.id, e)
            } else {
              await addExpense(e)
            }
          }}
        />
      )}
    </div>
  )
}
