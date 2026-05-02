import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { BUNK_ID } from '@/lib/constants'
import type { Shift, TankerDelivery, Expense, FuelType } from '@/types'

export type DateFilter = 'today' | 'week' | 'month' | 'all'

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
    salesmanId: r.salesman_id as string,
    salesmanName: r.salesman_name as string,
    openedAt: r.opened_at as string,
    closedAt: r.closed_at as string | null,
    status: r.status as 'open' | 'closed' | 'flagged',
    totalLitresSold: Number(r.total_litres_sold),
    totalCashCollected: Number(r.total_cash_collected),
    expectedCash: Number(r.expected_cash),
    cashVariance: Number(r.cash_variance),
    dipVariancePct: Number(r.dip_variance_pct),
    msLitres: Number(r.ms_litres),
    hsdLitres: Number(r.hsd_litres),
    xpLitres: Number(r.xp_litres ?? 0),
    msRevenue: Number(r.ms_revenue),
    hsdRevenue: Number(r.hsd_revenue),
    xpRevenue: Number(r.xp_revenue ?? 0),
    notes: r.notes as string | null,
  }
}

export interface EditShiftData {
  msLitres: number
  hsdLitres: number
  msRevenue: number
  hsdRevenue: number
  cashCollected: number
  expectedCash: number
  dipVariancePct: number
  notes?: string
}

interface ShiftsState {
  shifts: Shift[]
  deliveries: TankerDelivery[]
  expenses: Expense[]
  loading: boolean
  dateFilter: DateFilter
  statusFilter: 'all' | 'open' | 'closed' | 'flagged'
  setDateFilter: (f: DateFilter) => void
  setStatusFilter: (f: 'all' | 'open' | 'closed' | 'flagged') => void
  loadShifts: (dateFilter?: DateFilter) => Promise<void>
  loadDeliveries: () => Promise<void>
  loadExpenses: () => Promise<void>
  openShift: (salesmanId: string, salesmanName: string) => Promise<Shift | null>
  closeShift: (
    shiftId: string,
    cashCollected: number,
    expectedCash: number,
    msLitres: number,
    hsdLitres: number,
    msRevenue: number,
    hsdRevenue: number,
    dipVariancePct?: number,
  ) => Promise<void>
  editShift: (shiftId: string, data: EditShiftData) => Promise<void>
  deleteShift: (id: string) => Promise<void>
  flagShift: (shiftId: string) => Promise<void>
  addDelivery: (d: Omit<TankerDelivery, 'id'>) => Promise<void>
  updateDelivery: (id: string, d: Omit<TankerDelivery, 'id'>) => Promise<void>
  deleteDelivery: (id: string) => Promise<void>
  addExpense: (e: Omit<Expense, 'id'>) => Promise<void>
  updateExpense: (id: string, e: Omit<Expense, 'id'>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
}

export const useShiftsStore = create<ShiftsState>((set, get) => ({
  shifts: [],
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
    if (data) set({ shifts: data.map(rowToShift) })
    set({ loading: false })
  },

  loadDeliveries: async () => {
    const { data } = await supabase
      .from('tanker_deliveries')
      .select('*')
      .eq('bunk_id', BUNK_ID)
      .order('delivery_date', { ascending: false })
    if (data) {
      set({
        deliveries: data.map((r: Record<string, unknown>) => ({
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
        expenses: data.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          description: r.description as string,
          amount: Number(r.amount),
          category: r.category as string,
          expenseDate: r.expense_date as string,
        })),
      })
    }
  },

  openShift: async (salesmanId, salesmanName) => {
    const { data, error } = await supabase
      .from('shifts')
      .insert({ bunk_id: BUNK_ID, salesman_id: salesmanId, salesman_name: salesmanName })
      .select()
      .single()
    if (error) {
      console.error('openShift failed:', error.message)
      return null
    }
    if (data) {
      const shift = rowToShift(data as Record<string, unknown>)
      set((s) => ({ shifts: [shift, ...s.shifts] }))
      return shift
    }
    return null
  },

  closeShift: async (shiftId, cashCollected, expectedCash, msLitres, hsdLitres, msRevenue, hsdRevenue, dipVariancePct = 0) => {
    const totalLitres = msLitres + hsdLitres
    const cashVariance = cashCollected - expectedCash
    await supabase.from('shifts').update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      total_litres_sold: totalLitres,
      total_cash_collected: cashCollected,
      expected_cash: expectedCash,
      cash_variance: cashVariance,
      dip_variance_pct: dipVariancePct,
      ms_litres: msLitres,
      hsd_litres: hsdLitres,
      ms_revenue: msRevenue,
      hsd_revenue: hsdRevenue,
    }).eq('id', shiftId)

    set((s) => ({
      shifts: s.shifts.map((sh) =>
        sh.id === shiftId
          ? {
              ...sh,
              status: 'closed' as const,
              closedAt: new Date().toISOString(),
              totalLitresSold: totalLitres,
              totalCashCollected: cashCollected,
              expectedCash,
              cashVariance,
              dipVariancePct,
              msLitres,
              hsdLitres,
              msRevenue,
              hsdRevenue,
            }
          : sh,
      ),
    }))
  },

  editShift: async (shiftId, data) => {
    const totalLitres = data.msLitres + data.hsdLitres
    const cashVariance = data.cashCollected - data.expectedCash
    await supabase.from('shifts').update({
      total_litres_sold: totalLitres,
      total_cash_collected: data.cashCollected,
      expected_cash: data.expectedCash,
      cash_variance: cashVariance,
      dip_variance_pct: data.dipVariancePct,
      ms_litres: data.msLitres,
      hsd_litres: data.hsdLitres,
      ms_revenue: data.msRevenue,
      hsd_revenue: data.hsdRevenue,
      notes: data.notes ?? null,
    }).eq('id', shiftId)

    set((s) => ({
      shifts: s.shifts.map((sh) =>
        sh.id === shiftId
          ? {
              ...sh,
              totalLitresSold: totalLitres,
              totalCashCollected: data.cashCollected,
              expectedCash: data.expectedCash,
              cashVariance,
              dipVariancePct: data.dipVariancePct,
              msLitres: data.msLitres,
              hsdLitres: data.hsdLitres,
              msRevenue: data.msRevenue,
              hsdRevenue: data.hsdRevenue,
              notes: data.notes ?? null,
            }
          : sh,
      ),
    }))
  },

  deleteShift: async (id) => {
    set((s) => ({ shifts: s.shifts.filter((sh) => sh.id !== id) }))
    await supabase.from('shifts').delete().eq('id', id)
  },

  flagShift: async (shiftId) => {
    await supabase.from('shifts').update({ status: 'flagged' }).eq('id', shiftId)
    set((s) => ({
      shifts: s.shifts.map((sh) => (sh.id === shiftId ? { ...sh, status: 'flagged' as const } : sh)),
    }))
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
