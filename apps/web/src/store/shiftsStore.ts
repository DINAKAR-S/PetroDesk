import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { BUNK_ID } from '@/lib/constants'
import { useAppStore } from '@/store/appStore'
import type { Shift, NozzleReading, TankerDelivery, Expense, FuelType, NozzleSlot, ShiftStatus } from '@/types'

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
  closings: {
    nozzleId: string
    closingCumVolume: number
    closingCumSale: number
  }[]
  cashCollected: number
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
  loading: boolean
  dateFilter: DateFilter
  statusFilter: 'all' | 'open' | 'closed' | 'flagged'
  setDateFilter: (f: DateFilter) => void
  setStatusFilter: (f: 'all' | 'open' | 'closed' | 'flagged') => void
  loadShifts: (dateFilter?: DateFilter) => Promise<void>
  loadNozzleReadings: (shiftId: string) => Promise<void>
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
    const { data: shiftStatus } = await supabase
      .from('shifts')
      .select('status')
      .eq('id', input.shiftId)
      .single()
    if (!shiftStatus || (shiftStatus as Record<string, unknown>).status !== 'open') {
      throw new Error('Shift is not open — cannot close')
    }

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

    const expectedCash = totalRevenue
    const cashVariance = input.cashCollected - expectedCash
    const closedAt = new Date().toISOString()

    const { error: updErr } = await supabase
      .from('shifts')
      .update({
        status: 'closed',
        closed_at: closedAt,
        total_litres_sold: totalLitresSold,
        total_revenue: totalRevenue,
        total_cash_collected: input.cashCollected,
        expected_cash: expectedCash,
        cash_variance: cashVariance,
        ms_litres: msLitres,
        hsd_litres: hsdLitres,
        ms_revenue: msRevenue,
        hsd_revenue: hsdRevenue,
      })
      .eq('id', input.shiftId)

    if (updErr) {
      throw new Error(updErr.message)
    }

    // Tank stock decrement: aggregate litres per tank via nozzle.tank_id lookup.
    const nozzleIds = updates.map((u) => u.nozzleId)
    if (nozzleIds.length > 0) {
      const { data: nozzleRows } = await supabase
        .from('nozzles')
        .select('id, tank_id')
        .in('id', nozzleIds)

      if (nozzleRows) {
        const nozzleToTank = new Map<string, string>()
        for (const n of nozzleRows as Record<string, unknown>[]) {
          nozzleToTank.set(n.id as string, n.tank_id as string)
        }

        const tankDelta = new Map<string, number>()
        for (const u of updates) {
          const tankId = nozzleToTank.get(u.nozzleId)
          if (!tankId) continue
          tankDelta.set(tankId, (tankDelta.get(tankId) ?? 0) + u.litresSold)
        }

        const updateTankStock = useAppStore.getState().updateTankStock
        for (const [tankId, litres] of tankDelta) {
          await updateTankStock(tankId, -litres)
        }
      }
    }

    set((s) => ({
      shifts: s.shifts.map((sh) =>
        sh.id === input.shiftId
          ? {
              ...sh,
              status: 'closed' as const,
              closedAt,
              totalLitresSold,
              totalRevenue,
              totalCashCollected: input.cashCollected,
              expectedCash,
              cashVariance,
              msLitres,
              hsdLitres,
              msRevenue,
              hsdRevenue,
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
        openingCumVolume: prev?.volume ?? 0,
        openingCumSale: prev?.sale ?? 0,
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
