import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { BUNK_ID } from '@/lib/constants'
import { useAppStore } from '@/store/appStore'
import type {
  Shift,
  NozzleReading,
  TankerDelivery,
  Expense,
  FuelType,
  NozzleSlot,
  ShiftStatus,
  ShiftOtherSale,
  ShiftElectronicEntry,
  ShiftExpenseEntry,
  ShiftCreditEntry,
} from '@/types'

export type DateFilter = 'today' | 'week' | 'month' | 'all'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function dateRangeFor(filter: DateFilter): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString()
  if (filter === 'today') {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    return { from, to }
  }
  if (filter === 'week') {
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    return { from, to }
  }
  if (filter === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    return { from, to }
  }
  return { from: '2000-01-01', to }
}

function rowToShift(r: Record<string, unknown>): Shift {
  return {
    id: r.id as string,
    dispenserUnitId: r.dispenser_unit_id as string,
    salesmanId: r.salesman_id as string,
    salesmanName: r.salesman_name as string,
    openedAt: r.opened_at as string,
    closedAt: r.closed_at as string | null,
    status: r.status as ShiftStatus,
    totalLitresSold: Number(r.total_litres_sold ?? 0),
    totalRevenue: Number(r.total_revenue ?? 0),
    totalCashCollected: Number(r.total_cash_collected ?? 0),
    expectedCash: Number(r.expected_cash ?? 0),
    cashVariance: Number(r.cash_variance ?? 0),
    msLitres: Number(r.ms_litres ?? 0),
    hsdLitres: Number(r.hsd_litres ?? 0),
    msRevenue: Number(r.ms_revenue ?? 0),
    hsdRevenue: Number(r.hsd_revenue ?? 0),
    testingMsVolume: Number(r.testing_ms_volume ?? 0),
    testingMsSale: Number(r.testing_ms_sale ?? 0),
    testingHsdVolume: Number(r.testing_hsd_volume ?? 0),
    testingHsdSale: Number(r.testing_hsd_sale ?? 0),
    totalOtherSales: Number(r.total_other_sales ?? 0),
    totalElectronic: Number(r.total_electronic ?? 0),
    totalCredit: Number(r.total_credit ?? 0),
    totalExpenses: Number(r.total_expenses ?? 0),
    cashInHand: Number(r.cash_in_hand ?? 0),
    handoverToNext: Number(r.handover_to_next ?? 0),
    depositToOwner: Number(r.deposit_to_owner ?? 0),
    notes: (r.notes as string | null) ?? null,
  }
}

function rowToReading(r: Record<string, unknown>): NozzleReading {
  return {
    id: r.id as string,
    shiftId: r.shift_id as string,
    nozzleId: r.nozzle_id as string,
    nozzleName: r.nozzle_name as string,
    fuelType: r.fuel_type as FuelType,
    slot: Number(r.slot) as NozzleSlot,
    openingCumVolume: Number(r.opening_cum_volume ?? 0),
    openingCumSale: Number(r.opening_cum_sale ?? 0),
    closingCumVolume: r.closing_cum_volume == null ? null : Number(r.closing_cum_volume),
    closingCumSale: r.closing_cum_sale == null ? null : Number(r.closing_cum_sale),
    litresSold: Number(r.litres_sold ?? 0),
    rupeesSold: Number(r.rupees_sold ?? 0),
  }
}

function rowToOtherSale(r: Record<string, unknown>): ShiftOtherSale {
  return {
    id: r.id as string,
    shiftId: r.shift_id as string,
    itemId: (r.item_id as string | null) ?? null,
    itemName: r.item_name as string,
    quantity: Number(r.quantity ?? 0),
    amount: Number(r.amount ?? 0),
  }
}

function rowToElectronicEntry(r: Record<string, unknown>): ShiftElectronicEntry {
  return {
    id: r.id as string,
    shiftId: r.shift_id as string,
    methodId: (r.method_id as string | null) ?? null,
    methodName: r.method_name as string,
    amount: Number(r.amount ?? 0),
    bankConfirmed: Boolean(r.bank_confirmed ?? false),
    bankConfirmedAt: (r.bank_confirmed_at as string | null) ?? null,
    bankConfirmedByUserId: (r.bank_confirmed_by_user_id as string | null) ?? null,
  }
}

function rowToExpenseEntry(r: Record<string, unknown>): ShiftExpenseEntry {
  return {
    id: r.id as string,
    shiftId: r.shift_id as string,
    categoryId: (r.category_id as string | null) ?? null,
    categoryName: r.category_name as string,
    amount: Number(r.amount ?? 0),
    description: (r.description as string | null) ?? null,
  }
}

function rowToCreditEntry(r: Record<string, unknown>): ShiftCreditEntry {
  return {
    id: r.id as string,
    shiftId: r.shift_id as string,
    customerId: (r.customer_id as string | null) ?? null,
    customerName: r.customer_name as string,
    amount: Number(r.amount ?? 0),
  }
}

export interface OpenShiftInput {
  dispenserUnitId: string
  salesmanId: string
  salesmanName: string
  openings: {
    nozzleId: string
    nozzleName: string
    fuelType: FuelType
    slot: NozzleSlot
    openingCumVolume: number
    openingCumSale: number
  }[]
}

export interface CloseShiftInput {
  shiftId: string
  closings: { nozzleId: string; closingCumVolume: number; closingCumSale: number }[]
  testing: { msVolume: number; msSale: number; hsdVolume: number; hsdSale: number }
  otherSales: { itemId: string | null; itemName: string; quantity: number; amount: number }[]
  electronic: { methodId: string | null; methodName: string; amount: number }[]
  credit: { customerId: string | null; customerName: string; amount: number }[]
  expenses: { categoryId: string | null; categoryName: string; amount: number; description: string | null }[]
  cashInHand: number
  handoverToNext: number
  depositToOwner: number
}

export interface OpeningReading {
  nozzleId: string
  nozzleName: string
  fuelType: FuelType
  slot: NozzleSlot
  openingCumVolume: number
  openingCumSale: number
}

interface ShiftsState {
  shifts: Shift[]
  nozzleReadings: NozzleReading[]
  deliveries: TankerDelivery[]
  expenses: Expense[]
  otherSales: ShiftOtherSale[]
  electronicEntries: ShiftElectronicEntry[]
  expenseEntries: ShiftExpenseEntry[]
  creditEntries: ShiftCreditEntry[]
  loading: boolean
  dateFilter: DateFilter
  statusFilter: 'all' | 'open' | 'closed' | 'flagged'
  setDateFilter: (f: DateFilter) => void
  setStatusFilter: (f: 'all' | 'open' | 'closed' | 'flagged') => void
  loadShifts: (dateFilter?: DateFilter) => Promise<void>
  loadNozzleReadings: (shiftId: string) => Promise<void>
  loadShiftEntries: (shiftId: string) => Promise<void>
  loadDeliveries: () => Promise<void>
  loadExpenses: () => Promise<void>
  openShift: (input: OpenShiftInput) => Promise<{ shiftId: string }>
  closeShift: (input: CloseShiftInput) => Promise<void>
  updateOpeningReadings: (shiftId: string, openings: OpeningReading[]) => Promise<void>
  getOpeningReadingsForDU: (dispenserUnitId: string) => Promise<OpeningReading[]>
  flagShift: (shiftId: string) => Promise<void>
  deleteShift: (id: string) => Promise<void>
  addDelivery: (d: Omit<TankerDelivery, 'id'>) => Promise<void>
  updateDelivery: (id: string, d: Omit<TankerDelivery, 'id'>) => Promise<void>
  deleteDelivery: (id: string) => Promise<void>
  addExpense: (e: Omit<Expense, 'id'>) => Promise<void>
  updateExpense: (id: string, e: Omit<Expense, 'id'>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
}

export const useShiftsStore = create<ShiftsState>((set, get) => ({
  shifts: [],
  nozzleReadings: [],
  deliveries: [],
  expenses: [],
  otherSales: [],
  electronicEntries: [],
  expenseEntries: [],
  creditEntries: [],
  loading: false,
  dateFilter: 'week',
  statusFilter: 'all',

  setDateFilter: (f) => {
    set({ dateFilter: f })
    get().loadShifts(f)
  },

  setStatusFilter: (f) => set({ statusFilter: f }),

  loadShifts: async (df) => {
    const filter = df ?? get().dateFilter
    set({ loading: true })
    const { from, to } = dateRangeFor(filter)
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('bunk_id', BUNK_ID)
      .gte('opened_at', from)
      .lte('opened_at', to)
      .order('opened_at', { ascending: false })
    if (data) set({ shifts: (data as Record<string, unknown>[]).map(rowToShift) })
    set({ loading: false })
  },

  loadNozzleReadings: async (shiftId) => {
    const { data } = await supabase
      .from('nozzle_readings')
      .select('*')
      .eq('shift_id', shiftId)
      .order('slot', { ascending: true })
    if (data) {
      const fresh = (data as Record<string, unknown>[]).map(rowToReading)
      set((s) => ({
        nozzleReadings: [
          ...s.nozzleReadings.filter((r) => r.shiftId !== shiftId),
          ...fresh,
        ],
      }))
    }
  },

  loadShiftEntries: async (shiftId) => {
    const [otherRes, elecRes, expRes, credRes] = await Promise.all([
      supabase.from('shift_other_sales').select('*').eq('shift_id', shiftId),
      supabase.from('shift_electronic_entries').select('*').eq('shift_id', shiftId),
      supabase.from('shift_expense_entries').select('*').eq('shift_id', shiftId),
      supabase.from('shift_credit_entries').select('*').eq('shift_id', shiftId),
    ])

    const freshOther = otherRes.data
      ? (otherRes.data as Record<string, unknown>[]).map(rowToOtherSale)
      : []
    const freshElec = elecRes.data
      ? (elecRes.data as Record<string, unknown>[]).map(rowToElectronicEntry)
      : []
    const freshExp = expRes.data
      ? (expRes.data as Record<string, unknown>[]).map(rowToExpenseEntry)
      : []
    const freshCred = credRes.data
      ? (credRes.data as Record<string, unknown>[]).map(rowToCreditEntry)
      : []

    set((s) => ({
      otherSales: [...s.otherSales.filter((x) => x.shiftId !== shiftId), ...freshOther],
      electronicEntries: [
        ...s.electronicEntries.filter((x) => x.shiftId !== shiftId),
        ...freshElec,
      ],
      expenseEntries: [...s.expenseEntries.filter((x) => x.shiftId !== shiftId), ...freshExp],
      creditEntries: [...s.creditEntries.filter((x) => x.shiftId !== shiftId), ...freshCred],
    }))
  },

  loadDeliveries: async () => {
    const { data } = await supabase
      .from('tanker_deliveries')
      .select('*')
      .eq('bunk_id', BUNK_ID)
      .order('delivery_date', { ascending: false })
    if (data) {
      set({
        deliveries: (data as Record<string, unknown>[]).map((r) => ({
          id: r.id as string,
          tankId: r.tank_id as string,
          tankName: r.tank_name as string,
          fuelType: r.fuel_type as FuelType,
          quantityL: Number(r.quantity_l),
          ratePerLitre: r.rate_per_litre != null ? Number(r.rate_per_litre) : null,
          totalAmount: r.total_amount != null ? Number(r.total_amount) : null,
          supplierName: r.supplier_name as string | null,
          invoiceNumber: r.invoice_number as string | null,
          deliveryDate: r.delivery_date as string,
        })),
      })
    }
  },

  loadExpenses: async () => {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('bunk_id', BUNK_ID)
      .order('expense_date', { ascending: false })
    if (data) {
      set({
        expenses: (data as Record<string, unknown>[]).map((r) => ({
          id: r.id as string,
          description: r.description as string,
          amount: Number(r.amount),
          category: r.category as string,
          expenseDate: r.expense_date as string,
        })),
      })
    }
  },

  openShift: async (input) => {
    if (!UUID_REGEX.test(input.salesmanId)) {
      throw new Error('Invalid salesman id')
    }

    const { data: existing } = await supabase
      .from('shifts')
      .select('id')
      .eq('dispenser_unit_id', input.dispenserUnitId)
      .eq('status', 'open')
      .limit(1)
    if (existing && existing.length > 0) {
      throw new Error('Dispenser unit already has an open shift')
    }

    const { data: shiftRow, error: shiftErr } = await supabase
      .from('shifts')
      .insert({
        bunk_id: BUNK_ID,
        dispenser_unit_id: input.dispenserUnitId,
        salesman_id: input.salesmanId,
        salesman_name: input.salesmanName,
        status: 'open',
      })
      .select()
      .single()

    if (shiftErr || !shiftRow) {
      throw new Error(shiftErr?.message ?? 'Failed to open shift')
    }

    const shift = rowToShift(shiftRow as Record<string, unknown>)
    const shiftId = shift.id

    const readingsPayload = input.openings.map((o) => ({
      shift_id: shiftId,
      nozzle_id: o.nozzleId,
      nozzle_name: o.nozzleName,
      fuel_type: o.fuelType,
      slot: o.slot,
      opening_cum_volume: o.openingCumVolume,
      opening_cum_sale: o.openingCumSale,
      closing_cum_volume: null,
      closing_cum_sale: null,
      litres_sold: 0,
      rupees_sold: 0,
    }))

    const { data: readingRows, error: readingErr } = await supabase
      .from('nozzle_readings')
      .insert(readingsPayload)
      .select()

    if (readingErr) {
      // Roll back the orphan shift row so the DU isn't permanently locked.
      await supabase.from('shifts').delete().eq('id', shiftId)
      throw new Error(readingErr.message)
    }

    const newReadings = readingRows
      ? (readingRows as Record<string, unknown>[]).map(rowToReading)
      : []

    set((s) => ({
      shifts: [shift, ...s.shifts],
      nozzleReadings: [...s.nozzleReadings, ...newReadings],
    }))

    return { shiftId }
  },

  closeShift: async (input) => {
    // Guard against double-close: if shift is already closed, reject before any writes.
    // Allow both initial close (status='open') and re-close/edit (status='closed').
    // For an edit on a closed shift we restore the previous tank-stock decrement
    // before re-applying with the new values further below.
    const { data: shiftStatus } = await supabase
      .from('shifts')
      .select('status')
      .eq('id', input.shiftId)
      .single()
    const currentStatus = (shiftStatus as Record<string, unknown> | null)?.status
    if (currentStatus !== 'open' && currentStatus !== 'closed') {
      throw new Error('Shift is not in an editable state')
    }
    const isEdit = currentStatus === 'closed'

    const { data: readingRows, error: loadErr } = await supabase
      .from('nozzle_readings')
      .select('*')
      .eq('shift_id', input.shiftId)

    if (loadErr || !readingRows) {
      throw new Error(loadErr?.message ?? 'Failed to load nozzle readings')
    }

    const readings = (readingRows as Record<string, unknown>[]).map(rowToReading)

    interface UpdatePayload {
      readingId: string
      nozzleId: string
      fuelType: FuelType
      closingCumVolume: number
      closingCumSale: number
      litresSold: number
      rupeesSold: number
    }

    const updates: UpdatePayload[] = []

    for (const closing of input.closings) {
      const reading = readings.find((r) => r.nozzleId === closing.nozzleId)
      if (!reading) {
        throw new Error(`No opening reading found for nozzle ${closing.nozzleId}`)
      }
      if (closing.closingCumVolume < reading.openingCumVolume) {
        throw new Error(
          `Closing volume (${closing.closingCumVolume}) less than opening (${reading.openingCumVolume}) for ${reading.nozzleName}`,
        )
      }
      if (closing.closingCumSale < reading.openingCumSale) {
        throw new Error(
          `Closing sale (${closing.closingCumSale}) less than opening (${reading.openingCumSale}) for ${reading.nozzleName}`,
        )
      }
      updates.push({
        readingId: reading.id,
        nozzleId: reading.nozzleId,
        fuelType: reading.fuelType,
        closingCumVolume: closing.closingCumVolume,
        closingCumSale: closing.closingCumSale,
        litresSold: closing.closingCumVolume - reading.openingCumVolume,
        rupeesSold: closing.closingCumSale - reading.openingCumSale,
      })
    }

    for (const u of updates) {
      const { error } = await supabase
        .from('nozzle_readings')
        .update({
          closing_cum_volume: u.closingCumVolume,
          closing_cum_sale: u.closingCumSale,
          litres_sold: u.litresSold,
          rupees_sold: u.rupeesSold,
        })
        .eq('id', u.readingId)
      if (error) {
        throw new Error(error.message)
      }
    }

    // One pass over updates to produce all six aggregates. Reads as
    // "for each nozzle, add its litres + rupees to the right buckets."
    const totals = updates.reduce(
      (acc, u) => {
        acc.totalLitresSold += u.litresSold
        acc.totalRevenue += u.rupeesSold
        if (u.fuelType === 'MS') {
          acc.msLitres += u.litresSold
          acc.msRevenue += u.rupeesSold
        } else {
          acc.hsdLitres += u.litresSold
          acc.hsdRevenue += u.rupeesSold
        }
        return acc
      },
      { totalLitresSold: 0, totalRevenue: 0, msLitres: 0, hsdLitres: 0, msRevenue: 0, hsdRevenue: 0 },
    )
    const { totalLitresSold, totalRevenue, msLitres, hsdLitres, msRevenue, hsdRevenue } = totals

    // Phase 2 section totals.
    const totalOtherSales = input.otherSales.reduce((sum, x) => sum + x.amount, 0)
    const totalElectronic = input.electronic.reduce((sum, x) => sum + x.amount, 0)
    const totalCredit = input.credit.reduce((sum, x) => sum + x.amount, 0)
    const totalExpenses = input.expenses.reduce((sum, x) => sum + x.amount, 0)
    const testingTotalSale = input.testing.msSale + input.testing.hsdSale
    const testingTotalVolume = input.testing.msVolume + input.testing.hsdVolume

    // Testing must not exceed what was actually pumped. Otherwise we'd write
    // negative adjusted revenue / litres and produce nonsense reports.
    if (input.testing.msVolume > msLitres) {
      throw new Error(`Petrol testing volume (${input.testing.msVolume} L) exceeds pumped petrol (${msLitres} L)`)
    }
    if (input.testing.hsdVolume > hsdLitres) {
      throw new Error(`Diesel testing volume (${input.testing.hsdVolume} L) exceeds pumped diesel (${hsdLitres} L)`)
    }
    if (input.testing.msSale > msRevenue) {
      throw new Error(`Petrol testing sale (₹${input.testing.msSale}) exceeds pumped petrol revenue (₹${msRevenue})`)
    }
    if (input.testing.hsdSale > hsdRevenue) {
      throw new Error(`Diesel testing sale (₹${input.testing.hsdSale}) exceeds pumped diesel revenue (₹${hsdRevenue})`)
    }

    // Adjust nozzle aggregates for testing draws — keep MS/HSD per-fuel
    // values pre-adjustment (they're a record of pumped litres). Top-line
    // shift totals reflect customer-sold quantity only.
    const adjustedTotalLitres = totalLitresSold - testingTotalVolume
    const adjustedRevenue = totalRevenue - testingTotalSale

    const expectedCash =
      adjustedRevenue + totalOtherSales - totalElectronic - totalCredit - totalExpenses
    const cashVariance = input.cashInHand - expectedCash
    const closedAt = new Date().toISOString()

    // Idempotent retry: if a previous close attempt inserted some child rows
    // before failing, wipe them so we don't duplicate on this attempt.
    // The shift is still 'open' here (the status flip happens at the end)
    // so it's safe to clear and re-insert. Order matters: customer_ledger
    // first because it references shift_credit_entries indirectly via shift_id.
    {
      const cleanups = await Promise.all([
        supabase.from('customer_ledger').delete().eq('shift_id', input.shiftId).eq('entry_type', 'credit_taken'),
        supabase.from('shift_other_sales').delete().eq('shift_id', input.shiftId),
        supabase.from('shift_electronic_entries').delete().eq('shift_id', input.shiftId),
        supabase.from('shift_expense_entries').delete().eq('shift_id', input.shiftId),
        supabase.from('shift_credit_entries').delete().eq('shift_id', input.shiftId),
      ])
      for (const c of cleanups) {
        if (c.error) throw new Error(`Failed to clear previous attempt: ${c.error.message}`)
      }
    }

    // Insert child rows BEFORE flipping shift status — if any insert fails,
    // the shift remains 'open' and the UI can retry (idempotent via the wipe above).
    const insertedOtherSales: ShiftOtherSale[] = []
    if (input.otherSales.length > 0) {
      const payload = input.otherSales.map((x) => ({
        shift_id: input.shiftId,
        item_id: x.itemId,
        item_name: x.itemName,
        quantity: x.quantity,
        amount: x.amount,
      }))
      const { data, error } = await supabase.from('shift_other_sales').insert(payload).select()
      if (error) throw new Error(error.message)
      if (data) {
        for (const row of data as Record<string, unknown>[]) {
          insertedOtherSales.push(rowToOtherSale(row))
        }
      }
    }

    const insertedElectronic: ShiftElectronicEntry[] = []
    if (input.electronic.length > 0) {
      const payload = input.electronic.map((x) => ({
        shift_id: input.shiftId,
        method_id: x.methodId,
        method_name: x.methodName,
        amount: x.amount,
        bank_confirmed: false,
        bank_confirmed_at: null,
        bank_confirmed_by_user_id: null,
      }))
      const { data, error } = await supabase.from('shift_electronic_entries').insert(payload).select()
      if (error) throw new Error(error.message)
      if (data) {
        for (const row of data as Record<string, unknown>[]) {
          insertedElectronic.push(rowToElectronicEntry(row))
        }
      }
    }

    const insertedExpenses: ShiftExpenseEntry[] = []
    if (input.expenses.length > 0) {
      const payload = input.expenses.map((x) => ({
        shift_id: input.shiftId,
        category_id: x.categoryId,
        category_name: x.categoryName,
        amount: x.amount,
        description: x.description,
      }))
      const { data, error } = await supabase.from('shift_expense_entries').insert(payload).select()
      if (error) throw new Error(error.message)
      if (data) {
        for (const row of data as Record<string, unknown>[]) {
          insertedExpenses.push(rowToExpenseEntry(row))
        }
      }
    }

    const insertedCredit: ShiftCreditEntry[] = []
    if (input.credit.length > 0) {
      const payload = input.credit.map((x) => ({
        shift_id: input.shiftId,
        customer_id: x.customerId,
        customer_name: x.customerName,
        amount: x.amount,
      }))
      const { data, error } = await supabase.from('shift_credit_entries').insert(payload).select()
      if (error) throw new Error(error.message)
      if (data) {
        for (const row of data as Record<string, unknown>[]) {
          insertedCredit.push(rowToCreditEntry(row))
        }
      }
    }

    // Customer ledger entries — only for credit rows that reference a
    // persisted customer. Ad-hoc names (customerId === null) skip the ledger.
    const ledgerPayload = input.credit
      .filter((x) => x.customerId !== null)
      .map((x) => ({
        customer_id: x.customerId,
        shift_id: input.shiftId,
        entry_type: 'credit_taken',
        amount: x.amount,
        notes: null,
      }))
    if (ledgerPayload.length > 0) {
      const { error } = await supabase.from('customer_ledger').insert(ledgerPayload)
      if (error) throw new Error(error.message)
    }

    // Tank stock: runs BEFORE the status flip. If a tank update fails, the
    // shift stays in its previous state and the user can retry.
    //
    // When editing a closed shift, we ALSO restore the previous decrement
    // first (using the readings' existing `litres_sold` from the prior close)
    // so the new decrement applies cleanly. Net effect = (new − old) per tank.
    const nozzleIds = updates.map((u) => u.nozzleId)
    if (nozzleIds.length > 0) {
      const { data: nozzleRows, error: nozzlesErr } = await supabase
        .from('nozzles')
        .select('id, tank_id')
        .in('id', nozzleIds)

      if (nozzlesErr) throw new Error(`Failed to look up nozzle tanks: ${nozzlesErr.message}`)

      if (nozzleRows) {
        const nozzleToTank = new Map<string, string>()
        for (const n of nozzleRows as Record<string, unknown>[]) {
          nozzleToTank.set(n.id as string, n.tank_id as string)
        }

        const updateTankStock = useAppStore.getState().updateTankStock

        // Restore old decrement (only when editing a closed shift).
        if (isEdit) {
          const oldTankDelta = new Map<string, number>()
          for (const r of readings) {
            const tankId = nozzleToTank.get(r.nozzleId)
            if (!tankId || r.litresSold === 0) continue
            oldTankDelta.set(tankId, (oldTankDelta.get(tankId) ?? 0) + r.litresSold)
          }
          for (const [tankId, litres] of oldTankDelta) {
            await updateTankStock(tankId, +litres) // ADD back the old decrement
          }
        }

        // Apply new decrement.
        const tankDelta = new Map<string, number>()
        for (const u of updates) {
          const tankId = nozzleToTank.get(u.nozzleId)
          if (!tankId) continue
          tankDelta.set(tankId, (tankDelta.get(tankId) ?? 0) + u.litresSold)
        }
        for (const [tankId, litres] of tankDelta) {
          await updateTankStock(tankId, -litres)
        }
      }
    }

    // Status flip is the LAST DB write. Once the shift is 'closed',
    // the status guard at the top blocks any further closeShift on this id.
    const { error: updErr } = await supabase
      .from('shifts')
      .update({
        status: 'closed',
        closed_at: closedAt,
        total_litres_sold: adjustedTotalLitres,
        total_revenue: adjustedRevenue,
        total_cash_collected: input.cashInHand,
        expected_cash: expectedCash,
        cash_variance: cashVariance,
        ms_litres: msLitres,
        hsd_litres: hsdLitres,
        ms_revenue: msRevenue,
        hsd_revenue: hsdRevenue,
        testing_ms_volume: input.testing.msVolume,
        testing_ms_sale: input.testing.msSale,
        testing_hsd_volume: input.testing.hsdVolume,
        testing_hsd_sale: input.testing.hsdSale,
        total_other_sales: totalOtherSales,
        total_electronic: totalElectronic,
        total_credit: totalCredit,
        total_expenses: totalExpenses,
        cash_in_hand: input.cashInHand,
        handover_to_next: input.handoverToNext,
        deposit_to_owner: input.depositToOwner,
      })
      .eq('id', input.shiftId)

    if (updErr) {
      throw new Error(updErr.message)
    }

    set((s) => ({
      shifts: s.shifts.map((sh) =>
        sh.id === input.shiftId
          ? {
              ...sh,
              status: 'closed' as const,
              closedAt,
              totalLitresSold: adjustedTotalLitres,
              totalRevenue: adjustedRevenue,
              totalCashCollected: input.cashInHand,
              expectedCash,
              cashVariance,
              msLitres,
              hsdLitres,
              msRevenue,
              hsdRevenue,
              testingMsVolume: input.testing.msVolume,
              testingMsSale: input.testing.msSale,
              testingHsdVolume: input.testing.hsdVolume,
              testingHsdSale: input.testing.hsdSale,
              totalOtherSales,
              totalElectronic,
              totalCredit,
              totalExpenses,
              cashInHand: input.cashInHand,
              handoverToNext: input.handoverToNext,
              depositToOwner: input.depositToOwner,
            }
          : sh,
      ),
      nozzleReadings: s.nozzleReadings.map((r) => {
        const u = updates.find((x) => x.readingId === r.id)
        if (!u) return r
        return {
          ...r,
          closingCumVolume: u.closingCumVolume,
          closingCumSale: u.closingCumSale,
          litresSold: u.litresSold,
          rupeesSold: u.rupeesSold,
        }
      }),
      otherSales: [
        ...s.otherSales.filter((x) => x.shiftId !== input.shiftId),
        ...insertedOtherSales,
      ],
      electronicEntries: [
        ...s.electronicEntries.filter((x) => x.shiftId !== input.shiftId),
        ...insertedElectronic,
      ],
      expenseEntries: [
        ...s.expenseEntries.filter((x) => x.shiftId !== input.shiftId),
        ...insertedExpenses,
      ],
      creditEntries: [
        ...s.creditEntries.filter((x) => x.shiftId !== input.shiftId),
        ...insertedCredit,
      ],
    }))
  },

  updateOpeningReadings: async (shiftId, openings) => {
    const shift = get().shifts.find((s) => s.id === shiftId)
    if (!shift) {
      const { data } = await supabase.from('shifts').select('status').eq('id', shiftId).single()
      if (!data || (data as Record<string, unknown>).status !== 'open') {
        throw new Error('Cannot edit openings on a closed shift')
      }
    } else if (shift.status !== 'open') {
      throw new Error('Cannot edit openings on a closed shift')
    }

    for (const o of openings) {
      const { error } = await supabase
        .from('nozzle_readings')
        .update({
          opening_cum_volume: o.openingCumVolume,
          opening_cum_sale: o.openingCumSale,
        })
        .eq('shift_id', shiftId)
        .eq('nozzle_id', o.nozzleId)
      if (error) {
        throw new Error(error.message)
      }
    }

    set((s) => ({
      nozzleReadings: s.nozzleReadings.map((r) => {
        if (r.shiftId !== shiftId) return r
        const match = openings.find((o) => o.nozzleId === r.nozzleId)
        if (!match) return r
        return {
          ...r,
          openingCumVolume: match.openingCumVolume,
          openingCumSale: match.openingCumSale,
        }
      }),
    }))
  },

  getOpeningReadingsForDU: async (dispenserUnitId) => {
    // Always start from the LIVE nozzles for this DU. If a previous shift
    // referenced a now-deleted nozzle, we don't carry that stale ID forward.
    const liveNozzles = useAppStore
      .getState()
      .nozzles.filter((n) => n.dispenserUnitId === dispenserUnitId)
      .slice()
      .sort((a, b) => a.slot - b.slot)

    const { data: lastShift } = await supabase
      .from('shifts')
      .select('id')
      .eq('dispenser_unit_id', dispenserUnitId)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(1)

    // Map nozzleId → last shift's closing values (if any).
    const lastClosing = new Map<string, { volume: number; sale: number }>()
    if (lastShift && lastShift.length > 0) {
      const lastShiftId = (lastShift[0] as Record<string, unknown>).id as string
      const { data: readingRows } = await supabase
        .from('nozzle_readings')
        .select('*')
        .eq('shift_id', lastShiftId)
      if (readingRows) {
        for (const row of readingRows as Record<string, unknown>[]) {
          const r = rowToReading(row)
          lastClosing.set(r.nozzleId, {
            volume: r.closingCumVolume ?? r.openingCumVolume,
            sale: r.closingCumSale ?? r.openingCumSale,
          })
        }
      }
    }

    return liveNozzles.map((n) => {
      const prev = lastClosing.get(n.id)
      return {
        nozzleId: n.id,
        nozzleName: n.name,
        fuelType: n.fuelType,
        slot: n.slot,
        // Priority: previous shift's closing → nozzle's configured initial.
        // The Nozzle type guarantees `initialCumVolume`/`initialCumSale` are
        // numbers (default 0 from the DB column), so no further fallback needed.
        openingCumVolume: prev?.volume ?? n.initialCumVolume,
        openingCumSale: prev?.sale ?? n.initialCumSale,
      }
    })
  },

  flagShift: async (shiftId) => {
    await supabase.from('shifts').update({ status: 'flagged' }).eq('id', shiftId)
    set((s) => ({
      shifts: s.shifts.map((sh) => (sh.id === shiftId ? { ...sh, status: 'flagged' as const } : sh)),
    }))
  },

  deleteShift: async (id) => {
    set((s) => ({
      shifts: s.shifts.filter((sh) => sh.id !== id),
      nozzleReadings: s.nozzleReadings.filter((r) => r.shiftId !== id),
    }))
    await supabase.from('shifts').delete().eq('id', id)
  },

  addDelivery: async (d) => {
    const { data } = await supabase.from('tanker_deliveries').insert({
      bunk_id: BUNK_ID,
      tank_id: d.tankId,
      tank_name: d.tankName,
      fuel_type: d.fuelType,
      quantity_l: d.quantityL,
      rate_per_litre: d.ratePerLitre,
      total_amount: d.totalAmount,
      supplier_name: d.supplierName,
      invoice_number: d.invoiceNumber,
      delivery_date: d.deliveryDate,
    }).select().single()
    if (data) {
      set((s) => ({
        deliveries: [{ ...d, id: (data as Record<string, unknown>).id as string }, ...s.deliveries],
      }))
    }
  },

  updateDelivery: async (id, d) => {
    set((s) => ({
      deliveries: s.deliveries.map((x) => (x.id === id ? { ...d, id } : x)),
    }))
    await supabase.from('tanker_deliveries').update({
      tank_id: d.tankId,
      tank_name: d.tankName,
      fuel_type: d.fuelType,
      quantity_l: d.quantityL,
      rate_per_litre: d.ratePerLitre,
      total_amount: d.totalAmount,
      supplier_name: d.supplierName,
      invoice_number: d.invoiceNumber,
      delivery_date: d.deliveryDate,
    }).eq('id', id)
  },

  deleteDelivery: async (id) => {
    set((s) => ({ deliveries: s.deliveries.filter((d) => d.id !== id) }))
    await supabase.from('tanker_deliveries').delete().eq('id', id)
  },

  addExpense: async (e) => {
    const { data } = await supabase.from('expenses').insert({
      bunk_id: BUNK_ID,
      description: e.description,
      amount: e.amount,
      category: e.category,
      expense_date: e.expenseDate,
    }).select().single()
    if (data) {
      set((s) => ({
        expenses: [{ ...e, id: (data as Record<string, unknown>).id as string }, ...s.expenses],
      }))
    }
  },

  updateExpense: async (id, e) => {
    set((s) => ({
      expenses: s.expenses.map((x) => (x.id === id ? { ...e, id } : x)),
    }))
    await supabase.from('expenses').update({
      description: e.description,
      amount: e.amount,
      category: e.category,
      expense_date: e.expenseDate,
    }).eq('id', id)
  },

  deleteExpense: async (id) => {
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }))
    await supabase.from('expenses').delete().eq('id', id)
  },
}))
