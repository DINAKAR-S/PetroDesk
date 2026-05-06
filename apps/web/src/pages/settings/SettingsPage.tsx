import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import type {
  Tank,
  Nozzle,
  NozzleSlot,
  User,
  FuelType,
  Role,
  DispenserUnit,
  OtherSalesItem,
  ElectronicMethod,
  ExpenseCategory,
} from '@/types'
import { FUEL_LABELS, FUEL_TYPES, NOZZLE_SLOTS } from '@/lib/constants'

type Tab =
  | 'bunk'
  | 'dispensers'
  | 'tanks'
  | 'nozzles'
  | 'other-sales'
  | 'electronic'
  | 'expenses'
  | 'staff'
  | 'prices'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'bunk', label: 'Bunk Profile', icon: 'storefront' },
  { id: 'dispensers', label: 'Dispenser Units', icon: 'view_module' },
  { id: 'tanks', label: 'Tanks', icon: 'water_drop' },
  { id: 'nozzles', label: 'Nozzles', icon: 'local_gas_station' },
  { id: 'other-sales', label: 'Other Sales', icon: 'shopping_basket' },
  { id: 'electronic', label: 'Electronic', icon: 'credit_card' },
  { id: 'expenses', label: 'Expenses', icon: 'receipt_long' },
  { id: 'staff', label: 'Staff', icon: 'group' },
  { id: 'prices', label: 'Fuel Prices', icon: 'local_offer' },
]

/* ── Reusable modal wrapper ── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4 bg-on-surface/40">
      <div className="bg-surface-container-lowest shadow-xl w-full h-full overflow-y-auto sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-xl sm:border sm:border-outline-variant flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-outline-variant sticky top-0 bg-surface-container-lowest z-10">
          <h3 className="text-on-surface font-semibold text-base">{title}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors p-1 -mr-1">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="px-4 sm:px-6 py-5 flex-1">{children}</div>
      </div>
    </div>
  )
}

/* ── Field wrapper ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-on-surface">{label}</label>
      {children}
    </div>
  )
}

const INPUT_CLS =
  'block w-full rounded-lg border border-outline-variant bg-surface-container-low py-2.5 px-3 text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary'

/* ── Bunk Profile Tab ── */
function BunkProfileTab() {
  const { bunk, updateBunk } = useAppStore()
  const [form, setForm] = useState({ ...bunk })
  const [saved, setSaved] = useState(false)

  function handleSave() {
    updateBunk(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-lg flex flex-col gap-5">
      <Field label="Bunk Name">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={INPUT_CLS}
        />
      </Field>
      <Field label="Address">
        <textarea
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          rows={2}
          className={INPUT_CLS}
        />
      </Field>
      <Field label="Owner Name">
        <input
          value={form.ownerName}
          onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
          className={INPUT_CLS}
        />
      </Field>
      <Field label="GST Number">
        <input
          value={form.gstNumber}
          onChange={(e) => setForm({ ...form, gstNumber: e.target.value.toUpperCase() })}
          className={INPUT_CLS}
        />
      </Field>
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-secondary-container text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Save Changes
        </button>
        {saved && <span className="text-emerald-600 text-sm font-medium">✓ Saved</span>}
      </div>
    </div>
  )
}

/* ── Dispenser Units Tab ── */
// Parse a user-typed string as a non-negative finite number.
// Returns null on empty / NaN / negative / Infinity. Used by every
// "Initial Meter Reading" input. `Number.isFinite` rejects Infinity which
// `Number.isNaN` would otherwise let through.
function parseNonNeg(s: string): number | null {
  if (s.trim() === '') return null
  const v = Number(s)
  return Number.isFinite(v) && v >= 0 ? v : null
}

type NozzleSlotForm = {
  name: string
  fuelType: FuelType
  tankId: string
  // String-typed while editing so inputs can be cleared; parsed on save.
  initialCumVolume: string
  initialCumSale: string
}

type AddDuForm = {
  number: string
  displayName: string
  nozzles: NozzleSlotForm[]
}

type EditDuForm = {
  number: string
  displayName: string
}

function defaultNozzleRows(tanks: Tank[]): NozzleSlotForm[] {
  // Default 4 slots: 1,2 = MS, 3,4 = HSD. User can change any.
  const firstMsTank = tanks.find((t) => t.fuelType === 'MS')?.id ?? ''
  const firstHsdTank = tanks.find((t) => t.fuelType === 'HSD')?.id ?? ''
  const blank = { initialCumVolume: '0', initialCumSale: '0' }
  return [
    { name: 'Nozzle 1', fuelType: 'MS', tankId: firstMsTank, ...blank },
    { name: 'Nozzle 2', fuelType: 'MS', tankId: firstMsTank, ...blank },
    { name: 'Nozzle 3', fuelType: 'HSD', tankId: firstHsdTank, ...blank },
    { name: 'Nozzle 4', fuelType: 'HSD', tankId: firstHsdTank, ...blank },
  ]
}

function DispenserUnitsTab() {
  const {
    dispenserUnits,
    nozzles,
    tanks,
    addDispenserUnit,
    updateDispenserUnit,
    deleteDispenserUnit,
    addNozzle,
  } = useAppStore()
  const [modal, setModal] = useState<{ mode: 'add' } | { mode: 'edit'; du: DispenserUnit } | null>(null)
  const [addForm, setAddForm] = useState<AddDuForm>({ number: '', displayName: '', nozzles: defaultNozzleRows(tanks) })
  const [editForm, setEditForm] = useState<EditDuForm>({ number: '', displayName: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function nozzleCount(duId: string): number {
    return nozzles.filter((n) => n.dispenserUnitId === duId).length
  }

  function openAdd() {
    setAddForm({ number: '', displayName: '', nozzles: defaultNozzleRows(tanks) })
    setError(null)
    setModal({ mode: 'add' })
  }

  function openEdit(du: DispenserUnit) {
    setEditForm({ number: du.number, displayName: du.displayName })
    setError(null)
    setModal({ mode: 'edit', du })
  }

  function updateNozzleRow(idx: number, patch: Partial<NozzleSlotForm>) {
    setAddForm((f) => ({
      ...f,
      nozzles: f.nozzles.map((n, i) => {
        if (i !== idx) return n
        const next = { ...n, ...patch }
        // If fuel changed, reset tank to the first matching one (or empty).
        if (patch.fuelType && patch.fuelType !== n.fuelType) {
          next.tankId = tanks.find((t) => t.fuelType === patch.fuelType)?.id ?? ''
        }
        return next
      }),
    }))
  }

  async function handleAdd() {
    setError(null)
    const number = addForm.number.trim()
    if (!number) {
      setError('DU number is required')
      return
    }
    const displayName = addForm.displayName.trim() || `DU ${number}`

    // Validate ALL rows up-front, BEFORE any DB writes. If we let an invalid
    // row trip the loop after some inserts succeed we'd be left with an
    // orphan DU and a partial set of nozzles that the user can't easily fix.
    interface ValidatedRow {
      name: string
      fuelType: FuelType
      tankId: string
      slot: NozzleSlot
      initialCumVolume: number
      initialCumSale: number
    }
    const rows: ValidatedRow[] = []
    for (let i = 0; i < addForm.nozzles.length; i++) {
      const n = addForm.nozzles[i]
      const slot = (i + 1) as NozzleSlot
      if (!n.tankId) {
        setError(`Slot ${slot}: select a ${n.fuelType === 'MS' ? 'Petrol' : 'Diesel'} tank (or add one in the Tanks tab first).`)
        return
      }
      const vol = parseNonNeg(n.initialCumVolume)
      if (vol === null) {
        setError(`Slot ${slot}: Initial CumVolume must be a non-negative number`)
        return
      }
      const sale = parseNonNeg(n.initialCumSale)
      if (sale === null) {
        setError(`Slot ${slot}: Initial CumSale must be a non-negative number`)
        return
      }
      rows.push({
        name: n.name.trim() || `Nozzle ${slot}`,
        fuelType: n.fuelType,
        tankId: n.tankId,
        slot,
        initialCumVolume: vol,
        initialCumSale: sale,
      })
    }

    setBusy(true)
    try {
      await addDispenserUnit({ number, displayName })
      const after = useAppStore.getState().dispenserUnits
      const newDu = after[after.length - 1]
      if (!newDu) {
        throw new Error('Dispenser unit was created but not found in store')
      }

      // Sequential so the failing row's slot number is in the error.
      for (const r of rows) {
        await addNozzle({
          name: r.name,
          dispenserUnitId: newDu.id,
          tankId: r.tankId,
          slot: r.slot,
          fuelType: r.fuelType,
          initialCumVolume: r.initialCumVolume,
          initialCumSale: r.initialCumSale,
        })
      }
      setModal(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add dispenser unit')
    } finally {
      setBusy(false)
    }
  }

  async function handleEdit() {
    if (modal?.mode !== 'edit') return
    setError(null)
    const number = editForm.number.trim()
    if (!number) {
      setError('Number is required')
      return
    }
    const displayName = editForm.displayName.trim() || `DU ${number}`
    setBusy(true)
    try {
      await updateDispenserUnit(modal.du.id, { number, displayName })
      setModal(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save dispenser unit')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(du: DispenserUnit) {
    const ok = confirm(`Delete DU ${du.number}? Its nozzles and shift history will also be removed.`)
    if (!ok) return
    try {
      await deleteDispenserUnit(du.id)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete dispenser unit')
    }
  }

  const noTanks = tanks.length === 0

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <p className="text-on-surface-variant text-sm">{dispenserUnits.length} dispenser unit(s) configured</p>
        <button
          onClick={openAdd}
          disabled={noTanks}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary-container text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add DU
        </button>
      </div>

      {noTanks && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
          Add at least one Petrol or Diesel tank in the <strong>Tanks</strong> tab before creating a Dispenser Unit.
        </div>
      )}

      {dispenserUnits.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-6 text-center">
          <p className="text-on-surface-variant text-sm">
            No dispenser units yet. Add your first DU (e.g. 80, 81, 82, 83).
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {dispenserUnits.map((du) => (
            <div
              key={du.id}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[18px] text-primary">view_module</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-on-surface font-semibold text-sm truncate">
                    DU {du.number}
                    <span className="text-on-surface-variant font-normal"> · {du.displayName}</span>
                  </p>
                  <p className="text-on-surface-variant text-xs">
                    {nozzleCount(du.id)} nozzle(s) configured
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(du)}
                  className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  onClick={() => handleDelete(du)}
                  className="p-2 rounded-lg text-on-surface-variant hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.mode === 'add' && (
        <Modal title="Add Dispenser Unit" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="DU Number">
                <input
                  value={addForm.number}
                  onChange={(e) => setAddForm({ ...addForm, number: e.target.value })}
                  placeholder="e.g. 80"
                  className={INPUT_CLS}
                />
              </Field>
              <Field label="Display Name (optional)">
                <input
                  value={addForm.displayName}
                  onChange={(e) => setAddForm({ ...addForm, displayName: e.target.value })}
                  placeholder={addForm.number ? `DU ${addForm.number}` : 'DU 80'}
                  className={INPUT_CLS}
                />
              </Field>
            </div>

            <div>
              <p className="text-on-surface text-sm font-semibold mb-1">4 Nozzles</p>
              <p className="text-on-surface-variant text-xs mb-3">
                Pick fuel and tank for each slot. Default is 1,2 = Petrol; 3,4 = Diesel — change to alternate or any combination.
              </p>
              <div className="flex flex-col gap-3">
                {addForm.nozzles.map((n, i) => {
                  const slot = i + 1
                  const matchingTanks = tanks.filter((t) => t.fuelType === n.fuelType)
                  return (
                    <div
                      key={slot}
                      className="border border-outline-variant rounded-xl p-3 bg-surface-container/40"
                    >
                      <p className="text-on-surface text-sm font-medium mb-2">Slot {slot}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field label="Name">
                          <input
                            value={n.name}
                            onChange={(e) => updateNozzleRow(i, { name: e.target.value })}
                            placeholder={`Nozzle ${slot}`}
                            className={INPUT_CLS}
                          />
                        </Field>
                        <Field label="Fuel">
                          <select
                            value={n.fuelType}
                            onChange={(e) => updateNozzleRow(i, { fuelType: e.target.value as FuelType })}
                            className={INPUT_CLS}
                          >
                            <option value="MS">Petrol (MS)</option>
                            <option value="HSD">Diesel (HSD)</option>
                          </select>
                        </Field>
                        <Field label="Tank">
                          <select
                            value={n.tankId}
                            onChange={(e) => updateNozzleRow(i, { tankId: e.target.value })}
                            className={INPUT_CLS}
                            disabled={matchingTanks.length === 0}
                          >
                            <option value="">{matchingTanks.length === 0 ? 'No matching tank' : 'Select tank'}</option>
                            {matchingTanks.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      {matchingTanks.length === 0 && (
                        <p className="text-amber-700 text-xs mt-2">
                          No {n.fuelType === 'MS' ? 'Petrol' : 'Diesel'} tank exists. Add one in the Tanks tab.
                        </p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-outline-variant/50">
                        <Field label="Initial CumVolume (L)">
                          <input
                            type="number"
                            step="0.001"
                            inputMode="decimal"
                            value={n.initialCumVolume}
                            onChange={(e) => updateNozzleRow(i, { initialCumVolume: e.target.value })}
                            placeholder="0"
                            className={INPUT_CLS}
                          />
                        </Field>
                        <Field label="Initial CumSale (₹)">
                          <input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            value={n.initialCumSale}
                            onChange={(e) => updateNozzleRow(i, { initialCumSale: e.target.value })}
                            placeholder="0"
                            className={INPUT_CLS}
                          />
                        </Field>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-on-surface-variant text-xs mt-3 italic">
                Set the latest meter slip values for each nozzle so the first shift opens at the correct point. Leave at 0 if this is a brand-new pump.
              </p>
            </div>

            {error && <p className="text-red-600 text-xs font-medium">{error}</p>}

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
              <button
                onClick={() => setModal(null)}
                disabled={busy}
                className="flex-1 py-2.5 border border-outline-variant rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={busy}
                className="flex-1 py-2.5 bg-secondary-container text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {busy ? 'Creating…' : 'Create DU + 4 Nozzles'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal?.mode === 'edit' && (
        <Modal title="Edit Dispenser Unit" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4">
            <Field label="Number">
              <input
                value={editForm.number}
                onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                placeholder="e.g. 80"
                className={INPUT_CLS}
              />
            </Field>
            <Field label="Display Name (optional)">
              <input
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                placeholder={editForm.number ? `DU ${editForm.number}` : 'DU 80'}
                className={INPUT_CLS}
              />
            </Field>
            <p className="text-on-surface-variant text-xs italic">
              Edit nozzles for this DU in the Nozzles tab.
            </p>
            {error && <p className="text-red-600 text-xs font-medium">{error}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
              <button
                onClick={() => setModal(null)}
                disabled={busy}
                className="flex-1 py-2.5 border border-outline-variant rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={busy}
                className="flex-1 py-2.5 bg-secondary-container text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {busy ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ── Tanks Tab ── */
type TankForm = { name: string; fuelType: FuelType; capacityL: number; currentStockL: number }
const EMPTY_TANK: TankForm = { name: '', fuelType: 'MS', capacityL: 10000, currentStockL: 5000 }

function TanksTab() {
  const { tanks, addTank, updateTank, deleteTank } = useAppStore()
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; tank?: Tank } | null>(null)
  const [form, setForm] = useState<TankForm>(EMPTY_TANK)

  function openAdd() {
    setForm(EMPTY_TANK)
    setModal({ mode: 'add' })
  }

  function openEdit(tank: Tank) {
    setForm({ name: tank.name, fuelType: tank.fuelType, capacityL: tank.capacityL, currentStockL: tank.currentStockL })
    setModal({ mode: 'edit', tank })
  }

  function handleSave() {
    if (!form.name.trim()) return
    if (modal?.mode === 'add') {
      addTank(form)
    } else if (modal?.tank) {
      updateTank(modal.tank.id, form)
    }
    setModal(null)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <p className="text-on-surface-variant text-sm">{tanks.length} tank(s) configured</p>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary-container text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Tank
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {tanks.map((tank) => (
          <div
            key={tank.id}
            className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[18px] text-primary">water_drop</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-on-surface font-semibold text-sm truncate">{tank.name}</p>
                <p className="text-on-surface-variant text-xs break-words">
                  {tank.fuelType} · {tank.capacityL.toLocaleString('en-IN')} L cap ·{' '}
                  {tank.currentStockL.toLocaleString('en-IN')} L now
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                onClick={() => openEdit(tank)}
                className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Delete ${tank.name}?`)) return
                  try {
                    await deleteTank(tank.id)
                  } catch (err: unknown) {
                    alert(err instanceof Error ? err.message : 'Failed to delete tank')
                  }
                }}
                className="p-2 rounded-lg text-on-surface-variant hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'add' ? 'Add Tank' : 'Edit Tank'}
          onClose={() => setModal(null)}
        >
          <div className="flex flex-col gap-4">
            <Field label="Tank Name">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Tank 3"
                className={INPUT_CLS}
              />
            </Field>
            <Field label="Fuel Type">
              <select
                value={form.fuelType}
                onChange={(e) => setForm({ ...form, fuelType: e.target.value as FuelType })}
                className={INPUT_CLS}
              >
                {FUEL_TYPES.map((ft) => (
                  <option key={ft} value={ft}>
                    {FUEL_LABELS[ft]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Capacity (Litres)">
              <input
                type="number"
                value={form.capacityL}
                onChange={(e) => setForm({ ...form, capacityL: Number(e.target.value) })}
                className={INPUT_CLS}
              />
            </Field>
            <Field label="Current Stock (Litres)">
              <input
                type="number"
                value={form.currentStockL}
                onChange={(e) => setForm({ ...form, currentStockL: Number(e.target.value) })}
                className={INPUT_CLS}
              />
            </Field>
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-outline-variant rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 bg-secondary-container text-white rounded-lg text-sm font-semibold hover:opacity-90"
              >
                {modal.mode === 'add' ? 'Add Tank' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ── Nozzles Tab ── */
type NozzleForm = {
  name: string
  dispenserUnitId: string
  slot: NozzleSlot
  fuelType: FuelType
  tankId: string
  // Stored as strings while editing so the input fields can be cleared
  // (parsed to numbers on save).
  initialCumVolume: string
  initialCumSale: string
}

function makeEmptyNozzle(dispenserUnits: DispenserUnit[], tanks: Tank[]): NozzleForm {
  const firstDuId = dispenserUnits[0]?.id ?? ''
  const firstMsTank = tanks.find((t) => t.fuelType === 'MS')
  return {
    name: '',
    dispenserUnitId: firstDuId,
    slot: 1,
    fuelType: 'MS',
    tankId: firstMsTank?.id ?? '',
    initialCumVolume: '0',
    initialCumSale: '0',
  }
}

function NozzlesTab() {
  const { nozzles, tanks, dispenserUnits, addNozzle, updateNozzle, deleteNozzle } = useAppStore()

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; nozzle?: Nozzle } | null>(null)
  const [form, setForm] = useState<NozzleForm>(() => makeEmptyNozzle(dispenserUnits, tanks))
  const [error, setError] = useState<string | null>(null)

  const tanksForFuel: Tank[] = useMemo(
    () => tanks.filter((t) => t.fuelType === form.fuelType),
    [tanks, form.fuelType],
  )

  function takenSlotsForDu(duId: string, excludeNozzleId?: string): Set<NozzleSlot> {
    const set = new Set<NozzleSlot>()
    for (const n of nozzles) {
      if (n.dispenserUnitId !== duId) continue
      if (excludeNozzleId && n.id === excludeNozzleId) continue
      set.add(n.slot)
    }
    return set
  }

  function openAdd() {
    if (dispenserUnits.length === 0) {
      setModal({ mode: 'add' })
      setForm(makeEmptyNozzle(dispenserUnits, tanks))
      setError(null)
      return
    }
    setForm(makeEmptyNozzle(dispenserUnits, tanks))
    setError(null)
    setModal({ mode: 'add' })
  }

  function openEdit(nozzle: Nozzle) {
    setForm({
      name: nozzle.name,
      dispenserUnitId: nozzle.dispenserUnitId,
      slot: nozzle.slot,
      fuelType: nozzle.fuelType,
      tankId: nozzle.tankId,
      initialCumVolume: String(nozzle.initialCumVolume ?? 0),
      initialCumSale: String(nozzle.initialCumSale ?? 0),
    })
    setError(null)
    setModal({ mode: 'edit', nozzle })
  }

  async function handleSave() {
    setError(null)
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    if (!form.dispenserUnitId) {
      setError('Select a dispenser unit')
      return
    }
    if (!form.tankId) {
      setError(`Add a ${form.fuelType === 'MS' ? 'Petrol' : 'Diesel'} tank first`)
      return
    }
    const initialCumVolume = parseNonNeg(form.initialCumVolume)
    if (initialCumVolume === null) {
      setError('Initial CumVolume must be a non-negative number')
      return
    }
    const initialCumSale = parseNonNeg(form.initialCumSale)
    if (initialCumSale === null) {
      setError('Initial CumSale must be a non-negative number')
      return
    }
    try {
      if (modal?.mode === 'add') {
        await addNozzle({
          name: form.name.trim(),
          dispenserUnitId: form.dispenserUnitId,
          slot: form.slot,
          fuelType: form.fuelType,
          tankId: form.tankId,
          initialCumVolume,
          initialCumSale,
        })
      } else if (modal?.nozzle) {
        await updateNozzle(modal.nozzle.id, {
          name: form.name.trim(),
          dispenserUnitId: form.dispenserUnitId,
          slot: form.slot,
          fuelType: form.fuelType,
          tankId: form.tankId,
          initialCumVolume,
          initialCumSale,
        })
      }
      setModal(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save nozzle')
    }
  }

  function getTankName(tankId: string): string {
    return tanks.find((t) => t.id === tankId)?.name ?? 'Unknown'
  }

  function getDuNumber(duId: string): string {
    return dispenserUnits.find((d) => d.id === duId)?.number ?? '—'
  }

  function handleFuelChange(nextFuel: FuelType) {
    const matchingTanks = tanks.filter((t) => t.fuelType === nextFuel)
    setForm((prev) => ({
      ...prev,
      fuelType: nextFuel,
      tankId: matchingTanks.some((t) => t.id === prev.tankId) ? prev.tankId : matchingTanks[0]?.id ?? '',
    }))
  }

  function handleDuChange(nextDuId: string) {
    const taken = takenSlotsForDu(nextDuId, modal?.nozzle?.id)
    setForm((prev) => {
      const slotOk = !taken.has(prev.slot)
      const fallbackSlot = (NOZZLE_SLOTS.find((s) => !taken.has(s)) ?? 1) as NozzleSlot
      return {
        ...prev,
        dispenserUnitId: nextDuId,
        slot: slotOk ? prev.slot : fallbackSlot,
      }
    })
  }

  const noDuYet = dispenserUnits.length === 0
  const takenSlots = takenSlotsForDu(form.dispenserUnitId, modal?.nozzle?.id)
  const noTankForFuel = tanksForFuel.length === 0
  const submitDisabled = noDuYet || noTankForFuel

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <p className="text-on-surface-variant text-sm">{nozzles.length} nozzle(s) configured</p>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary-container text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Nozzle
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {nozzles.map((nozzle) => (
          <div
            key={nozzle.id}
            className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="size-10 rounded-full bg-secondary-container/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[18px] text-secondary-container">
                  local_gas_station
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-on-surface font-semibold text-sm truncate">
                  DU {getDuNumber(nozzle.dispenserUnitId)} · Slot {nozzle.slot} · {nozzle.name}
                </p>
                <p className="text-on-surface-variant text-xs break-words">
                  {nozzle.fuelType} · {getTankName(nozzle.tankId)}
                </p>
                <p className="text-on-surface-variant text-[11px] break-words mt-1">
                  Initial: {nozzle.initialCumVolume.toLocaleString('en-IN')} L · ₹{nozzle.initialCumSale.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                onClick={() => openEdit(nozzle)}
                className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete ${nozzle.name}?`)) deleteNozzle(nozzle.id)
                }}
                className="p-2 rounded-lg text-on-surface-variant hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'add' ? 'Add Nozzle' : 'Edit Nozzle'}
          onClose={() => setModal(null)}
        >
          <div className="flex flex-col gap-4">
            {noDuYet && (
              <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs font-medium">
                Add a Dispenser Unit first.
              </p>
            )}

            <Field label="Nozzle Name">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Nozzle A"
                className={INPUT_CLS}
                disabled={noDuYet}
              />
            </Field>

            <Field label="Dispenser Unit">
              <select
                value={form.dispenserUnitId}
                onChange={(e) => handleDuChange(e.target.value)}
                className={INPUT_CLS}
                disabled={noDuYet}
              >
                {dispenserUnits.map((du) => (
                  <option key={du.id} value={du.id}>
                    DU {du.number} · {du.displayName}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Slot">
              <select
                value={form.slot}
                onChange={(e) => setForm({ ...form, slot: Number(e.target.value) as NozzleSlot })}
                className={INPUT_CLS}
                disabled={noDuYet}
              >
                {NOZZLE_SLOTS.map((s) => {
                  const isTaken = takenSlots.has(s as NozzleSlot)
                  return (
                    <option key={s} value={s} disabled={isTaken}>
                      Slot {s}{isTaken ? ' (taken)' : ''}
                    </option>
                  )
                })}
              </select>
            </Field>

            <Field label="Fuel Type">
              <select
                value={form.fuelType}
                onChange={(e) => handleFuelChange(e.target.value as FuelType)}
                className={INPUT_CLS}
                disabled={noDuYet}
              >
                {FUEL_TYPES.map((ft) => (
                  <option key={ft} value={ft}>
                    {FUEL_LABELS[ft]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tank">
              {noTankForFuel ? (
                <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs font-medium">
                  Add a {form.fuelType === 'MS' ? 'Petrol' : 'Diesel'} tank first.
                </p>
              ) : (
                <select
                  value={form.tankId}
                  onChange={(e) => setForm({ ...form, tankId: e.target.value })}
                  className={INPUT_CLS}
                  disabled={noDuYet}
                >
                  {tanksForFuel.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.fuelType})
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <div className="border-t border-outline-variant pt-3 mt-1">
              <p className="text-on-surface text-sm font-semibold mb-1">Initial Meter Reading</p>
              <p className="text-on-surface-variant text-xs mb-3">
                The first shift on this nozzle will use these as its opening values.
                Subsequent shifts pick up from the previous shift's closing automatically.
                Use the most recent printer slip from this nozzle.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Initial CumVolume (L)">
                  <input
                    type="number"
                    step="0.001"
                    inputMode="decimal"
                    value={form.initialCumVolume}
                    onChange={(e) => setForm({ ...form, initialCumVolume: e.target.value })}
                    placeholder="0"
                    className={INPUT_CLS}
                    disabled={noDuYet}
                  />
                </Field>
                <Field label="Initial CumSale (₹)">
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={form.initialCumSale}
                    onChange={(e) => setForm({ ...form, initialCumSale: e.target.value })}
                    placeholder="0"
                    className={INPUT_CLS}
                    disabled={noDuYet}
                  />
                </Field>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-xs font-medium">{error}</p>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-outline-variant rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={submitDisabled}
                className="flex-1 py-2.5 bg-secondary-container text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modal.mode === 'add' ? 'Add Nozzle' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ── Staff Tab ── */
type UserForm = { name: string; role: Role; phone: string }
const EMPTY_USER: UserForm = { name: '', role: 'salesman', phone: '' }

const ROLE_COLORS: Record<Role, string> = {
  owner: 'bg-primary/10 text-primary',
  manager: 'bg-teal-50 text-teal-700',
  salesman: 'bg-secondary-container/10 text-secondary-container',
}

function StaffTab() {
  const { users, addUser, updateUser, deleteUser } = useAppStore()
  const { loginAsUser } = useAuthStore()
  const navigate = useNavigate()

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; user?: User } | null>(null)
  const [form, setForm] = useState<UserForm>(EMPTY_USER)

  function openAdd() {
    setForm(EMPTY_USER)
    setModal({ mode: 'add' })
  }

  function openEdit(user: User) {
    setForm({ name: user.name, role: user.role, phone: user.phone })
    setModal({ mode: 'edit', user })
  }

  function handleSave() {
    if (!form.name.trim() || !form.phone.trim()) return
    if (modal?.mode === 'add') {
      addUser(form)
    } else if (modal?.user) {
      updateUser(modal.user.id, form)
    }
    setModal(null)
  }

  function handleLoginAs(user: User) {
    loginAsUser(user)
    navigate('/')
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <p className="text-on-surface-variant text-sm">{users.length} staff member(s)</p>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary-container text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add User
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="size-10 rounded-full bg-primary flex items-center justify-center text-on-primary text-sm font-bold flex-shrink-0">
                {user.avatarInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-on-surface font-semibold text-sm truncate">{user.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-semibold capitalize',
                      ROLE_COLORS[user.role],
                    )}
                  >
                    {user.role}
                  </span>
                  <span className="text-on-surface-variant text-xs">+91 {user.phone}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 border-t border-outline-variant pt-3 sm:border-t-0 sm:pt-0">
              <button
                onClick={() => handleLoginAs(user)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors flex-1 sm:flex-initial"
              >
                <span className="material-symbols-outlined text-[14px]">switch_account</span>
                Login as
              </button>
              <button
                onClick={() => openEdit(user)}
                className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button
                onClick={() => {
                  if (confirm(`Remove ${user.name}?`)) deleteUser(user.id)
                }}
                className="p-2 rounded-lg text-on-surface-variant hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'add' ? 'Add Staff Member' : 'Edit Staff Member'}
          onClose={() => setModal(null)}
        >
          <div className="flex flex-col gap-4">
            <Field label="Full Name">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Selvam"
                className={INPUT_CLS}
              />
            </Field>
            <Field label="Role">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className={INPUT_CLS}
              >
                <option value="owner">Owner</option>
                <option value="manager">Manager</option>
                <option value="salesman">Salesman</option>
              </select>
            </Field>
            <Field label="Mobile Number">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface-variant text-sm pointer-events-none">
                  +91
                </span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  placeholder="10-digit number"
                  className={cn(INPUT_CLS, 'pl-10')}
                />
              </div>
            </Field>
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-outline-variant rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 bg-secondary-container text-white rounded-lg text-sm font-semibold hover:opacity-90"
              >
                {modal.mode === 'add' ? 'Add Member' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ── Other Sales Tab ── */
type OtherSalesForm = {
  name: string
  pricePerLitre: number
  quantityOptionsText: string
  active: boolean
}

const EMPTY_OTHER_SALES: OtherSalesForm = {
  name: '',
  pricePerLitre: 0,
  quantityOptionsText: '1, 2, 3, 5',
  active: true,
}

function parseQuantityOptions(text: string): number[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0)
}

function OtherSalesTab() {
  const { otherSalesItems, addOtherSalesItem, updateOtherSalesItem, deleteOtherSalesItem } = useAppStore()
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: OtherSalesItem } | null>(null)
  const [form, setForm] = useState<OtherSalesForm>(EMPTY_OTHER_SALES)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function openAdd() {
    setForm(EMPTY_OTHER_SALES)
    setError(null)
    setModal({ mode: 'add' })
  }

  function openEdit(item: OtherSalesItem) {
    setForm({
      name: item.name,
      pricePerLitre: item.pricePerLitre,
      quantityOptionsText: item.quantityOptions.join(', '),
      active: item.active,
    })
    setError(null)
    setModal({ mode: 'edit', item })
  }

  async function handleSave() {
    setError(null)
    const name = form.name.trim()
    if (!name) {
      setError('Name is required')
      return
    }
    if (!(form.pricePerLitre > 0)) {
      setError('Price per litre must be greater than 0')
      return
    }
    const quantityOptions = parseQuantityOptions(form.quantityOptionsText)
    if (quantityOptions.length === 0) {
      setError('Add at least one quantity option (e.g. "1, 2, 3, 5")')
      return
    }
    setBusy(true)
    try {
      if (modal?.mode === 'add') {
        await addOtherSalesItem({
          name,
          pricePerLitre: form.pricePerLitre,
          quantityOptions,
          active: form.active,
        })
      } else if (modal?.item) {
        await updateOtherSalesItem(modal.item.id, {
          name,
          pricePerLitre: form.pricePerLitre,
          quantityOptions,
          active: form.active,
        })
      }
      setModal(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save item')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(item: OtherSalesItem) {
    if (!confirm(`Delete ${item.name}?`)) return
    try {
      await deleteOtherSalesItem(item.id)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete item')
    }
  }

  async function toggleActive(item: OtherSalesItem) {
    try {
      await updateOtherSalesItem(item.id, { active: !item.active })
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update item')
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
        <p className="text-on-surface-variant text-sm max-w-xl">
          Catalog of non-fuel items sold (e.g. Distilled Water, Oil, AdBlue). Configure name, price per litre, and quantity options.
        </p>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary-container text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Item
        </button>
      </div>

      {otherSalesItems.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-6 text-center">
          <p className="text-on-surface-variant text-sm">No items yet. Add your first one.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {otherSalesItems.map((item) => (
              <div
                key={item.id}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-on-surface font-semibold text-sm truncate">{item.name}</p>
                    <p className="text-on-surface-variant text-xs mt-0.5">
                      ₹{item.pricePerLitre.toFixed(2)} / L
                    </p>
                    <p className="text-on-surface-variant text-xs mt-0.5">
                      Qty: {item.quantityOptions.join(' / ')}
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-on-surface-variant cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={() => toggleActive(item)}
                      className="size-4 rounded border-outline-variant accent-primary"
                    />
                    Active
                  </label>
                </div>
                <div className="flex items-center gap-2 border-t border-outline-variant pt-2">
                  <button
                    onClick={() => openEdit(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-on-surface border border-outline-variant rounded-lg hover:bg-surface-container"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-container">
                <tr className="text-left text-on-surface-variant text-xs uppercase tracking-wide">
                  <th className="py-2.5 px-4 font-semibold">Name</th>
                  <th className="py-2.5 px-4 font-semibold">Price / L</th>
                  <th className="py-2.5 px-4 font-semibold">Quantity Options</th>
                  <th className="py-2.5 px-4 font-semibold">Active</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {otherSalesItems.map((item) => (
                  <tr key={item.id} className="border-t border-outline-variant">
                    <td className="py-2.5 px-4 text-on-surface font-medium">{item.name}</td>
                    <td className="py-2.5 px-4 text-on-surface">₹{item.pricePerLitre.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-on-surface-variant">
                      {item.quantityOptions.join(' / ')}
                    </td>
                    <td className="py-2.5 px-4">
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={() => toggleActive(item)}
                        className="size-4 rounded border-outline-variant accent-primary cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 rounded-lg text-on-surface-variant hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modal && (
        <Modal
          title={modal.mode === 'add' ? 'Add Other Sales Item' : 'Edit Other Sales Item'}
          onClose={() => setModal(null)}
        >
          <div className="flex flex-col gap-4">
            <Field label="Name">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Distilled Water"
                className={INPUT_CLS}
              />
            </Field>
            <Field label="Price per Litre (₹)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.pricePerLitre}
                onChange={(e) => setForm({ ...form, pricePerLitre: Number(e.target.value) })}
                className={INPUT_CLS}
              />
            </Field>
            <Field label="Quantity Options (comma-separated)">
              <input
                value={form.quantityOptionsText}
                onChange={(e) => setForm({ ...form, quantityOptionsText: e.target.value })}
                placeholder="1, 2, 3, 5"
                className={INPUT_CLS}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="size-4 rounded border-outline-variant accent-primary"
              />
              Active
            </label>
            {error && <p className="text-red-600 text-xs font-medium">{error}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
              <button
                onClick={() => setModal(null)}
                disabled={busy}
                className="flex-1 py-2.5 border border-outline-variant rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={busy}
                className="flex-1 py-2.5 bg-secondary-container text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {busy ? 'Saving…' : modal.mode === 'add' ? 'Add Item' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ── Reusable simple list (Electronic Methods + Expense Categories) ── */
type SimpleNamedItem = { id: string; name: string; active: boolean }

interface SimpleNamedListTabProps<T extends SimpleNamedItem> {
  items: T[]
  description: string
  singularLabel: string
  emptyLabel: string
  iconName: string
  addItem: (data: Omit<T, 'id'>) => Promise<void>
  updateItem: (id: string, data: Partial<T>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
}

function SimpleNamedListTab<T extends SimpleNamedItem>({
  items,
  description,
  singularLabel,
  emptyLabel,
  iconName,
  addItem,
  updateItem,
  deleteItem,
}: SimpleNamedListTabProps<T>) {
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: T } | null>(null)
  const [form, setForm] = useState<{ name: string; active: boolean }>({ name: '', active: true })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function openAdd() {
    setForm({ name: '', active: true })
    setError(null)
    setModal({ mode: 'add' })
  }

  function openEdit(item: T) {
    setForm({ name: item.name, active: item.active })
    setError(null)
    setModal({ mode: 'edit', item })
  }

  async function handleSave() {
    setError(null)
    const name = form.name.trim()
    if (!name) {
      setError('Name is required')
      return
    }
    setBusy(true)
    try {
      if (modal?.mode === 'add') {
        await addItem({ name, active: form.active } as Omit<T, 'id'>)
      } else if (modal?.item) {
        await updateItem(modal.item.id, { name, active: form.active } as Partial<T>)
      }
      setModal(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to save ${singularLabel.toLowerCase()}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(item: T) {
    if (!confirm(`Delete ${item.name}?`)) return
    try {
      await deleteItem(item.id)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : `Failed to delete ${singularLabel.toLowerCase()}`)
    }
  }

  async function toggleActive(item: T) {
    try {
      await updateItem(item.id, { active: !item.active } as Partial<T>)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : `Failed to update ${singularLabel.toLowerCase()}`)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
        <p className="text-on-surface-variant text-sm max-w-xl">{description}</p>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary-container text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add {singularLabel}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-6 text-center">
          <p className="text-on-surface-variant text-sm">{emptyLabel}</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-primary">{iconName}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-on-surface font-semibold text-sm truncate">{item.name}</p>
                    <label className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant cursor-pointer mt-0.5">
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={() => toggleActive(item)}
                        className="size-3.5 rounded border-outline-variant accent-primary"
                      />
                      Active
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(item)}
                    className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-2 rounded-lg text-on-surface-variant hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-container">
                <tr className="text-left text-on-surface-variant text-xs uppercase tracking-wide">
                  <th className="py-2.5 px-4 font-semibold">Name</th>
                  <th className="py-2.5 px-4 font-semibold">Active</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-outline-variant">
                    <td className="py-2.5 px-4 text-on-surface font-medium">{item.name}</td>
                    <td className="py-2.5 px-4">
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={() => toggleActive(item)}
                        className="size-4 rounded border-outline-variant accent-primary cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 rounded-lg text-on-surface-variant hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modal && (
        <Modal
          title={modal.mode === 'add' ? `Add ${singularLabel}` : `Edit ${singularLabel}`}
          onClose={() => setModal(null)}
        >
          <div className="flex flex-col gap-4">
            <Field label="Name">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={`e.g. ${singularLabel}`}
                className={INPUT_CLS}
                autoFocus
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="size-4 rounded border-outline-variant accent-primary"
              />
              Active
            </label>
            {error && <p className="text-red-600 text-xs font-medium">{error}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
              <button
                onClick={() => setModal(null)}
                disabled={busy}
                className="flex-1 py-2.5 border border-outline-variant rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={busy}
                className="flex-1 py-2.5 bg-secondary-container text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {busy ? 'Saving…' : modal.mode === 'add' ? `Add ${singularLabel}` : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ── Electronic Methods Tab ── */
function ElectronicMethodsTab() {
  const { electronicMethods, addElectronicMethod, updateElectronicMethod, deleteElectronicMethod } = useAppStore()
  return (
    <SimpleNamedListTab<ElectronicMethod>
      items={electronicMethods}
      description="Payment methods customers use (UPI, Card, Wallet, …). Salesman picks from these in close-shift form."
      singularLabel="Method"
      emptyLabel="No methods yet. Add your first one."
      iconName="credit_card"
      addItem={addElectronicMethod}
      updateItem={updateElectronicMethod}
      deleteItem={deleteElectronicMethod}
    />
  )
}

/* ── Expense Categories Tab ── */
function ExpenseCategoriesTab() {
  const { expenseCategories, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory } = useAppStore()
  return (
    <SimpleNamedListTab<ExpenseCategory>
      items={expenseCategories}
      description="Categories for daily shift expenses (Tea/Coffee, Maintenance, …)."
      singularLabel="Category"
      emptyLabel="No categories yet. Add your first one."
      iconName="receipt_long"
      addItem={addExpenseCategory}
      updateItem={updateExpenseCategory}
      deleteItem={deleteExpenseCategory}
    />
  )
}

/* ── Fuel Prices Tab ── */
function FuelPricesTab() {
  const { fuelPrices, updateFuelPrice } = useAppStore()
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  const visiblePrices = useMemo(
    () => fuelPrices.filter((p) => (FUEL_TYPES as readonly string[]).includes(p.fuelType)),
    [fuelPrices],
  )

  function startEdit(id: string, current: number) {
    setEditing((prev) => ({ ...prev, [id]: String(current) }))
  }

  async function handleSave(id: string) {
    const val = parseFloat(editing[id] ?? '')
    if (isNaN(val) || val <= 0) return
    await updateFuelPrice(id, val)
    setEditing((prev) => { const n = { ...prev }; delete n[id]; return n })
    setSaved((prev) => ({ ...prev, [id]: true }))
    setTimeout(() => setSaved((prev) => { const n = { ...prev }; delete n[id]; return n }), 2000)
  }

  function handleCancel(id: string) {
    setEditing((prev) => { const n = { ...prev }; delete n[id]; return n })
  }

  if (visiblePrices.length === 0) {
    return <p className="text-on-surface-variant text-sm">No fuel prices found. Run SQL_SETUP.sql to seed data.</p>
  }

  return (
    <div className="max-w-lg flex flex-col gap-4">
      <p className="text-on-surface-variant text-sm">Update the selling price per litre for each fuel type. Changes apply to all new shift calculations.</p>
      {visiblePrices.map((p) => (
        <div key={p.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[18px] text-primary">local_offer</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-on-surface font-semibold text-sm truncate">{FUEL_LABELS[p.fuelType]}</p>
              {editing[p.id] === undefined && (
                <p className="text-on-surface-variant text-xs">₹{p.pricePerLitre.toFixed(2)} / litre</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            {editing[p.id] !== undefined ? (
              <>
                <div className="relative flex-1 sm:flex-initial">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-on-surface-variant text-sm pointer-events-none">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editing[p.id]}
                    onChange={(e) => setEditing((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    className="w-full sm:w-28 pl-6 pr-2 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus
                  />
                </div>
                <button onClick={() => handleSave(p.id)} className="px-3 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity">
                  Save
                </button>
                <button onClick={() => handleCancel(p.id)} className="px-3 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-xs font-medium hover:bg-surface-container transition-colors">
                  Cancel
                </button>
              </>
            ) : (
              <>
                {saved[p.id] && <span className="text-emerald-600 text-xs font-medium">✓ Saved</span>}
                <button
                  onClick={() => startEdit(p.id, p.pricePerLitre)}
                  className="ml-auto sm:ml-0 p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Main Settings Page ── */

// Salesman is allowed to view their own profile-ish info but should not be
// able to change shop config. Catalogs (Other Sales / Electronic / Expenses /
// Tanks / Nozzles / DUs / Prices / Staff) are owner+manager only.
const SALESMAN_TABS: Tab[] = ['bunk']

export default function SettingsPage() {
  const role = useAuthStore((s) => s.currentUser?.role)
  const visibleTabs = useMemo(() => {
    if (role === 'salesman') return TABS.filter((t) => SALESMAN_TABS.includes(t.id))
    return TABS
  }, [role])

  const [activeTab, setActiveTab] = useState<Tab>(visibleTabs[0]?.id ?? 'bunk')

  // Keep activeTab inside the visible set if role changes mid-session.
  if (!visibleTabs.some((t) => t.id === activeTab)) {
    setActiveTab(visibleTabs[0]?.id ?? 'bunk')
  }

  return (
    <div className="max-w-3xl">
      {/* Tabs — horizontal scroll on mobile, wrap to multiple rows on desktop
          (so all tabs are visible without scrolling on wider screens). */}
      <div className="flex gap-1 bg-surface-container p-1 rounded-xl mb-6 overflow-x-auto whitespace-nowrap sm:flex-wrap sm:overflow-visible sm:whitespace-normal [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 flex-shrink-0 justify-center py-2 px-3 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'bunk' && <BunkProfileTab />}
      {activeTab === 'dispensers' && <DispenserUnitsTab />}
      {activeTab === 'tanks' && <TanksTab />}
      {activeTab === 'nozzles' && <NozzlesTab />}
      {activeTab === 'other-sales' && <OtherSalesTab />}
      {activeTab === 'electronic' && <ElectronicMethodsTab />}
      {activeTab === 'expenses' && <ExpenseCategoriesTab />}
      {activeTab === 'staff' && <StaffTab />}
      {activeTab === 'prices' && <FuelPricesTab />}
    </div>
  )
}
