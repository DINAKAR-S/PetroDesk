import { Fragment, useEffect, useMemo, useState } from 'react'
import { useShiftsStore, type DateFilter, type OpeningReading } from '@/store/shiftsStore'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { cn, formatINR } from '@/lib/utils'
import { FUEL_LABELS } from '@/lib/constants'
import type {
  Shift,
  NozzleReading,
  User,
  DispenserUnit,
  FuelType,
  NozzleSlot,
  OtherSalesItem,
  ElectronicMethod,
  ExpenseCategory,
  Customer,
} from '@/types'

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

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function duLabel(dispenserUnits: DispenserUnit[], duId: string): string {
  const du = dispenserUnits.find((d) => d.id === duId)
  if (!du) return 'DU —'
  return `DU ${du.number}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Open Shift Modal
// ─────────────────────────────────────────────────────────────────────────────

interface OpenShiftModalProps {
  users: User[]
  dispenserUnits: DispenserUnit[]
  currentUser: User
  onClose: () => void
}

export function OpenShiftModal({ users, dispenserUnits, currentUser, onClose }: OpenShiftModalProps) {
  const openShift = useShiftsStore((s) => s.openShift)
  const getOpeningReadingsForDU = useShiftsStore((s) => s.getOpeningReadingsForDU)

  const salesmen = useMemo(() => users.filter((u) => u.role === 'salesman'), [users])
  const isSalesman = currentUser.role === 'salesman'

  const [duId, setDuId] = useState<string>(dispenserUnits[0]?.id ?? '')
  const [salesmanId, setSalesmanId] = useState<string>(
    isSalesman ? currentUser.id : (salesmen[0]?.id ?? ''),
  )
  const [openings, setOpenings] = useState<OpeningReading[]>([])
  const [loadingReadings, setLoadingReadings] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!duId) {
      setOpenings([])
      return
    }
    let cancelled = false
    setLoadingReadings(true)
    getOpeningReadingsForDU(duId)
      .then((rows) => {
        if (!cancelled) setOpenings(rows)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load opening readings')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingReadings(false)
      })
    return () => {
      cancelled = true
    }
  }, [duId, getOpeningReadingsForDU])

  const salesmanName = isSalesman
    ? currentUser.name
    : (salesmen.find((u) => u.id === salesmanId)?.name ?? '')

  const noNozzles = !loadingReadings && openings.length === 0 && duId !== ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!duId) {
      setError('Select a dispenser unit')
      return
    }
    if (!salesmanId) {
      setError('Select a salesman')
      return
    }
    if (noNozzles) {
      setError('Configure nozzles for this DU in Settings first.')
      return
    }
    setSubmitting(true)
    try {
      await openShift({
        dispenserUnitId: duId,
        salesmanId,
        salesmanName,
        openings,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open shift')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex sm:items-center sm:justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest w-full h-full sm:h-auto sm:max-w-2xl sm:mx-4 sm:rounded-2xl sm:max-h-[90vh] shadow-xl p-4 sm:p-6 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-on-surface text-lg font-semibold mb-5">Open New Shift</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Dispenser Unit */}
          <div className="flex flex-col gap-1.5">
            <label className="text-on-surface-variant text-sm font-medium">Dispenser Unit</label>
            {dispenserUnits.length === 0 ? (
              <div className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container text-sm text-on-surface-variant">
                Add a dispenser unit in Settings first.
              </div>
            ) : (
              <select
                value={duId}
                onChange={(e) => setDuId(e.target.value)}
                className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              >
                {dispenserUnits.map((d) => (
                  <option key={d.id} value={d.id}>
                    DU {d.number}
                    {d.displayName ? ` · ${d.displayName}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Salesman */}
          <div className="flex flex-col gap-1.5">
            <label className="text-on-surface-variant text-sm font-medium">Salesman</label>
            {isSalesman ? (
              <div className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container text-on-surface text-sm">
                {currentUser.name}
              </div>
            ) : salesmen.length === 0 ? (
              <div className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container text-sm text-on-surface-variant">
                Add a salesman in Settings first.
              </div>
            ) : (
              <select
                value={salesmanId}
                onChange={(e) => setSalesmanId(e.target.value)}
                className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              >
                {salesmen.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Nozzle openings (read-only) */}
          <div className="flex flex-col gap-2">
            <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
              Opening Readings
            </h3>
            {loadingReadings ? (
              <div className="px-3 py-3 rounded-xl bg-surface-container text-sm text-on-surface-variant">
                Loading openings…
              </div>
            ) : noNozzles ? (
              <div className="px-3 py-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700">
                Configure nozzles for this DU in Settings first.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {openings.map((o, i) => (
                  <div
                    key={o.nozzleId}
                    className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container/40"
                  >
                    <div className="text-on-surface text-sm font-medium">
                      Nozzle {o.slot} — {FUEL_LABELS[o.fuelType]} — {o.nozzleName}
                    </div>
                    {isSalesman ? (
                      <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-on-surface-variant">
                        <div>
                          CumVolume:{' '}
                          <span className="text-on-surface font-medium">
                            {o.openingCumVolume.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          CumSale:{' '}
                          <span className="text-on-surface font-medium">
                            ₹{o.openingCumSale.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1 text-xs text-on-surface-variant">
                          CumVolume (L)
                          <input
                            type="number"
                            step="0.001"
                            inputMode="decimal"
                            value={o.openingCumVolume}
                            onChange={(e) => {
                              const v = e.target.value === '' ? 0 : Number(e.target.value)
                              setOpenings((prev) =>
                                prev.map((p, idx) =>
                                  idx === i ? { ...p, openingCumVolume: v } : p,
                                ),
                              )
                            }}
                            className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm text-on-surface"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-on-surface-variant">
                          CumSale (₹)
                          <input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            value={o.openingCumSale}
                            onChange={(e) => {
                              const v = e.target.value === '' ? 0 : Number(e.target.value)
                              setOpenings((prev) =>
                                prev.map((p, idx) =>
                                  idx === i ? { ...p, openingCumSale: v } : p,
                                ),
                              )
                            }}
                            className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm text-on-surface"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                ))}
                {isSalesman && openings.length > 0 && (
                  <p className="text-xs text-on-surface-variant italic">
                    If a value is wrong, ask your manager to fix it before closing.
                  </p>
                )}
                {!isSalesman && openings.length > 0 && (
                  <p className="text-xs text-on-surface-variant italic">
                    Pre-filled from the last shift. Override with the current slip values if needed before opening.
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting || !duId || !salesmanId || loadingReadings || noNozzles
              }
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submitting ? 'Opening…' : 'Open Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Opening Readings Modal (manager + owner only)
// ─────────────────────────────────────────────────────────────────────────────

interface EditOpeningReadingsModalProps {
  shift: Shift
  onClose: () => void
}

interface EditableOpeningRow {
  nozzleId: string
  nozzleName: string
  fuelType: FuelType
  slot: NozzleSlot
  openingCumVolume: string
  openingCumSale: string
}

export function EditOpeningReadingsModal({ shift, onClose }: EditOpeningReadingsModalProps) {
  const loadNozzleReadings = useShiftsStore((s) => s.loadNozzleReadings)
  const updateOpeningReadings = useShiftsStore((s) => s.updateOpeningReadings)
  const readings = useShiftsStore((s) =>
    s.nozzleReadings.filter((r) => r.shiftId === shift.id),
  )

  const [rows, setRows] = useState<EditableOpeningRow[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadNozzleReadings(shift.id).then(() => {
      if (!cancelled) setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [loadNozzleReadings, shift.id])

  // Hydrate rows from store readings once available; sort by slot
  useEffect(() => {
    if (!hydrated) return
    if (rows.length > 0) return
    const sorted = [...readings].sort((a, b) => a.slot - b.slot)
    setRows(
      sorted.map((r) => ({
        nozzleId: r.nozzleId,
        nozzleName: r.nozzleName,
        fuelType: r.fuelType,
        slot: r.slot,
        openingCumVolume: String(r.openingCumVolume),
        openingCumSale: String(r.openingCumSale),
      })),
    )
  }, [hydrated, readings, rows.length])

  function updateRow(idx: number, patch: Partial<EditableOpeningRow>): void {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload: OpeningReading[] = rows.map((r) => ({
        nozzleId: r.nozzleId,
        nozzleName: r.nozzleName,
        fuelType: r.fuelType,
        slot: r.slot,
        openingCumVolume: Number(r.openingCumVolume) || 0,
        openingCumSale: Number(r.openingCumSale) || 0,
      }))
      await updateOpeningReadings(shift.id, payload)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update openings')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex sm:items-center sm:justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest w-full h-full sm:h-auto sm:max-w-2xl sm:mx-4 sm:rounded-2xl sm:max-h-[90vh] shadow-xl p-4 sm:p-6 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-on-surface text-lg font-semibold mb-1">Edit Opening Readings</h2>
        <p className="text-on-surface-variant text-sm mb-5">
          {shift.salesmanName} · opened {formatTime(shift.openedAt)}
        </p>

        {!hydrated ? (
          <p className="text-on-surface-variant text-sm">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-on-surface-variant text-sm">No nozzle readings to edit.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {rows.map((r, i) => (
              <div
                key={r.nozzleId}
                className="px-3 py-3 rounded-xl border border-outline-variant bg-surface-container/40 flex flex-col gap-2"
              >
                <div className="text-on-surface text-sm font-medium">
                  Nozzle {r.slot} — {FUEL_LABELS[r.fuelType]} — {r.nozzleName}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-on-surface-variant text-xs">CumVolume</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={r.openingCumVolume}
                      onChange={(e) => updateRow(i, { openingCumVolume: e.target.value })}
                      className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-on-surface-variant text-xs">CumSale (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={r.openingCumSale}
                      onChange={(e) => updateRow(i, { openingCumSale: e.target.value })}
                      className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </div>
            ))}

            {error && (
              <div className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {submitting ? 'Saving…' : 'Save Openings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Close Shift Modal
// ─────────────────────────────────────────────────────────────────────────────

interface CloseShiftModalProps {
  shift: Shift
  onClose: () => void
}

interface ClosingRowState {
  nozzleId: string
  nozzleName: string
  fuelType: FuelType
  slot: NozzleSlot
  openingCumVolume: number
  openingCumSale: number
  closingCumVolume: string
  closingCumSale: string
}

// ─── Close Shift modal: section row types ────────────────────

interface OtherSalesRowState {
  itemId: string | null
  itemName: string
  quantity: number
  amount: number
}

interface ElectronicRowState {
  methodId: string | null
  methodName: string
  amount: number
}

interface CreditRowState {
  customerId: string | null
  customerName: string
  amount: number
}

interface ExpenseRowState {
  categoryId: string | null
  categoryName: string
  amount: number
  description: string | null
}

// ─── Customer Search subcomponent (for credit section) ────────

interface CustomerSearchProps {
  customers: Customer[]
  onPick: (customer: Customer) => void
}

function CustomerSearch({ customers, onPick }: CustomerSearchProps) {
  const findOrCreateCustomerByName = useAppStore((s) => s.findOrCreateCustomerByName)
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q === '') return []
    return customers
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [customers, query])

  async function handleCreate(): Promise<void> {
    setCreateError(null)
    const name = newName.trim()
    if (name === '') {
      setCreateError('Enter a customer name')
      return
    }
    setCreating(true)
    try {
      const phoneVal = newPhone.trim() === '' ? null : newPhone.trim()
      const created = await findOrCreateCustomerByName(name, phoneVal)
      onPick(created)
      setQuery('')
      setNewName('')
      setNewPhone('')
      setShowCreate(false)
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create customer')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setShowCreate(false)
        }}
        placeholder="Search customer by name…"
        className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {query.trim() !== '' && !showCreate && (
        <div className="flex flex-col gap-1">
          {matches.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onPick(c)
                setQuery('')
              }}
              className="text-left px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest hover:bg-surface-container text-sm text-on-surface"
            >
              <div className="font-medium">{c.name}</div>
              {c.phone && (
                <div className="text-xs text-on-surface-variant">{c.phone}</div>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setNewName(query.trim())
              setShowCreate(true)
            }}
            className="text-left px-3 py-2 rounded-lg border border-dashed border-outline-variant bg-surface-container/40 hover:bg-surface-container text-sm text-primary"
          >
            + Add new customer "{query.trim()}" (phone optional)
          </button>
        </div>
      )}
      {showCreate && (
        <div className="flex flex-col gap-2 p-3 rounded-xl border border-outline-variant bg-surface-container/40">
          <div className="flex flex-col gap-1">
            <label className="text-on-surface-variant text-xs">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-on-surface-variant text-xs">Phone (optional)</label>
            <input
              type="tel"
              inputMode="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {createError && (
            <div className="text-xs text-rose-700">{createError}</div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant bg-surface-container hover:bg-surface-container-high"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-on-primary hover:opacity-90 disabled:opacity-60"
            >
              {creating ? 'Saving…' : 'Save customer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Per-catalog inline-add row subcomponents ─────────────────

interface OtherSalesCatalogRowProps {
  item: OtherSalesItem
  onAdd: (entry: OtherSalesRowState) => void
}

function OtherSalesCatalogRow({ item, onAdd }: OtherSalesCatalogRowProps) {
  const options = item.quantityOptions.length > 0 ? item.quantityOptions : [1]
  const [qty, setQty] = useState<number>(options[0])
  const amount = qty * item.pricePerLitre

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-end px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex flex-col gap-0.5">
        <span className="text-on-surface text-sm font-medium">{item.name}</span>
        <span className="text-on-surface-variant text-xs">
          ₹{item.pricePerLitre.toLocaleString('en-IN')}/L
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-on-surface-variant text-xs">Quantity</label>
        <select
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o} L
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-0.5 min-w-[5rem]">
        <span className="text-on-surface-variant text-xs">Amount</span>
        <span className="text-on-surface font-medium text-sm">
          ₹{amount.toLocaleString('en-IN')}
        </span>
      </div>
      <button
        type="button"
        onClick={() =>
          onAdd({
            itemId: item.id,
            itemName: item.name,
            quantity: qty,
            amount,
          })
        }
        className="px-3 py-2 rounded-lg text-xs font-medium bg-primary text-on-primary hover:opacity-90"
      >
        + Add
      </button>
    </div>
  )
}

interface ElectronicCatalogRowProps {
  method: ElectronicMethod
  onAdd: (entry: ElectronicRowState) => void
}

function ElectronicCatalogRow({ method, onAdd }: ElectronicCatalogRowProps) {
  const [amount, setAmount] = useState('')
  const num = amount === '' ? 0 : Number(amount)

  function handleAdd(): void {
    if (amount === '' || Number.isNaN(num) || num <= 0) return
    onAdd({ methodId: method.id, methodName: method.name, amount: num })
    setAmount('')
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex flex-col gap-0.5">
        <span className="text-on-surface text-sm font-medium">{method.name}</span>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-on-surface-variant text-xs">Amount (₹)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm w-32"
        />
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={amount === '' || Number.isNaN(num) || num <= 0}
        className="px-3 py-2 rounded-lg text-xs font-medium bg-primary text-on-primary hover:opacity-90 disabled:opacity-50"
      >
        + Add
      </button>
    </div>
  )
}

interface ExpenseCatalogRowProps {
  category: ExpenseCategory
  onAdd: (entry: ExpenseRowState) => void
}

function ExpenseCatalogRow({ category, onAdd }: ExpenseCatalogRowProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const num = amount === '' ? 0 : Number(amount)

  function handleAdd(): void {
    if (amount === '' || Number.isNaN(num) || num <= 0) return
    onAdd({
      categoryId: category.id,
      categoryName: category.name,
      amount: num,
      description: description.trim() === '' ? null : description.trim(),
    })
    setAmount('')
    setDescription('')
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex flex-col gap-0.5">
        <span className="text-on-surface text-sm font-medium">{category.name}</span>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-on-surface-variant text-xs">Description (optional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Note…"
          className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-on-surface-variant text-xs">Amount (₹)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm w-32"
        />
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={amount === '' || Number.isNaN(num) || num <= 0}
        className="px-3 py-2 rounded-lg text-xs font-medium bg-primary text-on-primary hover:opacity-90 disabled:opacity-50"
      >
        + Add
      </button>
    </div>
  )
}

export function CloseShiftModal({ shift, onClose }: CloseShiftModalProps) {
  const loadNozzleReadings = useShiftsStore((s) => s.loadNozzleReadings)
  const closeShift = useShiftsStore((s) => s.closeShift)
  const readings = useShiftsStore((s) =>
    s.nozzleReadings.filter((r) => r.shiftId === shift.id),
  )

  // Phase 2 catalogs
  const otherSalesItems = useAppStore((s) => s.otherSalesItems)
  const electronicMethods = useAppStore((s) => s.electronicMethods)
  const expenseCategoriesCatalog = useAppStore((s) => s.expenseCategories)
  const customers = useAppStore((s) => s.customers)

  const activeOtherSalesItems = useMemo(
    () => otherSalesItems.filter((i) => i.active),
    [otherSalesItems],
  )
  const activeElectronicMethods = useMemo(
    () => electronicMethods.filter((m) => m.active),
    [electronicMethods],
  )
  const activeExpenseCategories = useMemo(
    () => expenseCategoriesCatalog.filter((c) => c.active),
    [expenseCategoriesCatalog],
  )

  const [rows, setRows] = useState<ClosingRowState[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Section state
  const [testing, setTesting] = useState({
    msVolume: '',
    msSale: '',
    hsdVolume: '',
    hsdSale: '',
  })
  const [otherSalesEntries, setOtherSalesEntries] = useState<OtherSalesRowState[]>([])
  const [electronicEntries, setElectronicEntries] = useState<ElectronicRowState[]>([])
  const [creditEntries, setCreditEntries] = useState<CreditRowState[]>([])
  const [expenseEntries, setExpenseEntries] = useState<ExpenseRowState[]>([])

  // Credit section: picked customer + amount input
  const [creditCustomer, setCreditCustomer] = useState<Customer | null>(null)
  const [creditAmount, setCreditAmount] = useState('')

  // Cash + handover
  const [cashInHand, setCashInHand] = useState('')
  const [handoverToNext, setHandoverToNext] = useState('')
  const [depositToOwner, setDepositToOwner] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadNozzleReadings(shift.id).then(() => {
      if (!cancelled) setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [loadNozzleReadings, shift.id])

  useEffect(() => {
    if (!hydrated) return
    if (rows.length > 0) return
    const sorted = [...readings].sort((a, b) => a.slot - b.slot)
    setRows(
      sorted.map((r) => ({
        nozzleId: r.nozzleId,
        nozzleName: r.nozzleName,
        fuelType: r.fuelType,
        slot: r.slot,
        openingCumVolume: r.openingCumVolume,
        openingCumSale: r.openingCumSale,
        closingCumVolume: '',
        closingCumSale: '',
      })),
    )
  }, [hydrated, readings, rows.length])

  function updateRow(idx: number, patch: Partial<ClosingRowState>): void {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  // Live calculations from local form state (no useEffect setState loop)
  interface RowDelta {
    litres: number
    rupees: number
    invalid: boolean
  }
  function rowDelta(r: ClosingRowState): RowDelta {
    const cv = r.closingCumVolume === '' ? null : Number(r.closingCumVolume)
    const cs = r.closingCumSale === '' ? null : Number(r.closingCumSale)
    const hasBoth = cv !== null && cs !== null && !Number.isNaN(cv) && !Number.isNaN(cs)
    if (!hasBoth) return { litres: 0, rupees: 0, invalid: false }
    const litres = cv - r.openingCumVolume
    const rupees = cs - r.openingCumSale
    const invalid = cv < r.openingCumVolume || cs < r.openingCumSale
    return { litres, rupees, invalid }
  }

  const allRowsFilled =
    rows.length > 0 && rows.every((r) => r.closingCumVolume !== '' && r.closingCumSale !== '')
  const anyInvalid = rows.some((r) => rowDelta(r).invalid)

  // One pass over rows produces every total + per-fuel split.
  const totals = rows.reduce(
    (acc, r) => {
      const { litres, rupees } = rowDelta(r)
      const L = Math.max(0, litres)
      const R = Math.max(0, rupees)
      acc.totalLitres += L
      acc.totalRevenue += R
      if (r.fuelType === 'MS') {
        acc.msLitres += L
        acc.msRevenue += R
      } else {
        acc.hsdLitres += L
        acc.hsdRevenue += R
      }
      return acc
    },
    { totalLitres: 0, totalRevenue: 0, msLitres: 0, hsdLitres: 0, msRevenue: 0, hsdRevenue: 0 },
  )
  const { totalLitres, totalRevenue, msLitres, hsdLitres, msRevenue, hsdRevenue } = totals

  // Testing parsed numbers
  const testingNums = {
    msVolume: testing.msVolume === '' ? 0 : Number(testing.msVolume) || 0,
    msSale: testing.msSale === '' ? 0 : Number(testing.msSale) || 0,
    hsdVolume: testing.hsdVolume === '' ? 0 : Number(testing.hsdVolume) || 0,
    hsdSale: testing.hsdSale === '' ? 0 : Number(testing.hsdSale) || 0,
  }
  const testingTotalVolume = testingNums.msVolume + testingNums.hsdVolume
  const testingTotalSale = testingNums.msSale + testingNums.hsdSale

  // Adjusted totals (after subtracting testing volume/sale)
  const adjustedLitres = totalLitres - testingTotalVolume
  const adjustedRevenue = totalRevenue - testingTotalSale

  // Section sub-totals
  const totalOtherSales = otherSalesEntries.reduce((sum, e) => sum + e.amount, 0)
  const totalElectronic = electronicEntries.reduce((sum, e) => sum + e.amount, 0)
  const totalCredit = creditEntries.reduce((sum, e) => sum + e.amount, 0)
  const totalExpensesAmt = expenseEntries.reduce((sum, e) => sum + e.amount, 0)

  // Cash Expected (live):
  // Adjusted Revenue + Other Sales − Electronic − Credit − Expenses
  const cashExpected =
    adjustedRevenue + totalOtherSales - totalElectronic - totalCredit - totalExpensesAmt

  const cashFilled = cashInHand !== ''
  const cashInHandNum = cashFilled ? Number(cashInHand) || 0 : 0
  const cashVariance = cashFilled ? cashInHandNum - cashExpected : 0

  const handoverNum = handoverToNext === '' ? 0 : Number(handoverToNext) || 0
  const depositNum = depositToOwner === '' ? 0 : Number(depositToOwner) || 0
  const handoverSum = handoverNum + depositNum
  const handoverMatches = cashFilled && Math.abs(handoverSum - cashInHandNum) < 0.005

  function handleAddOtherSale(entry: OtherSalesRowState): void {
    setOtherSalesEntries((prev) => [...prev, entry])
  }
  function handleRemoveOtherSale(idx: number): void {
    setOtherSalesEntries((prev) => prev.filter((_, i) => i !== idx))
  }
  function handleAddElectronic(entry: ElectronicRowState): void {
    setElectronicEntries((prev) => [...prev, entry])
  }
  function handleRemoveElectronic(idx: number): void {
    setElectronicEntries((prev) => prev.filter((_, i) => i !== idx))
  }
  function handleAddCredit(): void {
    if (!creditCustomer) return
    const num = creditAmount === '' ? 0 : Number(creditAmount)
    if (Number.isNaN(num) || num <= 0) return
    setCreditEntries((prev) => [
      ...prev,
      {
        customerId: creditCustomer.id,
        customerName: creditCustomer.name,
        amount: num,
      },
    ])
    setCreditCustomer(null)
    setCreditAmount('')
  }
  function handleRemoveCredit(idx: number): void {
    setCreditEntries((prev) => prev.filter((_, i) => i !== idx))
  }
  function handleAddExpense(entry: ExpenseRowState): void {
    setExpenseEntries((prev) => [...prev, entry])
  }
  function handleRemoveExpense(idx: number): void {
    setExpenseEntries((prev) => prev.filter((_, i) => i !== idx))
  }

  const submitDisabled =
    submitting ||
    anyInvalid ||
    !allRowsFilled ||
    !cashFilled ||
    !handoverMatches

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (anyInvalid) {
      setError('Closing values cannot be less than opening for any field.')
      return
    }
    if (!allRowsFilled) {
      setError('Enter closing values for all nozzles.')
      return
    }
    if (!cashFilled) {
      setError('Enter cash in hand.')
      return
    }
    if (!handoverMatches) {
      setError('Handover + Deposit must equal Cash in Hand.')
      return
    }
    setSubmitting(true)
    try {
      await closeShift({
        shiftId: shift.id,
        closings: rows.map((r) => ({
          nozzleId: r.nozzleId,
          closingCumVolume: Number(r.closingCumVolume),
          closingCumSale: Number(r.closingCumSale),
        })),
        testing: testingNums,
        otherSales: otherSalesEntries.map((e) => ({
          itemId: e.itemId,
          itemName: e.itemName,
          quantity: e.quantity,
          amount: e.amount,
        })),
        electronic: electronicEntries.map((e) => ({
          methodId: e.methodId,
          methodName: e.methodName,
          amount: e.amount,
        })),
        credit: creditEntries.map((e) => ({
          customerId: e.customerId,
          customerName: e.customerName,
          amount: e.amount,
        })),
        expenses: expenseEntries.map((e) => ({
          categoryId: e.categoryId,
          categoryName: e.categoryName,
          amount: e.amount,
          description: e.description,
        })),
        cashInHand: cashInHandNum,
        handoverToNext: handoverNum,
        depositToOwner: depositNum,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to close shift')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex sm:items-center sm:justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest w-full h-full sm:h-auto sm:max-w-3xl sm:mx-4 sm:rounded-2xl sm:max-h-[90vh] shadow-xl p-4 sm:p-6 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-on-surface text-lg font-semibold mb-1">Close Shift</h2>
        <p className="text-on-surface-variant text-sm mb-5">
          {shift.salesmanName} · opened {formatTime(shift.openedAt)}
        </p>

        {!hydrated ? (
          <p className="text-on-surface-variant text-sm">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-on-surface-variant text-sm">No nozzle readings to close.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* A. Per-nozzle rows */}
            <section className="flex flex-col gap-3 bg-surface-container/40 border border-outline-variant rounded-xl p-4">
              <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
                A. Meter Readings
              </h3>
              {rows.map((r, i) => {
                const d = rowDelta(r)
                return (
                  <div
                    key={r.nozzleId}
                    className="px-3 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest flex flex-col gap-2"
                  >
                    <div className="text-on-surface text-sm font-medium">
                      Nozzle {r.slot} — {FUEL_LABELS[r.fuelType]} — {r.nozzleName}
                    </div>

                    {/* Start (read-only) */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-on-surface-variant uppercase tracking-wider">
                          Start CumVolume
                        </span>
                        <span className="text-on-surface font-medium">
                          {r.openingCumVolume.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-on-surface-variant uppercase tracking-wider">
                          Start CumSale
                        </span>
                        <span className="text-on-surface font-medium">
                          ₹{r.openingCumSale.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* End (inputs) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-on-surface-variant text-xs">End CumVolume</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={r.closingCumVolume}
                          onChange={(e) => updateRow(i, { closingCumVolume: e.target.value })}
                          placeholder="Closing"
                          className={cn(
                            'w-full px-3 py-2.5 sm:py-2 rounded-xl border bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30',
                            r.closingCumVolume !== '' &&
                              Number(r.closingCumVolume) < r.openingCumVolume
                              ? 'border-rose-300'
                              : 'border-outline-variant',
                          )}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-on-surface-variant text-xs">End CumSale (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={r.closingCumSale}
                          onChange={(e) => updateRow(i, { closingCumSale: e.target.value })}
                          placeholder="Closing"
                          className={cn(
                            'w-full px-3 py-2.5 sm:py-2 rounded-xl border bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30',
                            r.closingCumSale !== '' &&
                              Number(r.closingCumSale) < r.openingCumSale
                              ? 'border-rose-300'
                              : 'border-outline-variant',
                          )}
                        />
                      </div>
                    </div>

                    {/* Delta (live) */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-outline-variant">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-on-surface-variant uppercase tracking-wider">
                          Δ Litres
                        </span>
                        <span
                          className={cn(
                            'font-medium',
                            d.invalid
                              ? 'text-rose-600'
                              : d.litres > 0
                              ? 'text-on-surface'
                              : 'text-on-surface-variant',
                          )}
                        >
                          {d.litres.toLocaleString('en-IN')} L
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-on-surface-variant uppercase tracking-wider">
                          Δ Sale
                        </span>
                        <span
                          className={cn(
                            'font-medium',
                            d.invalid
                              ? 'text-rose-600'
                              : d.rupees > 0
                              ? 'text-on-surface'
                              : 'text-on-surface-variant',
                          )}
                        >
                          ₹{d.rupees.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </section>

            {/* B. Totals */}
            <section className="flex flex-col gap-2 bg-surface-container/40 border border-outline-variant rounded-xl p-4">
              <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
                B. Totals
              </h3>
              <div className="grid grid-cols-2 gap-2 px-3 py-3 rounded-xl bg-surface-container">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-on-surface-variant uppercase tracking-wider">
                    Total Volume
                  </span>
                  <span className="text-on-surface font-semibold">
                    {totalLitres.toLocaleString('en-IN')} L
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-on-surface-variant uppercase tracking-wider">
                    Total Revenue
                  </span>
                  <span className="text-on-surface font-semibold">
                    {formatINR(totalRevenue)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs px-3 py-2 rounded-xl bg-surface-container/60 break-words">
                <span className="text-on-surface-variant">
                  MS Litres:{' '}
                  <span className="text-on-surface font-medium">
                    {msLitres.toLocaleString('en-IN')} L
                  </span>
                </span>
                <span className="text-on-surface-variant">
                  HSD Litres:{' '}
                  <span className="text-on-surface font-medium">
                    {hsdLitres.toLocaleString('en-IN')} L
                  </span>
                </span>
                <span className="text-on-surface-variant">
                  MS Revenue:{' '}
                  <span className="text-on-surface font-medium">
                    ₹{msRevenue.toLocaleString('en-IN')}
                  </span>
                </span>
                <span className="text-on-surface-variant">
                  HSD Revenue:{' '}
                  <span className="text-on-surface font-medium">
                    ₹{hsdRevenue.toLocaleString('en-IN')}
                  </span>
                </span>
              </div>
            </section>

            {/* C. Testing */}
            <section className="flex flex-col gap-3 bg-surface-container/40 border border-outline-variant rounded-xl p-4">
              <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
                C. Testing
              </h3>
              <p className="text-on-surface-variant text-xs">
                Volume and sale value drained for daily density / quality testing — subtracted from totals.
              </p>
              {(['MS', 'HSD'] as const).map((fuel) => {
                const volKey = fuel === 'MS' ? 'msVolume' : 'hsdVolume'
                const saleKey = fuel === 'MS' ? 'msSale' : 'hsdSale'
                return (
                  <div
                    key={fuel}
                    className="grid grid-cols-1 sm:grid-cols-[8rem_1fr_1fr] gap-2 items-end px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest"
                  >
                    <div className="text-on-surface text-sm font-medium">
                      {FUEL_LABELS[fuel]}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-on-surface-variant text-xs">CumVolume (L)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={testing[volKey]}
                        onChange={(e) =>
                          setTesting((prev) => ({ ...prev, [volKey]: e.target.value }))
                        }
                        placeholder="0"
                        className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-on-surface-variant text-xs">CumSale (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={testing[saleKey]}
                        onChange={(e) =>
                          setTesting((prev) => ({ ...prev, [saleKey]: e.target.value }))
                        }
                        placeholder="0"
                        className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm"
                      />
                    </div>
                  </div>
                )
              })}
              <div className="px-3 py-2 rounded-xl bg-surface-container text-sm text-on-surface-variant break-words">
                Adjusted Total:{' '}
                <span className="text-on-surface font-medium">
                  {adjustedLitres.toLocaleString('en-IN')} L
                </span>
                {' · '}
                <span className="text-on-surface font-medium">
                  ₹{adjustedRevenue.toLocaleString('en-IN')}
                </span>
              </div>
            </section>

            {/* D. Other Sales */}
            <section className="flex flex-col gap-3 bg-surface-container/40 border border-outline-variant rounded-xl p-4">
              <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
                D. Other Sales
              </h3>
              {activeOtherSalesItems.length === 0 ? (
                <div className="px-3 py-2 rounded-xl border border-outline-variant bg-surface-container/60 text-sm text-on-surface-variant">
                  Configure Other Sales items in Settings to use this section.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {activeOtherSalesItems.map((item) => (
                    <OtherSalesCatalogRow
                      key={item.id}
                      item={item}
                      onAdd={handleAddOtherSale}
                    />
                  ))}
                </div>
              )}
              {otherSalesEntries.length > 0 && (
                <div className="flex flex-col gap-1">
                  {otherSalesEntries.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-container text-sm"
                    >
                      <span className="text-on-surface">
                        {e.itemName} · {e.quantity}L · ₹{e.amount.toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOtherSale(i)}
                        aria-label="Remove entry"
                        className="text-on-surface-variant hover:text-rose-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-3 py-2 rounded-xl bg-surface-container text-sm text-on-surface-variant">
                Sub-total:{' '}
                <span className="text-on-surface font-medium">
                  ₹{totalOtherSales.toLocaleString('en-IN')}
                </span>
              </div>
            </section>

            {/* E. Cash Expected (derived) */}
            <section className="flex flex-col gap-2 bg-surface-container/40 border border-outline-variant rounded-xl p-4">
              <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
                E. Cash Expected
              </h3>
              <p className="text-on-surface-variant text-xs">
                Adjusted Revenue + Other Sales − Electronic − Credit − Expenses
              </p>
              <div className="px-3 py-3 rounded-xl bg-surface-container text-on-surface text-lg font-semibold">
                ₹{cashExpected.toLocaleString('en-IN')}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-on-surface-variant">
                <span>
                  Adj. Rev:{' '}
                  <span className="text-on-surface font-medium">
                    ₹{adjustedRevenue.toLocaleString('en-IN')}
                  </span>
                </span>
                <span>
                  + Other:{' '}
                  <span className="text-on-surface font-medium">
                    ₹{totalOtherSales.toLocaleString('en-IN')}
                  </span>
                </span>
                <span>
                  − Elec:{' '}
                  <span className="text-on-surface font-medium">
                    ₹{totalElectronic.toLocaleString('en-IN')}
                  </span>
                </span>
                <span>
                  − Credit:{' '}
                  <span className="text-on-surface font-medium">
                    ₹{totalCredit.toLocaleString('en-IN')}
                  </span>
                </span>
                <span>
                  − Exp:{' '}
                  <span className="text-on-surface font-medium">
                    ₹{totalExpensesAmt.toLocaleString('en-IN')}
                  </span>
                </span>
              </div>
            </section>

            {/* F. Electronic Transactions */}
            <section className="flex flex-col gap-3 bg-surface-container/40 border border-outline-variant rounded-xl p-4">
              <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
                F. Electronic Transactions
              </h3>
              {activeElectronicMethods.length === 0 ? (
                <div className="px-3 py-2 rounded-xl border border-outline-variant bg-surface-container/60 text-sm text-on-surface-variant">
                  Configure Electronic methods in Settings to use this section.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {activeElectronicMethods.map((method) => (
                    <ElectronicCatalogRow
                      key={method.id}
                      method={method}
                      onAdd={handleAddElectronic}
                    />
                  ))}
                </div>
              )}
              {electronicEntries.length > 0 && (
                <div className="flex flex-col gap-1">
                  {electronicEntries.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-container text-sm"
                    >
                      <span className="text-on-surface">
                        {e.methodName} · ₹{e.amount.toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveElectronic(i)}
                        aria-label="Remove entry"
                        className="text-on-surface-variant hover:text-rose-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-3 py-2 rounded-xl bg-surface-container text-sm text-on-surface-variant">
                Sub-total:{' '}
                <span className="text-on-surface font-medium">
                  ₹{totalElectronic.toLocaleString('en-IN')}
                </span>
              </div>
            </section>

            {/* G. Customer Credit */}
            <section className="flex flex-col gap-3 bg-surface-container/40 border border-outline-variant rounded-xl p-4">
              <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
                G. Customer Credit (Khaata)
              </h3>
              {creditCustomer ? (
                <div className="flex flex-col gap-2 px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-on-surface font-medium text-sm">
                        {creditCustomer.name}
                      </span>
                      {creditCustomer.phone && (
                        <span className="text-on-surface-variant text-xs">
                          {creditCustomer.phone}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCreditCustomer(null)
                        setCreditAmount('')
                      }}
                      className="text-on-surface-variant hover:text-rose-600 text-xs"
                    >
                      Change
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                    <div className="flex flex-col gap-1">
                      <label className="text-on-surface-variant text-xs">Amount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        placeholder="0"
                        className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCredit}
                      disabled={
                        creditAmount === '' ||
                        Number.isNaN(Number(creditAmount)) ||
                        Number(creditAmount) <= 0
                      }
                      className="px-3 py-2 rounded-lg text-xs font-medium bg-primary text-on-primary hover:opacity-90 disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ) : (
                <CustomerSearch customers={customers} onPick={setCreditCustomer} />
              )}
              {creditEntries.length > 0 && (
                <div className="flex flex-col gap-1">
                  {creditEntries.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-container text-sm"
                    >
                      <span className="text-on-surface">
                        {e.customerName} · ₹{e.amount.toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCredit(i)}
                        aria-label="Remove entry"
                        className="text-on-surface-variant hover:text-rose-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-3 py-2 rounded-xl bg-surface-container text-sm text-on-surface-variant">
                Sub-total:{' '}
                <span className="text-on-surface font-medium">
                  ₹{totalCredit.toLocaleString('en-IN')}
                </span>
              </div>
            </section>

            {/* H. Expenses */}
            <section className="flex flex-col gap-3 bg-surface-container/40 border border-outline-variant rounded-xl p-4">
              <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
                H. Expenses
              </h3>
              {activeExpenseCategories.length === 0 ? (
                <div className="px-3 py-2 rounded-xl border border-outline-variant bg-surface-container/60 text-sm text-on-surface-variant">
                  Configure Expense categories in Settings to use this section.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {activeExpenseCategories.map((category) => (
                    <ExpenseCatalogRow
                      key={category.id}
                      category={category}
                      onAdd={handleAddExpense}
                    />
                  ))}
                </div>
              )}
              {expenseEntries.length > 0 && (
                <div className="flex flex-col gap-1">
                  {expenseEntries.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-container text-sm"
                    >
                      <span className="text-on-surface">
                        {e.categoryName} · ₹{e.amount.toLocaleString('en-IN')}
                        {e.description ? ` · ${e.description}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExpense(i)}
                        aria-label="Remove entry"
                        className="text-on-surface-variant hover:text-rose-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-3 py-2 rounded-xl bg-surface-container text-sm text-on-surface-variant">
                Sub-total:{' '}
                <span className="text-on-surface font-medium">
                  ₹{totalExpensesAmt.toLocaleString('en-IN')}
                </span>
              </div>
            </section>

            {/* I. Cash Reconciliation */}
            <section className="flex flex-col gap-3 bg-surface-container/40 border border-outline-variant rounded-xl p-4">
              <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
                I. Cash Reconciliation
              </h3>
              <div className="px-3 py-3 rounded-xl bg-surface-container">
                <div className="text-xs text-on-surface-variant uppercase tracking-wider">
                  Cash Expected
                </div>
                <div className="text-on-surface text-lg font-semibold">
                  ₹{cashExpected.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-on-surface-variant text-sm font-medium">
                  Cash in Hand (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={cashInHand}
                  onChange={(e) => setCashInHand(e.target.value)}
                  placeholder="Counted physical cash"
                  className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              {cashFilled && (
                <div
                  className={cn(
                    'px-3 py-2 rounded-xl text-sm font-medium',
                    cashVariance >= 0
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700',
                  )}
                >
                  Variance: {cashVariance >= 0 ? '+' : ''}₹
                  {cashVariance.toLocaleString('en-IN')}
                </div>
              )}
            </section>

            {/* J. Handover */}
            <section className="flex flex-col gap-3 bg-surface-container/40 border border-outline-variant rounded-xl p-4">
              <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
                J. Handover
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-on-surface-variant text-sm font-medium">
                    Handover to Next Shift (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={handoverToNext}
                    onChange={(e) => setHandoverToNext(e.target.value)}
                    placeholder="0"
                    className="px-3 py-2.5 sm:py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-on-surface-variant text-sm font-medium">
                    Deposit to Owner (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={depositToOwner}
                    onChange={(e) => setDepositToOwner(e.target.value)}
                    placeholder="0"
                    className="px-3 py-2.5 sm:py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div
                className={cn(
                  'px-3 py-2 rounded-xl text-sm break-words',
                  cashFilled && handoverMatches
                    ? 'bg-emerald-50 text-emerald-700'
                    : cashFilled
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-surface-container text-on-surface-variant',
                )}
              >
                Handover + Deposit ={' '}
                <span className="font-medium">
                  ₹{handoverSum.toLocaleString('en-IN')}
                </span>
                {cashFilled && (
                  <>
                    {' '}
                    · Required ={' '}
                    <span className="font-medium">
                      ₹{cashInHandNum.toLocaleString('en-IN')}
                    </span>
                    {' '}
                    {handoverMatches ? '(matches)' : '(must match Cash in Hand)'}
                  </>
                )}
              </div>
            </section>

            {error && (
              <div className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitDisabled}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {submitting ? 'Closing…' : 'Close Shift'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Closed-shift detail (per-nozzle breakdown card)
// ─────────────────────────────────────────────────────────────────────────────

interface ShiftDetailProps {
  shiftId: string
}

function ShiftDetail({ shiftId }: ShiftDetailProps) {
  const loadNozzleReadings = useShiftsStore((s) => s.loadNozzleReadings)
  const readings = useShiftsStore((s) =>
    s.nozzleReadings.filter((r) => r.shiftId === shiftId),
  )

  useEffect(() => {
    if (readings.length === 0) {
      loadNozzleReadings(shiftId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId])

  const sorted: NozzleReading[] = [...readings].sort((a, b) => a.slot - b.slot)

  if (sorted.length === 0) {
    return (
      <div className="px-3 py-3 rounded-xl bg-surface-container text-sm text-on-surface-variant">
        Loading nozzle readings…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((r) => (
        <div
          key={r.id}
          className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container/40"
        >
          <div className="text-on-surface text-sm font-medium">
            Nozzle {r.slot} — {FUEL_LABELS[r.fuelType]} — {r.nozzleName}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-on-surface-variant">
            <span>
              Start Vol:{' '}
              <span className="text-on-surface font-medium">
                {r.openingCumVolume.toLocaleString('en-IN')}
              </span>
            </span>
            <span>
              End Vol:{' '}
              <span className="text-on-surface font-medium">
                {r.closingCumVolume != null
                  ? r.closingCumVolume.toLocaleString('en-IN')
                  : '—'}
              </span>
            </span>
            <span>
              Litres Sold:{' '}
              <span className="text-on-surface font-medium">
                {r.litresSold.toLocaleString('en-IN')} L
              </span>
            </span>
            <span>
              Rupees:{' '}
              <span className="text-on-surface font-medium">
                ₹{r.rupeesSold.toLocaleString('en-IN')}
              </span>
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ShiftsPage() {
  const {
    shifts,
    loading,
    dateFilter,
    statusFilter,
    setDateFilter,
    setStatusFilter,
    deleteShift,
    flagShift,
  } = useShiftsStore()
  const { users, dispenserUnits } = useAppStore()
  const currentUser = useAuthStore((s) => s.currentUser)

  const [openShiftModal, setOpenShiftModal] = useState(false)
  const [shiftToClose, setShiftToClose] = useState<Shift | null>(null)
  const [shiftToEditOpenings, setShiftToEditOpenings] = useState<Shift | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (!currentUser) return null

  const isOwnerOrManager = currentUser.role === 'owner' || currentUser.role === 'manager'

  const filteredShifts =
    statusFilter === 'all' ? shifts : shifts.filter((s) => s.status === statusFilter)

  const displayedShifts =
    currentUser.role === 'salesman'
      ? filteredShifts.filter((s) => s.salesmanId === currentUser.id)
      : filteredShifts

  function handleDelete(shift: Shift): void {
    if (!confirm(`Delete this shift for ${shift.salesmanName}? This cannot be undone.`)) return
    deleteShift(shift.id)
  }

  function toggleExpand(id: string): void {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-on-surface text-xl sm:text-2xl font-bold">Shifts</h1>
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

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
        <div className="flex bg-surface-container rounded-xl p-1 gap-1 overflow-x-auto">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setDateFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                dateFilter === f.value
                  ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex bg-surface-container rounded-xl p-1 gap-1 overflow-x-auto">
          {(['all', 'open', 'closed', 'flagged'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize whitespace-nowrap',
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
        <>
          {/* Mobile: stacked cards */}
          <div className="md:hidden flex flex-col gap-3">
            {displayedShifts.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 text-center text-on-surface-variant text-sm">
                No shifts found
              </div>
            ) : (
              displayedShifts.map((shift) => {
                const expanded = expandedId === shift.id
                return (
                  <div
                    key={shift.id}
                    className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-4 flex flex-col gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(shift.id)}
                      className="flex items-start justify-between gap-3 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-on-surface truncate">
                          {duLabel(dispenserUnits, shift.dispenserUnitId)} ·{' '}
                          {shift.salesmanName}
                        </div>
                        <div className="text-on-surface-variant text-xs">
                          {formatDate(shift.openedAt)} · {formatTime(shift.openedAt)} →{' '}
                          {formatTime(shift.closedAt)}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 px-2 py-1 rounded-full text-xs font-semibold capitalize',
                          STATUS_STYLES[shift.status] ?? 'bg-gray-100 text-gray-500',
                        )}
                      >
                        {shift.status}
                      </span>
                    </button>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-on-surface-variant uppercase tracking-wider">
                          Litres
                        </span>
                        <span className="text-on-surface font-medium break-words">
                          {shift.totalLitresSold > 0
                            ? `${shift.totalLitresSold.toLocaleString('en-IN')} L`
                            : '—'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-on-surface-variant uppercase tracking-wider">
                          Revenue
                        </span>
                        <span className="text-on-surface font-medium break-words">
                          {shift.totalRevenue > 0
                            ? `₹${shift.totalRevenue.toLocaleString('en-IN')}`
                            : '—'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-on-surface-variant uppercase tracking-wider">
                          Cash
                        </span>
                        <span className="text-on-surface font-medium break-words">
                          {shift.totalCashCollected > 0
                            ? `₹${shift.totalCashCollected.toLocaleString('en-IN')}`
                            : '—'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-on-surface-variant uppercase tracking-wider">
                          Cash Var.
                        </span>
                        {shift.cashVariance !== 0 ? (
                          <span
                            className={cn(
                              'font-medium break-words',
                              shift.cashVariance < 0 ? 'text-rose-600' : 'text-emerald-600',
                            )}
                          >
                            {shift.cashVariance > 0 ? '+' : ''}₹
                            {shift.cashVariance.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </div>
                    </div>

                    {expanded && shift.status !== 'open' && <ShiftDetail shiftId={shift.id} />}

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-outline-variant">
                      {shift.status === 'open' && (
                        <button
                          onClick={() => setShiftToClose(shift)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                          Close
                        </button>
                      )}
                      {isOwnerOrManager && shift.status === 'open' && (
                        <button
                          onClick={() => setShiftToEditOpenings(shift)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors"
                        >
                          Edit Openings
                        </button>
                      )}
                      {isOwnerOrManager && shift.status === 'closed' && (
                        <button
                          onClick={() => flagShift(shift.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-300 text-rose-700 hover:bg-rose-50 transition-colors"
                        >
                          Flag
                        </button>
                      )}
                      {isOwnerOrManager && shift.status !== 'open' && (
                        <button
                          onClick={() => handleDelete(shift)}
                          className="ml-auto p-1.5 rounded-lg text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          aria-label="Delete shift"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  {[
                    'DU',
                    'Salesman',
                    'Time',
                    'Litres',
                    'Revenue',
                    'Cash Variance',
                    'Status',
                    'Actions',
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-on-surface-variant font-semibold text-xs uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedShifts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-8 text-center text-on-surface-variant text-sm"
                    >
                      No shifts found
                    </td>
                  </tr>
                ) : (
                  displayedShifts.map((shift, i) => {
                    const expanded = expandedId === shift.id
                    return (
                      <Fragment key={shift.id}>
                        <tr
                          onClick={() => toggleExpand(shift.id)}
                          className={cn(
                            'border-b border-outline-variant cursor-pointer hover:bg-surface-container-low/50',
                            i % 2 ? 'bg-surface-container-low/30' : '',
                          )}
                        >
                          <td className="px-5 py-3 font-semibold text-on-surface whitespace-nowrap">
                            {duLabel(dispenserUnits, shift.dispenserUnitId)}
                          </td>
                          <td className="px-5 py-3 font-medium text-on-surface whitespace-nowrap">
                            {shift.salesmanName}
                          </td>
                          <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">
                            {formatDate(shift.openedAt)} · {formatTime(shift.openedAt)} →{' '}
                            {formatTime(shift.closedAt)}
                          </td>
                          <td className="px-5 py-3 text-on-surface text-right whitespace-nowrap">
                            {shift.totalLitresSold > 0
                              ? `${shift.totalLitresSold.toLocaleString('en-IN')} L`
                              : '—'}
                          </td>
                          <td className="px-5 py-3 text-on-surface text-right whitespace-nowrap">
                            {shift.totalRevenue > 0
                              ? `₹${shift.totalRevenue.toLocaleString('en-IN')}`
                              : '—'}
                          </td>
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            {shift.cashVariance !== 0 ? (
                              <span
                                className={cn(
                                  'font-medium',
                                  shift.cashVariance < 0
                                    ? 'text-rose-600'
                                    : 'text-emerald-600',
                                )}
                              >
                                {shift.cashVariance > 0 ? '+' : ''}₹
                                {shift.cashVariance.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-on-surface-variant">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span
                              className={cn(
                                'px-2 py-1 rounded-full text-xs font-semibold capitalize',
                                STATUS_STYLES[shift.status] ?? 'bg-gray-100 text-gray-500',
                              )}
                            >
                              {shift.status}
                            </span>
                          </td>
                          <td
                            className="px-5 py-3 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              {shift.status === 'open' && (
                                <button
                                  onClick={() => setShiftToClose(shift)}
                                  className="px-3 py-1 rounded-lg text-xs font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
                                >
                                  Close
                                </button>
                              )}
                              {isOwnerOrManager && shift.status === 'open' && (
                                <button
                                  onClick={() => setShiftToEditOpenings(shift)}
                                  className="px-3 py-1 rounded-lg text-xs font-medium border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors"
                                >
                                  Edit Openings
                                </button>
                              )}
                              {isOwnerOrManager && shift.status === 'closed' && (
                                <button
                                  onClick={() => flagShift(shift.id)}
                                  className="px-3 py-1 rounded-lg text-xs font-medium border border-rose-300 text-rose-700 hover:bg-rose-50 transition-colors"
                                >
                                  Flag
                                </button>
                              )}
                              {isOwnerOrManager && shift.status !== 'open' && (
                                <button
                                  onClick={() => handleDelete(shift)}
                                  className="p-1 rounded-lg text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  aria-label="Delete shift"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    delete
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expanded && shift.status !== 'open' && (
                          <tr className="border-b border-outline-variant">
                            <td colSpan={8} className="px-5 py-3 bg-surface-container/30">
                              <ShiftDetail shiftId={shift.id} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {openShiftModal && (
        <OpenShiftModal
          users={users}
          dispenserUnits={dispenserUnits}
          currentUser={currentUser}
          onClose={() => setOpenShiftModal(false)}
        />
      )}

      {shiftToClose && (
        <CloseShiftModal shift={shiftToClose} onClose={() => setShiftToClose(null)} />
      )}

      {shiftToEditOpenings && isOwnerOrManager && (
        <EditOpeningReadingsModal
          shift={shiftToEditOpenings}
          onClose={() => setShiftToEditOpenings(null)}
        />
      )}
    </div>
  )
}
