import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { BUNK_ID } from '@/lib/constants'
import type {
  BunkProfile,
  Tank,
  Nozzle,
  NozzleSlot,
  User,
  FuelPrice,
  DispenserUnit,
  OtherSalesItem,
  ElectronicMethod,
  ExpenseCategory,
  Customer,
} from '@/types'

interface AppState {
  bunk: BunkProfile
  tanks: Tank[]
  nozzles: Nozzle[]
  dispenserUnits: DispenserUnit[]
  users: User[]
  fuelPrices: FuelPrice[]
  otherSalesItems: OtherSalesItem[]
  electronicMethods: ElectronicMethod[]
  expenseCategories: ExpenseCategory[]
  customers: Customer[]
  loading: boolean
  loadAll: () => Promise<void>
  loadDispenserUnits: () => Promise<void>
  updateBunk: (data: Partial<BunkProfile>) => Promise<void>
  addTank: (t: Omit<Tank, 'id'>) => Promise<void>
  updateTank: (id: string, data: Partial<Tank>) => Promise<void>
  deleteTank: (id: string) => Promise<void>
  addDispenserUnit: (d: Omit<DispenserUnit, 'id'>) => Promise<void>
  updateDispenserUnit: (id: string, data: Partial<DispenserUnit>) => Promise<void>
  deleteDispenserUnit: (id: string) => Promise<void>
  addNozzle: (n: Omit<Nozzle, 'id'>) => Promise<void>
  updateNozzle: (id: string, data: Partial<Nozzle>) => Promise<void>
  deleteNozzle: (id: string) => Promise<void>
  addUser: (u: Omit<User, 'id' | 'avatarInitials'>) => Promise<void>
  updateUser: (id: string, data: Partial<User>) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  updateTankStock: (tankId: string, delta: number) => Promise<void>
  updateFuelPrice: (id: string, pricePerLitre: number) => Promise<void>
  addOtherSalesItem: (item: Omit<OtherSalesItem, 'id'>) => Promise<void>
  updateOtherSalesItem: (id: string, data: Partial<OtherSalesItem>) => Promise<void>
  deleteOtherSalesItem: (id: string) => Promise<void>
  addElectronicMethod: (method: Omit<ElectronicMethod, 'id'>) => Promise<void>
  updateElectronicMethod: (id: string, data: Partial<ElectronicMethod>) => Promise<void>
  deleteElectronicMethod: (id: string) => Promise<void>
  addExpenseCategory: (category: Omit<ExpenseCategory, 'id'>) => Promise<void>
  updateExpenseCategory: (id: string, data: Partial<ExpenseCategory>) => Promise<void>
  deleteExpenseCategory: (id: string) => Promise<void>
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<Customer>
  findOrCreateCustomerByName: (name: string, phone: string | null) => Promise<Customer>
}

const FALLBACK_BUNK: BunkProfile = {
  name: 'Rajan Petroleum',
  address: '12 Anna Salai, Chennai – 600002',
  gstNumber: '33AABCU9603R1ZX',
  ownerName: 'Rajan',
}

export const useAppStore = create<AppState>((set, get) => ({
  bunk: FALLBACK_BUNK,
  tanks: [],
  nozzles: [],
  dispenserUnits: [],
  users: [],
  fuelPrices: [],
  otherSalesItems: [],
  electronicMethods: [],
  expenseCategories: [],
  customers: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true })
    try {
      const [
        bunkRes,
        tanksRes,
        nozzlesRes,
        dispenserUnitsRes,
        staffRes,
        pricesRes,
        otherSalesItemsRes,
        electronicMethodsRes,
        expenseCategoriesRes,
        customersRes,
      ] = await Promise.all([
        supabase.from('bunks').select('*').eq('id', BUNK_ID).single(),
        supabase.from('tanks').select('*').eq('bunk_id', BUNK_ID).order('created_at'),
        supabase.from('nozzles').select('*').eq('bunk_id', BUNK_ID).order('dispenser_unit_id').order('slot'),
        supabase.from('dispenser_units').select('*').eq('bunk_id', BUNK_ID).order('number'),
        supabase.from('staff').select('*').eq('bunk_id', BUNK_ID).order('created_at'),
        supabase.from('fuel_prices').select('*').eq('bunk_id', BUNK_ID),
        supabase.from('other_sales_items').select('*').eq('bunk_id', BUNK_ID).order('created_at'),
        supabase.from('electronic_methods').select('*').eq('bunk_id', BUNK_ID).order('created_at'),
        supabase.from('expense_categories').select('*').eq('bunk_id', BUNK_ID).order('created_at'),
        supabase.from('customers').select('*').eq('bunk_id', BUNK_ID).order('created_at'),
      ])

      if (bunkRes.data) {
        const b = bunkRes.data
        set({
          bunk: { id: b.id, name: b.name, address: b.address ?? '', gstNumber: b.gst_number ?? '', ownerName: b.owner_name ?? '' },
        })
      }

      if (tanksRes.data) {
        set({
          tanks: tanksRes.data.map((t: Record<string, unknown>) => ({
            id: t.id as string,
            name: t.name as string,
            fuelType: t.fuel_type as 'MS' | 'HSD',
            capacityL: Number(t.capacity_l),
            currentStockL: Number(t.current_stock_l),
          })),
        })
      }

      if (nozzlesRes.data) {
        set({
          nozzles: nozzlesRes.data.map((n: Record<string, unknown>) => ({
            id: n.id as string,
            name: n.name as string,
            dispenserUnitId: n.dispenser_unit_id as string,
            tankId: n.tank_id as string,
            slot: Number(n.slot) as NozzleSlot,
            fuelType: n.fuel_type as 'MS' | 'HSD',
            initialCumVolume: Number(n.initial_cum_volume ?? 0),
            initialCumSale: Number(n.initial_cum_sale ?? 0),
          })),
        })
      }

      if (dispenserUnitsRes.data) {
        set({
          dispenserUnits: dispenserUnitsRes.data.map((d: Record<string, unknown>) => ({
            id: d.id as string,
            number: d.number as string,
            displayName: d.display_name as string,
          })),
        })
      }

      if (staffRes.data) {
        set({
          users: staffRes.data.map((u: Record<string, unknown>) => ({
            id: u.id as string,
            name: u.name as string,
            role: u.role as 'owner' | 'manager' | 'salesman',
            phone: u.phone as string,
            avatarInitials: (u.avatar_initials as string) ?? (u.name as string).slice(0, 2).toUpperCase(),
          })),
        })
      }

      if (pricesRes.data) {
        set({
          fuelPrices: pricesRes.data.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            fuelType: p.fuel_type as 'MS' | 'HSD',
            pricePerLitre: Number(p.price_per_litre),
          })),
        })
      }

      if (otherSalesItemsRes.data) {
        set({
          otherSalesItems: otherSalesItemsRes.data.map((r: Record<string, unknown>) => {
            const qo = r.quantity_options
            return {
              id: r.id as string,
              name: r.name as string,
              pricePerLitre: Number(r.price_per_litre),
              quantityOptions: Array.isArray(qo) ? (qo as number[]) : [],
              active: Boolean(r.active),
            }
          }),
        })
      }

      if (electronicMethodsRes.data) {
        set({
          electronicMethods: electronicMethodsRes.data.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            name: r.name as string,
            active: Boolean(r.active),
          })),
        })
      }

      if (expenseCategoriesRes.data) {
        set({
          expenseCategories: expenseCategoriesRes.data.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            name: r.name as string,
            active: Boolean(r.active),
          })),
        })
      }

      if (customersRes.data) {
        set({
          customers: customersRes.data.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            name: r.name as string,
            phone: (r.phone as string | null) ?? null,
            notes: (r.notes as string | null) ?? null,
          })),
        })
      }
    } finally {
      set({ loading: false })
    }
  },

  loadDispenserUnits: async () => {
    const { data } = await supabase.from('dispenser_units').select('*').eq('bunk_id', BUNK_ID).order('number')
    if (data) {
      set({
        dispenserUnits: data.map((d: Record<string, unknown>) => ({
          id: d.id as string,
          number: d.number as string,
          displayName: d.display_name as string,
        })),
      })
    }
  },

  updateBunk: async (data) => {
    set((s) => ({ bunk: { ...s.bunk, ...data } }))
    await supabase.from('bunks').update({
      name: data.name,
      address: data.address,
      gst_number: data.gstNumber,
      owner_name: data.ownerName,
    }).eq('id', BUNK_ID)
  },

  addTank: async (t) => {
    const { data } = await supabase.from('tanks').insert({
      bunk_id: BUNK_ID,
      name: t.name,
      fuel_type: t.fuelType,
      capacity_l: t.capacityL,
      current_stock_l: t.currentStockL,
    }).select().single()
    if (data) {
      set((s) => ({
        tanks: [...s.tanks, {
          id: data.id as string,
          name: data.name as string,
          fuelType: data.fuel_type as 'MS' | 'HSD',
          capacityL: Number(data.capacity_l),
          currentStockL: Number(data.current_stock_l),
        }],
      }))
    }
  },

  updateTank: async (id, data) => {
    set((s) => ({ tanks: s.tanks.map((t) => (t.id === id ? { ...t, ...data } : t)) }))
    await supabase.from('tanks').update({
      name: data.name,
      fuel_type: data.fuelType,
      capacity_l: data.capacityL,
      current_stock_l: data.currentStockL,
    }).eq('id', id)
  },

  deleteTank: async (id) => {
    // Block delete in the UI layer if any nozzle still points at this tank.
    // The DB FK is RESTRICT — surfacing a clear error beats a Postgres "violates foreign key" message.
    const linked = get().nozzles.some((n) => n.tankId === id)
    if (linked) {
      throw new Error('Remove all nozzles linked to this tank first')
    }
    const previous = get().tanks
    set((s) => ({ tanks: s.tanks.filter((t) => t.id !== id) }))
    const { error } = await supabase.from('tanks').delete().eq('id', id)
    if (error) {
      // Roll back local state so the UI matches the DB.
      set({ tanks: previous })
      throw new Error(error.message)
    }
  },

  addDispenserUnit: async (d) => {
    const { data, error } = await supabase.from('dispenser_units').insert({
      bunk_id: BUNK_ID,
      number: d.number,
      display_name: d.displayName,
    }).select().single()
    if (error) {
      throw new Error(error.message)
    }
    if (!data) {
      throw new Error('Dispenser unit insert returned no row')
    }
    set((s) => ({
      dispenserUnits: [...s.dispenserUnits, {
        id: data.id as string,
        number: data.number as string,
        displayName: data.display_name as string,
      }],
    }))
  },

  updateDispenserUnit: async (id, data) => {
    set((s) => ({
      dispenserUnits: s.dispenserUnits.map((d) => (d.id === id ? { ...d, ...data } : d)),
    }))
    await supabase.from('dispenser_units').update({
      number: data.number,
      display_name: data.displayName,
    }).eq('id', id)
  },

  deleteDispenserUnit: async (id) => {
    set((s) => ({ dispenserUnits: s.dispenserUnits.filter((d) => d.id !== id) }))
    await supabase.from('dispenser_units').delete().eq('id', id)
  },

  addNozzle: async (n) => {
    const tank = get().tanks.find((t) => t.id === n.tankId)
    if (!tank) {
      throw new Error('Tank not found')
    }
    if (tank.fuelType !== n.fuelType) {
      throw new Error('Tank fuel type does not match nozzle fuel type')
    }
    const du = get().dispenserUnits.find((d) => d.id === n.dispenserUnitId)
    if (!du) {
      throw new Error('Dispenser unit not found')
    }
    const slotTaken = get().nozzles.some(
      (existing) => existing.dispenserUnitId === n.dispenserUnitId && existing.slot === n.slot
    )
    if (slotTaken) {
      throw new Error('Slot already used in this dispenser unit')
    }

    const { data, error } = await supabase.from('nozzles').insert({
      bunk_id: BUNK_ID,
      dispenser_unit_id: n.dispenserUnitId,
      tank_id: n.tankId,
      slot: n.slot,
      fuel_type: n.fuelType,
      name: n.name,
      initial_cum_volume: n.initialCumVolume,
      initial_cum_sale: n.initialCumSale,
    }).select().single()
    if (error) {
      throw new Error(error.message)
    }
    if (!data) {
      throw new Error('Nozzle insert returned no row')
    }
    set((s) => ({
      nozzles: [...s.nozzles, {
        id: data.id as string,
        name: data.name as string,
        dispenserUnitId: data.dispenser_unit_id as string,
        tankId: data.tank_id as string,
        slot: Number(data.slot) as NozzleSlot,
        fuelType: data.fuel_type as 'MS' | 'HSD',
        initialCumVolume: Number(data.initial_cum_volume ?? 0),
        initialCumSale: Number(data.initial_cum_sale ?? 0),
      }],
    }))
  },

  updateNozzle: async (id, data) => {
    const current = get().nozzles.find((n) => n.id === id)
    if (!current) {
      throw new Error('Nozzle not found')
    }
    const nextFuelType = data.fuelType ?? current.fuelType
    const nextTankId = data.tankId ?? current.tankId
    const nextDispenserUnitId = data.dispenserUnitId ?? current.dispenserUnitId

    if (data.tankId !== undefined || data.fuelType !== undefined) {
      const tank = get().tanks.find((t) => t.id === nextTankId)
      if (!tank) {
        throw new Error('Tank not found')
      }
      if (tank.fuelType !== nextFuelType) {
        throw new Error('Tank fuel type does not match nozzle fuel type')
      }
    }

    if (data.dispenserUnitId !== undefined) {
      const du = get().dispenserUnits.find((d) => d.id === nextDispenserUnitId)
      if (!du) {
        throw new Error('Dispenser unit not found')
      }
    }

    // Slot conflict check — a nozzle can't move to a slot already taken on the same DU
    // (skipping itself). Mirror of the check in addNozzle.
    const nextSlot = data.slot ?? current.slot
    const slotTaken = get().nozzles.some(
      (existing) =>
        existing.id !== id &&
        existing.dispenserUnitId === nextDispenserUnitId &&
        existing.slot === nextSlot,
    )
    if (slotTaken) {
      throw new Error('Slot already used in this dispenser unit')
    }

    set((s) => ({ nozzles: s.nozzles.map((n) => (n.id === id ? { ...n, ...data } : n)) }))
    // Build the DB update payload from only the fields that were provided.
    // Snake-case mapping: TS camelCase → Postgres column names.
    const payload: Record<string, unknown> = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.dispenserUnitId !== undefined) payload.dispenser_unit_id = data.dispenserUnitId
    if (data.tankId !== undefined) payload.tank_id = data.tankId
    if (data.slot !== undefined) payload.slot = data.slot
    if (data.fuelType !== undefined) payload.fuel_type = data.fuelType
    if (data.initialCumVolume !== undefined) payload.initial_cum_volume = data.initialCumVolume
    if (data.initialCumSale !== undefined) payload.initial_cum_sale = data.initialCumSale
    const { error } = await supabase.from('nozzles').update(payload).eq('id', id)
    if (error) throw new Error(error.message)
  },

  deleteNozzle: async (id) => {
    set((s) => ({ nozzles: s.nozzles.filter((n) => n.id !== id) }))
    await supabase.from('nozzles').delete().eq('id', id)
  },

  addUser: async (u) => {
    const initials = u.name.slice(0, 2).toUpperCase()
    const { data } = await supabase.from('staff').insert({
      bunk_id: BUNK_ID,
      name: u.name,
      role: u.role,
      phone: u.phone,
      avatar_initials: initials,
    }).select().single()
    if (data) {
      set((s) => ({
        users: [...s.users, { id: data.id, name: data.name, role: data.role, phone: data.phone, avatarInitials: initials }],
      }))
    }
  },

  updateUser: async (id, data) => {
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...data } : u)) }))
    await supabase.from('staff').update({
      name: data.name,
      role: data.role,
      phone: data.phone,
    }).eq('id', id)
  },

  deleteUser: async (id) => {
    set((s) => ({ users: s.users.filter((u) => u.id !== id) }))
    await supabase.from('staff').delete().eq('id', id)
  },

  updateFuelPrice: async (id, pricePerLitre) => {
    set((s) => ({
      fuelPrices: s.fuelPrices.map((p) => (p.id === id ? { ...p, pricePerLitre } : p)),
    }))
    await supabase.from('fuel_prices').update({ price_per_litre: pricePerLitre }).eq('id', id)
  },

  updateTankStock: async (tankId, delta) => {
    const tank = get().tanks.find((t) => t.id === tankId)
    if (!tank) return
    const newStock = Math.max(0, tank.currentStockL + delta)
    set((s) => ({ tanks: s.tanks.map((t) => (t.id === tankId ? { ...t, currentStockL: newStock } : t)) }))
    await supabase.from('tanks').update({ current_stock_l: newStock }).eq('id', tankId)
  },

  addOtherSalesItem: async (item) => {
    const { data, error } = await supabase.from('other_sales_items').insert({
      bunk_id: BUNK_ID,
      name: item.name,
      price_per_litre: item.pricePerLitre,
      quantity_options: item.quantityOptions,
      active: item.active,
    }).select().single()
    if (error) {
      throw new Error(error.message)
    }
    if (!data) {
      throw new Error('Other sales item insert returned no row')
    }
    const qo = (data as Record<string, unknown>).quantity_options
    const created: OtherSalesItem = {
      id: data.id as string,
      name: data.name as string,
      pricePerLitre: Number(data.price_per_litre),
      quantityOptions: Array.isArray(qo) ? (qo as number[]) : [],
      active: Boolean(data.active),
    }
    set((s) => ({ otherSalesItems: [...s.otherSalesItems, created] }))
  },

  updateOtherSalesItem: async (id, data) => {
    set((s) => ({
      otherSalesItems: s.otherSalesItems.map((i) => (i.id === id ? { ...i, ...data } : i)),
    }))
    const payload: Record<string, unknown> = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.pricePerLitre !== undefined) payload.price_per_litre = data.pricePerLitre
    if (data.quantityOptions !== undefined) payload.quantity_options = data.quantityOptions
    if (data.active !== undefined) payload.active = data.active
    const { error } = await supabase.from('other_sales_items').update(payload).eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },

  deleteOtherSalesItem: async (id) => {
    // Soft delete: set active=false. A hard delete would FK-fail when any
    // closed shift's `shift_other_sales` rows still reference this item.
    // Active=false hides it from new shift dropdowns; historical data stays intact.
    const previous = get().otherSalesItems
    set((s) => ({ otherSalesItems: s.otherSalesItems.filter((i) => i.id !== id) }))
    const { error } = await supabase
      .from('other_sales_items')
      .update({ active: false })
      .eq('id', id)
    if (error) {
      set({ otherSalesItems: previous })
      throw new Error(error.message)
    }
  },

  addElectronicMethod: async (method) => {
    const { data, error } = await supabase.from('electronic_methods').insert({
      bunk_id: BUNK_ID,
      name: method.name,
      active: method.active,
    }).select().single()
    if (error) {
      throw new Error(error.message)
    }
    if (!data) {
      throw new Error('Electronic method insert returned no row')
    }
    const created: ElectronicMethod = {
      id: data.id as string,
      name: data.name as string,
      active: Boolean(data.active),
    }
    set((s) => ({ electronicMethods: [...s.electronicMethods, created] }))
  },

  updateElectronicMethod: async (id, data) => {
    set((s) => ({
      electronicMethods: s.electronicMethods.map((m) => (m.id === id ? { ...m, ...data } : m)),
    }))
    const payload: Record<string, unknown> = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.active !== undefined) payload.active = data.active
    const { error } = await supabase.from('electronic_methods').update(payload).eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },

  deleteElectronicMethod: async (id) => {
    // Soft delete: see deleteOtherSalesItem for rationale.
    const previous = get().electronicMethods
    set((s) => ({ electronicMethods: s.electronicMethods.filter((m) => m.id !== id) }))
    const { error } = await supabase
      .from('electronic_methods')
      .update({ active: false })
      .eq('id', id)
    if (error) {
      set({ electronicMethods: previous })
      throw new Error(error.message)
    }
  },

  addExpenseCategory: async (category) => {
    const { data, error } = await supabase.from('expense_categories').insert({
      bunk_id: BUNK_ID,
      name: category.name,
      active: category.active,
    }).select().single()
    if (error) {
      throw new Error(error.message)
    }
    if (!data) {
      throw new Error('Expense category insert returned no row')
    }
    const created: ExpenseCategory = {
      id: data.id as string,
      name: data.name as string,
      active: Boolean(data.active),
    }
    set((s) => ({ expenseCategories: [...s.expenseCategories, created] }))
  },

  updateExpenseCategory: async (id, data) => {
    set((s) => ({
      expenseCategories: s.expenseCategories.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }))
    const payload: Record<string, unknown> = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.active !== undefined) payload.active = data.active
    const { error } = await supabase.from('expense_categories').update(payload).eq('id', id)
    if (error) {
      throw new Error(error.message)
    }
  },

  deleteExpenseCategory: async (id) => {
    // Soft delete: see deleteOtherSalesItem for rationale.
    const previous = get().expenseCategories
    set((s) => ({ expenseCategories: s.expenseCategories.filter((c) => c.id !== id) }))
    const { error } = await supabase
      .from('expense_categories')
      .update({ active: false })
      .eq('id', id)
    if (error) {
      set({ expenseCategories: previous })
      throw new Error(error.message)
    }
  },

  addCustomer: async (customer) => {
    const { data, error } = await supabase.from('customers').insert({
      bunk_id: BUNK_ID,
      name: customer.name,
      phone: customer.phone,
      notes: customer.notes,
    }).select().single()
    if (error) {
      throw new Error(error.message)
    }
    if (!data) {
      throw new Error('Customer insert returned no row')
    }
    const created: Customer = {
      id: data.id as string,
      name: data.name as string,
      phone: (data.phone as string | null) ?? null,
      notes: (data.notes as string | null) ?? null,
    }
    set((s) => ({ customers: [...s.customers, created] }))
    return created
  },

  findOrCreateCustomerByName: async (name, phone) => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('bunk_id', BUNK_ID)
      .ilike('name', name)
      .limit(1)
    if (error) {
      throw new Error(error.message)
    }
    if (data && data.length > 0) {
      const r = data[0] as Record<string, unknown>
      const found: Customer = {
        id: r.id as string,
        name: r.name as string,
        phone: (r.phone as string | null) ?? null,
        notes: (r.notes as string | null) ?? null,
      }
      // Make sure the in-memory cache reflects this customer (in case loadAll hasn't seen it yet)
      const exists = get().customers.some((c) => c.id === found.id)
      if (!exists) {
        set((s) => ({ customers: [...s.customers, found] }))
      }
      return found
    }
    return await get().addCustomer({ name, phone, notes: null })
  },
}))
