import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import type { Customer, CustomerLedgerEntry, CustomerLedgerEntryType } from '@/types'

const STORAGE_BUCKET = 'customer-photos'

function rowToLedgerEntry(r: Record<string, unknown>): CustomerLedgerEntry {
  return {
    id: r.id as string,
    customerId: r.customer_id as string,
    shiftId: (r.shift_id as string | null) ?? null,
    entryType: r.entry_type as CustomerLedgerEntryType,
    amount: Number(r.amount ?? 0),
    notes: (r.notes as string | null) ?? null,
    photoUrl: (r.photo_url as string | null) ?? null,
    createdAt: r.created_at as string,
  }
}

// Strip a filename to safe Supabase Storage characters. Spaces, Unicode, '#'
// and friends will silently break the public URL. Replace runs of unsafe
// chars with a single hyphen and avoid leading/trailing hyphens or dots.
function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '')
  return cleaned.length > 0 ? cleaned : 'photo'
}

async function uploadCustomerPhoto(customerId: string, file: File): Promise<string> {
  const path = `${customerId}/${Date.now()}-${sanitizeFilename(file.name)}`
  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadErr) {
    throw new Error(`Photo upload failed: ${uploadErr.message}`)
  }
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) {
    throw new Error('Photo upload succeeded but public URL is missing')
  }
  return data.publicUrl
}

interface AddEntryInput {
  customerId: string
  amount: number
  notes?: string | null
  photoFile?: File | null
}

interface OutstandingCustomer extends Customer {
  balance: number
  lastEntryAt: string | null
}

interface CustomersState {
  ledgerEntries: CustomerLedgerEntry[]
  loading: boolean
  loadLedgerEntries: () => Promise<void>
  addCreditTaken: (input: AddEntryInput) => Promise<void>
  addSettlement: (input: AddEntryInput) => Promise<void>
  deleteLedgerEntry: (id: string) => Promise<void>
  getCustomerBalance: (customerId: string) => number
  getOutstandingCustomers: () => OutstandingCustomer[]
  getTotalOutstanding: () => number
  getTotalNegative: () => number
}

async function insertLedgerEntry(input: AddEntryInput, entryType: CustomerLedgerEntryType): Promise<CustomerLedgerEntry> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Amount must be a positive number')
  }
  let photoUrl: string | null = null
  if (input.photoFile) {
    photoUrl = await uploadCustomerPhoto(input.customerId, input.photoFile)
  }
  const { data, error } = await supabase
    .from('customer_ledger')
    .insert({
      customer_id: input.customerId,
      shift_id: null,
      entry_type: entryType,
      amount: input.amount,
      notes: input.notes ?? null,
      photo_url: photoUrl,
    })
    .select()
    .single()
  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new Error('Ledger insert returned no row')
  }
  return rowToLedgerEntry(data as Record<string, unknown>)
}

export const useCustomersStore = create<CustomersState>((set, get) => ({
  ledgerEntries: [],
  loading: false,

  loadLedgerEntries: async () => {
    set({ loading: true })
    try {
      // Customer ledger has no bunk_id column — filter by customers belonging
      // to this bunk (already loaded in appStore) so a stale row from another
      // bunk can't leak in.
      const customerIds = useAppStore.getState().customers.map((c) => c.id)
      if (customerIds.length === 0) {
        // Customers not loaded yet — fetch all and let the page filter.
        const { data, error } = await supabase
          .from('customer_ledger')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw new Error(error.message)
        if (data) {
          set({ ledgerEntries: (data as Record<string, unknown>[]).map(rowToLedgerEntry) })
        }
        return
      }
      const { data, error } = await supabase
        .from('customer_ledger')
        .select('*')
        .in('customer_id', customerIds)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      if (data) {
        set({ ledgerEntries: (data as Record<string, unknown>[]).map(rowToLedgerEntry) })
      }
    } finally {
      set({ loading: false })
    }
  },

  addCreditTaken: async (input) => {
    const created = await insertLedgerEntry(input, 'credit_taken')
    set((s) => ({ ledgerEntries: [created, ...s.ledgerEntries] }))
  },

  addSettlement: async (input) => {
    const created = await insertLedgerEntry(input, 'settlement')
    set((s) => ({ ledgerEntries: [created, ...s.ledgerEntries] }))
  },

  deleteLedgerEntry: async (id) => {
    const previous = get().ledgerEntries
    set((s) => ({ ledgerEntries: s.ledgerEntries.filter((e) => e.id !== id) }))
    const { error } = await supabase.from('customer_ledger').delete().eq('id', id)
    if (error) {
      set({ ledgerEntries: previous })
      throw new Error(error.message)
    }
  },

  getCustomerBalance: (customerId) => {
    return get().ledgerEntries.reduce((acc, e) => {
      if (e.customerId !== customerId) return acc
      return e.entryType === 'credit_taken' ? acc + e.amount : acc - e.amount
    }, 0)
  },

  getOutstandingCustomers: () => {
    // One fold over all entries to produce {balance, lastEntryAt} per customer,
    // then join with the customer list. Cheaper than per-customer scans when
    // the ledger grows.
    const entries = get().ledgerEntries
    const acc = new Map<string, { balance: number; lastEntryAt: string | null }>()
    for (const e of entries) {
      const cur = acc.get(e.customerId) ?? { balance: 0, lastEntryAt: null }
      const delta = e.entryType === 'credit_taken' ? e.amount : -e.amount
      const lastEntryAt =
        cur.lastEntryAt === null || e.createdAt > cur.lastEntryAt ? e.createdAt : cur.lastEntryAt
      acc.set(e.customerId, { balance: cur.balance + delta, lastEntryAt })
    }
    const customers = useAppStore.getState().customers
    return customers.map((c) => {
      const stats = acc.get(c.id) ?? { balance: 0, lastEntryAt: null }
      return { ...c, balance: stats.balance, lastEntryAt: stats.lastEntryAt }
    })
  },

  getTotalOutstanding: () => {
    return get()
      .getOutstandingCustomers()
      .filter((c) => c.balance > 0)
      .reduce((sum, c) => sum + c.balance, 0)
  },

  getTotalNegative: () => {
    return get()
      .getOutstandingCustomers()
      .filter((c) => c.balance < 0)
      .reduce((sum, c) => sum + Math.abs(c.balance), 0)
  },
}))
