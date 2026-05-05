import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { BUNK_ID } from '@/lib/constants'
import type { BunkProfile, Tank, Nozzle, NozzleSlot, User, FuelPrice, DispenserUnit } from '@/types'

interface AppState {
  bunk: BunkProfile
  tanks: Tank[]
  nozzles: Nozzle[]
  dispenserUnits: DispenserUnit[]
  users: User[]
  fuelPrices: FuelPrice[]
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
  loading: false,

  loadAll: async () => {
    set({ loading: true })
    try {
      const [bunkRes, tanksRes, nozzlesRes, dispenserUnitsRes, staffRes, pricesRes] = await Promise.all([
        supabase.from('bunks').select('*').eq('id', BUNK_ID).single(),
        supabase.from('tanks').select('*').eq('bunk_id', BUNK_ID).order('created_at'),
        supabase.from('nozzles').select('*').eq('bunk_id', BUNK_ID).order('dispenser_unit_id').order('slot'),
        supabase.from('dispenser_units').select('*').eq('bunk_id', BUNK_ID).order('number'),
        supabase.from('staff').select('*').eq('bunk_id', BUNK_ID).order('created_at'),
        supabase.from('fuel_prices').select('*').eq('bunk_id', BUNK_ID),
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
    const { data } = await supabase.from('dispenser_units').insert({
      bunk_id: BUNK_ID,
      number: d.number,
      display_name: d.displayName,
    }).select().single()
    if (data) {
      set((s) => ({
        dispenserUnits: [...s.dispenserUnits, {
          id: data.id as string,
          number: data.number as string,
          displayName: data.display_name as string,
        }],
      }))
    }
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

    const { data } = await supabase.from('nozzles').insert({
      bunk_id: BUNK_ID,
      dispenser_unit_id: n.dispenserUnitId,
      tank_id: n.tankId,
      slot: n.slot,
      fuel_type: n.fuelType,
      name: n.name,
    }).select().single()
    if (data) {
      set((s) => ({
        nozzles: [...s.nozzles, {
          id: data.id as string,
          name: data.name as string,
          dispenserUnitId: data.dispenser_unit_id as string,
          tankId: data.tank_id as string,
          slot: Number(data.slot) as NozzleSlot,
          fuelType: data.fuel_type as 'MS' | 'HSD',
        }],
      }))
    }
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
    await supabase.from('nozzles').update({
      name: data.name,
      dispenser_unit_id: data.dispenserUnitId,
      tank_id: data.tankId,
      slot: data.slot,
      fuel_type: data.fuelType,
    }).eq('id', id)
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
}))
