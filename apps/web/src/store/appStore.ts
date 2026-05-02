import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { BUNK_ID } from '@/lib/constants'
import { makeId } from '@/lib/utils'
import type { BunkProfile, Tank, Nozzle, User, FuelPrice } from '@/types'

interface AppState {
  bunk: BunkProfile
  tanks: Tank[]
  nozzles: Nozzle[]
  users: User[]
  fuelPrices: FuelPrice[]
  loading: boolean
  loadAll: () => Promise<void>
  updateBunk: (data: Partial<BunkProfile>) => Promise<void>
  addTank: (t: Omit<Tank, 'id'>) => Promise<void>
  updateTank: (id: string, data: Partial<Tank>) => Promise<void>
  deleteTank: (id: string) => Promise<void>
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
  users: [],
  fuelPrices: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true })
    try {
      const [bunkRes, tanksRes, nozzlesRes, staffRes, pricesRes] = await Promise.all([
        supabase.from('bunks').select('*').eq('id', BUNK_ID).single(),
        supabase.from('tanks').select('*').eq('bunk_id', BUNK_ID).order('created_at'),
        supabase.from('nozzles').select('*').eq('bunk_id', BUNK_ID).order('created_at'),
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
            fuelType: t.fuel_type as 'MS' | 'HSD' | 'XP',
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
            tankId: n.tank_id as string,
            fuelType: n.fuel_type as 'MS' | 'HSD' | 'XP',
            currentMeterReading: Number(n.current_meter_reading),
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
            fuelType: p.fuel_type as 'MS' | 'HSD' | 'XP',
            pricePerLitre: Number(p.price_per_litre),
          })),
        })
      }
    } finally {
      set({ loading: false })
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
        tanks: [...s.tanks, { id: data.id, name: data.name, fuelType: data.fuel_type, capacityL: Number(data.capacity_l), currentStockL: Number(data.current_stock_l) }],
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
    set((s) => ({ tanks: s.tanks.filter((t) => t.id !== id) }))
    await supabase.from('tanks').delete().eq('id', id)
  },

  addNozzle: async (n) => {
    const { data } = await supabase.from('nozzles').insert({
      bunk_id: BUNK_ID,
      tank_id: n.tankId,
      name: n.name,
      fuel_type: n.fuelType,
      current_meter_reading: n.currentMeterReading,
    }).select().single()
    if (data) {
      set((s) => ({
        nozzles: [...s.nozzles, { id: data.id, name: data.name, tankId: data.tank_id, fuelType: data.fuel_type, currentMeterReading: Number(data.current_meter_reading) }],
      }))
    }
  },

  updateNozzle: async (id, data) => {
    set((s) => ({ nozzles: s.nozzles.map((n) => (n.id === id ? { ...n, ...data } : n)) }))
    await supabase.from('nozzles').update({
      name: data.name,
      tank_id: data.tankId,
      fuel_type: data.fuelType,
      current_meter_reading: data.currentMeterReading,
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
