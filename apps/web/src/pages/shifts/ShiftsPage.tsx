import { useState } from 'react'
import { useShiftsStore, type DateFilter, type EditShiftData } from '@/store/shiftsStore'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import type { Shift, User, FuelPrice } from '@/types'

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

interface OpenShiftModalProps {
  users: User[]
  currentUser: User
  onClose: () => void
  onSubmit: (salesmanId: string, salesmanName: string) => Promise<void>
}

function OpenShiftModal({ users, currentUser, onClose, onSubmit }: OpenShiftModalProps) {
  const salesmen = users.filter((u) => u.role === 'salesman')
  const isSalesman = currentUser.role === 'salesman'
  const defaultId = isSalesman ? currentUser.id : (salesmen[0]?.id ?? '')

  const [selectedId, setSelectedId] = useState(defaultId)
  const [submitting, setSubmitting] = useState(false)

  const selectedName = isSalesman
    ? currentUser.name
    : (salesmen.find((u) => u.id === selectedId)?.name ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    setSubmitting(true)
    await onSubmit(selectedId, selectedName)
    setSubmitting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-on-surface text-lg font-semibold mb-5">Open New Shift</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-on-surface-variant text-sm font-medium">Salesman</label>
            {isSalesman ? (
              <div className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container text-on-surface text-sm">
                {currentUser.name}
              </div>
            ) : (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              >
                {salesmen.length === 0 ? (
                  <option value="">No salesmen available</option>
                ) : (
                  salesmen.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))
                )}
              </select>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !selectedId} className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-60">
              {submitting ? 'Opening…' : 'Open Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface CloseShiftModalProps {
  shift: Shift
  fuelPrices: FuelPrice[]
  onClose: () => void
  onSubmit: (
    shiftId: string,
    cashCollected: number,
    expectedCash: number,
    msLitres: number,
    hsdLitres: number,
    msRevenue: number,
    hsdRevenue: number,
    dipVariancePct?: number,
  ) => Promise<void>
}

function CloseShiftModal({ shift, fuelPrices, onClose, onSubmit }: CloseShiftModalProps) {
  const [msClosing, setMsClosing] = useState('')
  const [msOpening, setMsOpening] = useState('')
  const [hsdClosing, setHsdClosing] = useState('')
  const [hsdOpening, setHsdOpening] = useState('')
  const [cashCollected, setCashCollected] = useState('')
  const [dipVariancePct, setDipVariancePct] = useState('0')
  const [submitting, setSubmitting] = useState(false)

  const msPrice = fuelPrices.find((p) => p.fuelType === 'MS')?.pricePerLitre ?? 0
  const hsdPrice = fuelPrices.find((p) => p.fuelType === 'HSD')?.pricePerLitre ?? 0

  const msLitres = msClosing !== '' && msOpening !== '' ? Math.max(0, Number(msClosing) - Number(msOpening)) : 0
  const hsdLitres = hsdClosing !== '' && hsdOpening !== '' ? Math.max(0, Number(hsdClosing) - Number(hsdOpening)) : 0
  const totalLitres = msLitres + hsdLitres
  const msRevenue = msLitres * msPrice
  const hsdRevenue = hsdLitres * hsdPrice
  const expectedCash = msRevenue + hsdRevenue
  const cashNum = cashCollected !== '' ? Number(cashCollected) : 0
  const cashVariance = cashCollected !== '' ? cashNum - expectedCash : 0
  const dipPct = dipVariancePct !== '' ? Number(dipVariancePct) : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await onSubmit(shift.id, cashNum, expectedCash, msLitres, hsdLitres, msRevenue, hsdRevenue, dipPct)
    setSubmitting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-on-surface text-lg font-semibold mb-1">Close Shift</h2>
        <p className="text-on-surface-variant text-sm mb-5">{shift.salesmanName}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <section className="flex flex-col gap-3">
            <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Meter Readings</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Petrol (MS) Closing', val: msClosing, set: setMsClosing },
                { label: 'MS Opening', val: msOpening, set: setMsOpening },
                { label: 'Diesel (HSD) Closing', val: hsdClosing, set: setHsdClosing },
                { label: 'HSD Opening', val: hsdOpening, set: setHsdOpening },
              ].map(({ label, val, set: setter }) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <label className="text-on-surface-variant text-sm font-medium">{label}</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={val} onChange={(e) => setter(e.target.value)}
                    placeholder="Reading"
                    className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              ))}
            </div>
            <div className="px-3 py-2.5 rounded-xl bg-surface-container text-sm text-on-surface-variant">
              MS: <span className="text-on-surface font-medium">{msLitres.toLocaleString('en-IN')} L</span>{' '}
              | HSD: <span className="text-on-surface font-medium">{hsdLitres.toLocaleString('en-IN')} L</span>{' '}
              | Total: <span className="text-on-surface font-medium">{totalLitres.toLocaleString('en-IN')} L</span>
            </div>
          </section>
          <section className="flex flex-col gap-3">
            <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Cash</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-on-surface-variant text-sm font-medium">Actual Cash Collected ₹</label>
              <input
                type="number" min="0" step="0.01"
                value={cashCollected} onChange={(e) => setCashCollected(e.target.value)}
                placeholder="Enter amount"
                className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="px-3 py-2.5 rounded-xl bg-surface-container text-sm flex flex-col gap-1">
              <span className="text-on-surface-variant">Expected: <span className="text-on-surface font-medium">₹{expectedCash.toLocaleString('en-IN')}</span></span>
              {cashCollected !== '' && (
                <span className={cn('font-medium', cashVariance >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                  Variance: {cashVariance >= 0 ? '+' : ''}₹{cashVariance.toLocaleString('en-IN')}
                </span>
              )}
            </div>
          </section>
          <section className="flex flex-col gap-3">
            <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">DIP Reading (Optional)</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-on-surface-variant text-sm font-medium">DIP Variance %</label>
              <input
                type="number" min="0" step="0.01"
                value={dipVariancePct} onChange={(e) => setDipVariancePct(e.target.value)}
                placeholder="0"
                className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </section>
          <div className="flex justify-end gap-3 mt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-60">
              {submitting ? 'Closing…' : 'Close Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface EditShiftModalProps {
  shift: Shift
  fuelPrices: FuelPrice[]
  onClose: () => void
  onSubmit: (shiftId: string, data: EditShiftData) => Promise<void>
}

function EditShiftModal({ shift, fuelPrices, onClose, onSubmit }: EditShiftModalProps) {
  const [msLitres, setMsLitres] = useState(String(shift.msLitres))
  const [hsdLitres, setHsdLitres] = useState(String(shift.hsdLitres))
  const [cashCollected, setCashCollected] = useState(String(shift.totalCashCollected))
  const [dipVariancePct, setDipVariancePct] = useState(String(shift.dipVariancePct))
  const [notes, setNotes] = useState(shift.notes ?? '')
  const [submitting, setSubmitting] = useState(false)

  const msPrice = fuelPrices.find((p) => p.fuelType === 'MS')?.pricePerLitre ?? 0
  const hsdPrice = fuelPrices.find((p) => p.fuelType === 'HSD')?.pricePerLitre ?? 0

  const msL = Number(msLitres) || 0
  const hsdL = Number(hsdLitres) || 0
  const msRev = msL * msPrice
  const hsdRev = hsdL * hsdPrice
  const expectedCash = msRev + hsdRev
  const cashNum = Number(cashCollected) || 0
  const cashVariance = cashNum - expectedCash

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await onSubmit(shift.id, {
      msLitres: msL,
      hsdLitres: hsdL,
      msRevenue: msRev,
      hsdRevenue: hsdRev,
      cashCollected: cashNum,
      expectedCash,
      dipVariancePct: Number(dipVariancePct) || 0,
      notes: notes || undefined,
    })
    setSubmitting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-on-surface text-lg font-semibold mb-1">Edit Shift</h2>
        <p className="text-on-surface-variant text-sm mb-5">{shift.salesmanName} · {new Date(shift.openedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-on-surface-variant text-sm font-medium">MS Litres Sold</label>
              <input type="number" min="0" step="0.01" value={msLitres} onChange={(e) => setMsLitres(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-on-surface-variant text-sm font-medium">HSD Litres Sold</label>
              <input type="number" min="0" step="0.01" value={hsdLitres} onChange={(e) => setHsdLitres(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="px-3 py-2.5 rounded-xl bg-surface-container text-sm text-on-surface-variant">
            Expected Cash: <span className="text-on-surface font-medium">₹{expectedCash.toLocaleString('en-IN')}</span>
            {cashCollected !== '' && (
              <span className={cn('ml-3 font-medium', cashVariance >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                Variance: {cashVariance >= 0 ? '+' : ''}₹{cashVariance.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-on-surface-variant text-sm font-medium">Actual Cash Collected ₹</label>
            <input type="number" min="0" step="0.01" value={cashCollected} onChange={(e) => setCashCollected(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-on-surface-variant text-sm font-medium">DIP Variance %</label>
            <input type="number" min="0" step="0.01" value={dipVariancePct} onChange={(e) => setDipVariancePct(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-on-surface-variant text-sm font-medium">Notes (optional)</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          <div className="flex justify-end gap-3 mt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-60">
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ShiftsPage() {
  const { shifts, loading, dateFilter, statusFilter, setDateFilter, setStatusFilter, openShift, closeShift, editShift, deleteShift, flagShift } =
    useShiftsStore()
  const { users, fuelPrices } = useAppStore()
  const currentUser = useAuthStore((s) => s.currentUser)

  const [openShiftModal, setOpenShiftModal] = useState(false)
  const [shiftToClose, setShiftToClose] = useState<Shift | null>(null)
  const [shiftToEdit, setShiftToEdit] = useState<Shift | null>(null)

  if (!currentUser) return null

  const isOwnerOrManager = currentUser.role === 'owner' || currentUser.role === 'manager'

  const filteredShifts =
    statusFilter === 'all' ? shifts : shifts.filter((s) => s.status === statusFilter)

  const displayedShifts =
    currentUser.role === 'salesman'
      ? filteredShifts.filter((s) => s.salesmanId === currentUser.id)
      : filteredShifts

  function handleDelete(shift: Shift) {
    if (!confirm(`Delete this shift for ${shift.salesmanName}? This cannot be undone.`)) return
    deleteShift(shift.id)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-on-surface text-2xl font-bold">Shifts</h1>
          <p className="text-on-surface-variant text-sm">
            {displayedShifts.length} shift{displayedShifts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setOpenShiftModal(true)}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity"
        >
          Open New Shift
        </button>
      </div>

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

      {loading ? (
        <p className="text-on-surface-variant text-sm">Loading…</p>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                {['Salesman', 'Date', 'Litres', 'Revenue', 'Cash Variance', 'DIP Var%', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedShifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-on-surface-variant text-sm">No shifts found</td>
                </tr>
              ) : (
                displayedShifts.map((shift, i) => (
                  <tr key={shift.id} className={cn('border-b border-outline-variant last:border-0', i % 2 ? 'bg-surface-container-low/30' : '')}>
                    <td className="px-5 py-3 font-medium text-on-surface whitespace-nowrap">{shift.salesmanName}</td>
                    <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">
                      {new Date(shift.openedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-5 py-3 text-on-surface text-right whitespace-nowrap">
                      {shift.totalLitresSold > 0 ? `${shift.totalLitresSold.toLocaleString('en-IN')} L` : '—'}
                    </td>
                    <td className="px-5 py-3 text-on-surface text-right whitespace-nowrap">
                      {shift.totalCashCollected > 0 ? `₹${shift.totalCashCollected.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {shift.cashVariance !== 0 ? (
                        <span className={cn('font-medium', shift.cashVariance < 0 ? 'text-rose-600' : 'text-emerald-600')}>
                          {shift.cashVariance > 0 ? '+' : ''}₹{shift.cashVariance.toLocaleString('en-IN')}
                        </span>
                      ) : <span className="text-on-surface-variant">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {shift.dipVariancePct > 0 ? (
                        <span className={cn('font-medium', shift.dipVariancePct > 2 ? 'text-red-600' : shift.dipVariancePct > 0.5 ? 'text-amber-600' : 'text-emerald-600')}>
                          {shift.dipVariancePct}%
                        </span>
                      ) : <span className="text-on-surface-variant">—</span>}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-semibold capitalize', STATUS_STYLES[shift.status] ?? 'bg-gray-100 text-gray-500')}>
                        {shift.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {shift.status === 'open' && (
                          <button onClick={() => setShiftToClose(shift)} className="px-3 py-1 rounded-lg text-xs font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors">
                            Close
                          </button>
                        )}
                        {shift.status !== 'open' && (
                          <button onClick={() => setShiftToEdit(shift)} className="px-3 py-1 rounded-lg text-xs font-medium border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors">
                            Edit
                          </button>
                        )}
                        {isOwnerOrManager && shift.status === 'open' && (
                          <button onClick={() => flagShift(shift.id)} className="px-3 py-1 rounded-lg text-xs font-medium border border-rose-300 text-rose-700 hover:bg-rose-50 transition-colors">
                            Flag
                          </button>
                        )}
                        {isOwnerOrManager && (
                          <button onClick={() => handleDelete(shift)} className="p-1 rounded-lg text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 transition-colors">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {openShiftModal && (
        <OpenShiftModal
          users={users}
          currentUser={currentUser}
          onClose={() => setOpenShiftModal(false)}
          onSubmit={async (salesmanId, salesmanName) => { await openShift(salesmanId, salesmanName) }}
        />
      )}

      {shiftToClose && (
        <CloseShiftModal
          shift={shiftToClose}
          fuelPrices={fuelPrices}
          onClose={() => setShiftToClose(null)}
          onSubmit={closeShift}
        />
      )}

      {shiftToEdit && (
        <EditShiftModal
          shift={shiftToEdit}
          fuelPrices={fuelPrices}
          onClose={() => setShiftToEdit(null)}
          onSubmit={editShift}
        />
      )}
    </div>
  )
}
