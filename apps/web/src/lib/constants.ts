import type { FuelType } from '@/types'

export const BUNK_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

export const FUEL_LABELS: Record<FuelType, string> = {
  MS: 'Petrol (MS)',
  HSD: 'Diesel (HSD)',
}

// Tamil Nadu state-VAT rates for petroleum products (not GST).
// VAT extracted from inclusive price: vatAmount = grossRevenue * rate / (1 + rate)
export const VAT_RATES: Record<FuelType, number> = {
  MS: 0.3628,
  HSD: 0.245,
}

export const FUEL_TYPES: FuelType[] = ['MS', 'HSD']

export const NOZZLE_SLOTS = [1, 2, 3, 4] as const

export const EXPENSE_CATEGORIES = [
  'general',
  'salary',
  'utilities',
  'maintenance',
  'supplies',
  'transport',
  'other',
]
