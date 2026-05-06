import { useMemo, useState } from 'react'
import { useShiftsStore, type DateFilter } from '@/store/shiftsStore'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { FUEL_LABELS, VAT_RATES, FUEL_TYPES, EXPENSE_CATEGORIES } from '@/lib/constants'
import { generateShiftReport } from '@/lib/pdf'
import type { TankerDelivery, Expense, FuelType, Nozzle } from '@/types'

type ExportPreset = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'custom'

const EXPORT_PRESETS: { label: string; value: ExportPreset }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: 'last7' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'Custom', value: 'custom' },
]

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function rangeForPreset(
  preset: ExportPreset,
  customFrom: string,
  customTo: string,
): { start: Date; end: Date } | null {
  const now = new Date()
  if (preset === 'today') return { start: startOfDay(now), end: endOfDay(now) }
  if (preset === 'yesterday') {
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    return { start: startOfDay(y), end: endOfDay(y) }
  }
  if (preset === 'last7') {
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    return { start: startOfDay(start), end: endOfDay(now) }
  }
  if (preset === 'thisMonth') {
    return { start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), end: endOfDay(now) }
  }
  if (preset === 'lastMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return { start: startOfDay(start), end: endOfDay(end) }
  }
  if (preset === 'custom') {
    if (!customFrom || !customTo) return null
    const start = startOfDay(parseLocalDate(customFrom))
    const end = endOfDay(parseLocalDate(customTo))
    if (end < start) return null
    return { start, end }
  }
  return null
}

function formatRangeLabel(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  return sameDay ? fmt(start) : `${fmt(start)} — ${fmt(end)}`
}

type Tab = 'daily' | 'tax' | 'deliveries' | 'expenses' | 'bank'

const DATE_FILTERS: { label: string; value: DateFilter }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All', value: 'all' },
]

const ALL_TABS: { label: string; value: Tab; ownerOnly?: boolean }[] = [
  { label: 'Daily Sales', value: 'daily' },
  { label: 'Tax / VAT Report', value: 'tax' },
  { label: 'Tanker Deliveries', value: 'deliveries' },
  { label: 'Expenses', value: 'expenses' },
  { label: 'Bank Deposits', value: 'bank', ownerOnly: true },
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
  const [exportPreset, setExportPreset] = useState<ExportPreset>('today')
  const [customFrom, setCustomFrom] = useState<string>(today())
  const [customTo, setCustomTo] = useState<string>(today())
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // ── Bank Deposits state ─────────────────────────────────────
  const [bankPreset, setBankPreset] = useState<ExportPreset>('today')
  const [bankCustomFrom, setBankCustomFrom] = useState<string>(today())
  const [bankCustomTo, setBankCustomTo] = useState<string>(today())
  // Per-row in-flight inputs (depositedAmount + notes). Keyed by depositDate.
  const [bankRowDrafts, setBankRowDrafts] = useState<Record<string, { depositedAmount: string; notes: string }>>({})
  const [bankSavingDate, setBankSavingDate] = useState<string | null>(null)
  const [bankError, setBankError] = useState<string | null>(null)

  const { shifts, deliveries, expenses, dateFilter, setDateFilter, loading, addDelivery, updateDelivery, deleteDelivery, addExpense, updateExpense, deleteExpense } = useShiftsStore()
  const { dispenserUnits, nozzles, fuelPrices, bunk, bankDeposits, upsertBankDeposit } = useAppStore()
  const currentUser = useAuthStore((s) => s.currentUser)
  const canExport = currentUser?.role === 'owner' || currentUser?.role === 'manager'
  const canSeeBankTab = currentUser?.role === 'owner' || currentUser?.role === 'manager'

  // Tabs visible to the current role. Salesman never sees the Bank tab.
  const TABS = useMemo(
    () => ALL_TABS.filter((t) => !t.ownerOnly || canSeeBankTab),
    [canSeeBankTab],
  )

  const nozzlesById = useMemo(() => {
    const m = new Map<string, Nozzle>()
    for (const n of nozzles) m.set(n.id, n)
    return m
  }, [nozzles])

  async function handleExportPdf() {
    setExportError(null)
    const range = rangeForPreset(exportPreset, customFrom, customTo)
    if (!range) {
      setExportError('Pick a valid date range')
      return
    }

    setExporting(true)
    try {
      const startMs = range.start.getTime()
      const endMs = range.end.getTime()
      const inRange = shifts.filter((s) => {
        if (s.status === 'open') return false
        const t = new Date(s.openedAt).getTime()
        return t >= startMs && t <= endMs
      })

      const store = useShiftsStore.getState()

      // Pull child rows + nozzle readings for each shift. We re-fetch to be
      // safe — store may not yet have entries for shifts the user never opened.
      await Promise.all(
        inRange.map(async (s) => {
          const tasks: Promise<void>[] = []
          const hasReadings = store.nozzleReadings.some((r) => r.shiftId === s.id)
          if (!hasReadings) tasks.push(store.loadNozzleReadings(s.id))
          tasks.push(store.loadShiftEntries(s.id))
          await Promise.all(tasks)
        }),
      )

      const fresh = useShiftsStore.getState()
      const readingsByShift = new Map<string, typeof fresh.nozzleReadings>()
      const otherSalesByShift = new Map<string, typeof fresh.otherSales>()
      const electronicByShift = new Map<string, typeof fresh.electronicEntries>()
      const expensesByShift = new Map<string, typeof fresh.expenseEntries>()
      const creditByShift = new Map<string, typeof fresh.creditEntries>()

      for (const s of inRange) {
        readingsByShift.set(s.id, fresh.nozzleReadings.filter((r) => r.shiftId === s.id))
        otherSalesByShift.set(s.id, fresh.otherSales.filter((r) => r.shiftId === s.id))
        electronicByShift.set(s.id, fresh.electronicEntries.filter((r) => r.shiftId === s.id))
        expensesByShift.set(s.id, fresh.expenseEntries.filter((r) => r.shiftId === s.id))
        creditByShift.set(s.id, fresh.creditEntries.filter((r) => r.shiftId === s.id))
      }

      const msRate = fuelPrices.find((p) => p.fuelType === 'MS')?.pricePerLitre ?? 0
      const hsdRate = fuelPrices.find((p) => p.fuelType === 'HSD')?.pricePerLitre ?? 0

      generateShiftReport({
        bunkName: bunk.name || 'Petro Desk',
        startDate: range.start,
        endDate: range.end,
        shifts: inRange,
        readingsByShift,
        otherSalesByShift,
        electronicByShift,
        expensesByShift,
        creditByShift,
        dispenserUnits,
        nozzlesById,
        msRate,
        hsdRate,
        rangeLabel: formatRangeLabel(range.start, range.end),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed'
      setExportError(message)
    } finally {
      setExporting(false)
    }
  }

  const closedShifts = shifts.filter((s) => s.status === 'closed')
  const totalRevenue = closedShifts.reduce((sum, s) => sum + s.totalCashCollected, 0)
  const totalLitres = closedShifts.reduce((sum, s) => sum + s.totalLitresSold, 0)

  const litresByFuel: Record<FuelType, number> = {
    MS: closedShifts.reduce((sum, s) => sum + s.msLitres, 0),
    HSD: closedShifts.reduce((sum, s) => sum + s.hsdLitres, 0),
  }
  const revenueByFuel: Record<FuelType, number> = {
    MS: closedShifts.reduce((sum, s) => sum + s.msRevenue, 0),
    HSD: closedShifts.reduce((sum, s) => sum + s.hsdRevenue, 0),
  }

  const fuelBreakdown: { fuelType: FuelType; litres: number; revenue: number }[] = FUEL_TYPES.map((ft) => ({
    fuelType: ft,
    litres: litresByFuel[ft],
    revenue: revenueByFuel[ft],
  }))

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
  }
  for (const d of deliveries) {
    deliverySummaryMap[d.fuelType].quantity += d.quantityL
    deliverySummaryMap[d.fuelType].amount += d.totalAmount ?? 0
  }
  const totalDeliveryAmount = deliveries.reduce((sum, d) => sum + (d.totalAmount ?? 0), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  // ── Bank Deposits derivation ─────────────────────────────────
  // Bucket each closed/flagged shift by its closing date (YYYY-MM-DD)
  // and sum cashInHand to produce the "expected" deposit for that date.
  // Filter to the selected preset range, then fold in any persisted
  // bank_deposit rows so we can show pre-saved deposit + notes.
  const bankRange = rangeForPreset(bankPreset, bankCustomFrom, bankCustomTo)

  function shiftBankDate(s: typeof shifts[number]): string {
    // Use closedAt for closed/flagged shifts; openedAt as a safety fallback.
    const iso = s.closedAt ?? s.openedAt
    return iso.split('T')[0]
  }

  const bankExpectedByDate = useMemo(() => {
    const m = new Map<string, number>()
    if (!bankRange) return m
    const startMs = bankRange.start.getTime()
    const endMs = bankRange.end.getTime()
    for (const s of shifts) {
      if (s.status !== 'closed' && s.status !== 'flagged') continue
      const ts = new Date(s.closedAt ?? s.openedAt).getTime()
      if (ts < startMs || ts > endMs) continue
      const date = shiftBankDate(s)
      m.set(date, (m.get(date) ?? 0) + s.cashInHand)
    }
    return m
  }, [shifts, bankRange])

  const bankDepositByDate = useMemo(() => {
    const m = new Map<string, typeof bankDeposits[number]>()
    for (const b of bankDeposits) m.set(b.depositDate, b)
    return m
  }, [bankDeposits])

  interface BankRow {
    depositDate: string
    expectedAmount: number
    persistedDepositedAmount: number | null
    persistedNotes: string | null
    persistedId: string | null
  }

  const bankRows: BankRow[] = useMemo(() => {
    const dates = new Set<string>(bankExpectedByDate.keys())
    // Also include any bankDeposit row whose date sits inside the range
    // but had no shift (e.g. correction entry).
    if (bankRange) {
      const startMs = bankRange.start.getTime()
      const endMs = bankRange.end.getTime()
      for (const b of bankDeposits) {
        const t = parseLocalDate(b.depositDate).getTime()
        if (t >= startMs && t <= endMs) dates.add(b.depositDate)
      }
    }
    const rows: BankRow[] = Array.from(dates).map((date) => {
      const persisted = bankDepositByDate.get(date) ?? null
      return {
        depositDate: date,
        expectedAmount: bankExpectedByDate.get(date) ?? (persisted?.expectedAmount ?? 0),
        persistedDepositedAmount: persisted ? persisted.depositedAmount : null,
        persistedNotes: persisted ? persisted.notes : null,
        persistedId: persisted ? persisted.id : null,
      }
    })
    return rows.sort((a, b) => b.depositDate.localeCompare(a.depositDate))
  }, [bankExpectedByDate, bankDeposits, bankDepositByDate, bankRange])

  function getBankDraft(row: BankRow): { depositedAmount: string; notes: string } {
    const draft = bankRowDrafts[row.depositDate]
    if (draft) return draft
    return {
      depositedAmount:
        row.persistedDepositedAmount != null ? String(row.persistedDepositedAmount) : '',
      notes: row.persistedNotes ?? '',
    }
  }

  function setBankDraft(date: string, patch: Partial<{ depositedAmount: string; notes: string }>) {
    setBankRowDrafts((prev) => ({
      ...prev,
      [date]: { ...(prev[date] ?? { depositedAmount: '', notes: '' }), ...patch },
    }))
  }

  async function handleSaveBankRow(row: BankRow) {
    const draft = getBankDraft(row)
    const depositedAmount = parseFloat(draft.depositedAmount)
    if (isNaN(depositedAmount) || depositedAmount < 0) {
      setBankError('Enter a valid deposited amount')
      return
    }
    setBankError(null)
    setBankSavingDate(row.depositDate)
    try {
      await upsertBankDeposit({
        depositDate: row.depositDate,
        expectedAmount: row.expectedAmount,
        depositedAmount,
        depositedByUserId: currentUser && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id) ? currentUser.id : null,
        notes: draft.notes ? draft.notes : null,
      })
      // Clear the local draft so the row picks up the persisted values.
      setBankRowDrafts((prev) => {
        const next: Record<string, { depositedAmount: string; notes: string }> = {}
        for (const [k, v] of Object.entries(prev)) {
          if (k !== row.depositDate) next[k] = v
        }
        return next
      })
    } catch (err) {
      setBankError(err instanceof Error ? err.message : 'Failed to save deposit')
    } finally {
      setBankSavingDate(null)
    }
  }

  // Range summary band totals — driven by current draft if user is editing.
  const bankSummary = bankRows.reduce(
    (acc, row) => {
      const draft = getBankDraft(row)
      const depParsed = parseFloat(draft.depositedAmount)
      const deposited = isNaN(depParsed) ? row.persistedDepositedAmount ?? 0 : depParsed
      acc.expected += row.expectedAmount
      acc.deposited += deposited
      acc.petty += row.expectedAmount - deposited
      return acc
    },
    { expected: 0, deposited: 0, petty: 0 },
  )

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
          {canExport && (
            <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    {EXPORT_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setExportPreset(p.value)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors border',
                          exportPreset === p.value
                            ? 'bg-primary text-on-primary border-primary'
                            : 'bg-surface-container text-on-surface-variant border-outline-variant hover:text-on-surface',
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {exportPreset === 'custom' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className={cn(INPUT, 'sm:w-40')}
                      />
                      <span className="text-on-surface-variant text-sm">→</span>
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className={cn(INPUT, 'sm:w-40')}
                      />
                    </div>
                  )}
                  {exportError && <p className="text-rose-600 text-xs">{exportError}</p>}
                </div>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={exporting}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-secondary-container text-on-surface text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
                >
                  {exporting ? 'Exporting…' : 'Export PDF'}
                </button>
              </div>
            </section>
          )}

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
                {FUEL_TYPES.map((ft) => (
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

      {activeTab === 'bank' && canSeeBankTab && (
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Date-range presets — independent of the PDF export presets above */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {EXPORT_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setBankPreset(p.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors border',
                      bankPreset === p.value
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-container text-on-surface-variant border-outline-variant hover:text-on-surface',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {bankPreset === 'custom' && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={bankCustomFrom}
                    onChange={(e) => setBankCustomFrom(e.target.value)}
                    className={cn(INPUT, 'sm:w-40')}
                  />
                  <span className="text-on-surface-variant text-sm">→</span>
                  <input
                    type="date"
                    value={bankCustomTo}
                    onChange={(e) => setBankCustomTo(e.target.value)}
                    className={cn(INPUT, 'sm:w-40')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Top summary band */}
          <div className="bg-secondary-container rounded-xl px-4 sm:px-5 py-3 flex flex-col gap-1">
            <p className="text-on-surface-variant text-xs font-medium">
              {bankRange
                ? `Range: ${formatRangeLabel(bankRange.start, bankRange.end)}`
                : 'Range: pick a valid window'}
            </p>
            <p className="text-on-surface text-sm font-semibold flex flex-wrap gap-x-4 gap-y-1">
              <span>Total expected: ₹{Math.round(bankSummary.expected).toLocaleString('en-IN')}</span>
              <span className="text-on-surface-variant">·</span>
              <span>Total deposited: ₹{Math.round(bankSummary.deposited).toLocaleString('en-IN')}</span>
              <span className="text-on-surface-variant">·</span>
              <span>
                Total petty cash:{' '}
                <span
                  className={cn(
                    bankSummary.petty < 0
                      ? 'text-rose-600'
                      : bankSummary.petty === 0
                      ? 'text-on-surface-variant'
                      : 'text-on-surface',
                  )}
                >
                  ₹{Math.round(bankSummary.petty).toLocaleString('en-IN')}
                </span>
              </span>
            </p>
          </div>

          {bankError && (
            <p className="text-rose-600 text-xs">{bankError}</p>
          )}

          {/* Desktop / tablet table */}
          <div className="hidden lg:block bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container border-b border-outline-variant">
                <tr>
                  <th className="text-left px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Date</th>
                  <th className="text-right px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Expected</th>
                  <th className="text-right px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Deposited</th>
                  <th className="text-right px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Petty Cash</th>
                  <th className="text-left px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider">Notes</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {bankRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-on-surface-variant text-sm">
                      No closed shifts in this range
                    </td>
                  </tr>
                ) : (
                  bankRows.map((row, i) => {
                    const draft = getBankDraft(row)
                    const depParsed = parseFloat(draft.depositedAmount)
                    const livePetty = isNaN(depParsed)
                      ? row.expectedAmount - (row.persistedDepositedAmount ?? 0)
                      : row.expectedAmount - depParsed
                    const persistedDepStr =
                      row.persistedDepositedAmount != null ? String(row.persistedDepositedAmount) : ''
                    const persistedNotesStr = row.persistedNotes ?? ''
                    const isDirty =
                      draft.depositedAmount !== persistedDepStr ||
                      draft.notes !== persistedNotesStr
                    const hasPersisted = row.persistedId !== null
                    const buttonLabel = hasPersisted ? (isDirty ? 'Save' : 'Edit') : 'Save'
                    const saving = bankSavingDate === row.depositDate
                    return (
                      <tr
                        key={row.depositDate}
                        className={cn('border-b border-outline-variant last:border-0', i % 2 ? 'bg-surface-container/30' : '')}
                      >
                        <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">
                          {formatDate(row.depositDate + 'T00:00:00')}
                        </td>
                        <td className="px-5 py-3 text-on-surface text-right whitespace-nowrap font-medium">
                          ₹{row.expectedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.depositedAmount}
                            onChange={(e) => setBankDraft(row.depositDate, { depositedAmount: e.target.value })}
                            placeholder="0.00"
                            className={cn(INPUT, 'text-right w-32 ml-auto')}
                          />
                        </td>
                        <td
                          className={cn(
                            'px-5 py-3 text-right whitespace-nowrap font-medium',
                            livePetty < 0
                              ? 'text-rose-600'
                              : livePetty === 0
                              ? 'text-on-surface-variant'
                              : 'text-on-surface',
                          )}
                        >
                          ₹{livePetty.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={draft.notes}
                            onChange={(e) => setBankDraft(row.depositDate, { notes: e.target.value })}
                            placeholder="optional…"
                            className={INPUT}
                          />
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => handleSaveBankRow(row)}
                            disabled={saving || (hasPersisted && !isDirty && !draft.depositedAmount)}
                            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                          >
                            {saving ? 'Saving…' : buttonLabel}
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile / tablet card list */}
          <div className="lg:hidden flex flex-col gap-3">
            {bankRows.length === 0 ? (
              <p className="text-on-surface-variant text-sm text-center py-6">
                No closed shifts in this range
              </p>
            ) : (
              bankRows.map((row) => {
                const draft = getBankDraft(row)
                const depParsed = parseFloat(draft.depositedAmount)
                const livePetty = isNaN(depParsed)
                  ? row.expectedAmount - (row.persistedDepositedAmount ?? 0)
                  : row.expectedAmount - depParsed
                const persistedDepStr =
                  row.persistedDepositedAmount != null ? String(row.persistedDepositedAmount) : ''
                const persistedNotesStr = row.persistedNotes ?? ''
                const isDirty =
                  draft.depositedAmount !== persistedDepStr ||
                  draft.notes !== persistedNotesStr
                const hasPersisted = row.persistedId !== null
                const buttonLabel = hasPersisted ? (isDirty ? 'Save' : 'Edit') : 'Save'
                const saving = bankSavingDate === row.depositDate
                return (
                  <div
                    key={row.depositDate}
                    className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-on-surface font-semibold text-sm">
                        {formatDate(row.depositDate + 'T00:00:00')}
                      </p>
                      <p className="text-on-surface-variant text-xs">
                        Expected{' '}
                        <span className="text-on-surface font-medium">
                          ₹{row.expectedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="block text-on-surface-variant text-xs font-medium mb-1">Deposited (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.depositedAmount}
                        onChange={(e) => setBankDraft(row.depositDate, { depositedAmount: e.target.value })}
                        placeholder="0.00"
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className="block text-on-surface-variant text-xs font-medium mb-1">Notes</label>
                      <input
                        type="text"
                        value={draft.notes}
                        onChange={(e) => setBankDraft(row.depositDate, { notes: e.target.value })}
                        placeholder="optional…"
                        className={INPUT}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          livePetty < 0
                            ? 'text-rose-600'
                            : livePetty === 0
                            ? 'text-on-surface-variant'
                            : 'text-on-surface',
                        )}
                      >
                        Petty cash: ₹{livePetty.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSaveBankRow(row)}
                        disabled={saving || (hasPersisted && !isDirty && !draft.depositedAmount)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {saving ? 'Saving…' : buttonLabel}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <p className="text-on-surface-variant text-xs">
            Expected = sum of each day's closed-shift cash-in-hand. Petty cash = expected − deposited
            (positive: kept aside; negative: investigate).
          </p>
        </div>
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
