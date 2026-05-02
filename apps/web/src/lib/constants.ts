export const BUNK_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

export const FUEL_LABELS: Record<string, string> = {
  MS: 'Petrol (MS)',
  HSD: 'Diesel (HSD)',
  XP: 'Premium (XP)',
}

// Approximate Tamil Nadu VAT rates (petroleum products are under state VAT, not GST)
export const VAT_RATES: Record<string, number> = {
  MS: 0.3628,   // ~36.28%
  HSD: 0.245,   // ~24.5%
  XP: 0.3628,
}

export const EXPENSE_CATEGORIES = [
  'general',
  'salary',
  'utilities',
  'maintenance',
  'supplies',
  'transport',
  'other',
]
