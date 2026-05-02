export type Role = 'owner' | 'manager' | 'salesman'
export type FuelType = 'MS' | 'HSD' | 'XP'
export type ShiftStatus = 'open' | 'closed' | 'flagged'

export interface User {
  id: string
  name: string
  role: Role
  phone: string
  avatarInitials: string
}

export interface BunkProfile {
  id?: string
  name: string
  address: string
  gstNumber: string
  ownerName: string
}

export interface Tank {
  id: string
  name: string
  fuelType: FuelType
  capacityL: number
  currentStockL: number
}

export interface Nozzle {
  id: string
  name: string
  tankId: string
  fuelType: FuelType
  currentMeterReading: number
}

export interface FuelPrice {
  id: string
  fuelType: FuelType
  pricePerLitre: number
}

export interface Shift {
  id: string
  salesmanId: string
  salesmanName: string
  openedAt: string
  closedAt: string | null
  status: ShiftStatus
  totalLitresSold: number
  totalCashCollected: number
  expectedCash: number
  cashVariance: number
  dipVariancePct: number
  msLitres: number
  hsdLitres: number
  xpLitres: number
  msRevenue: number
  hsdRevenue: number
  xpRevenue: number
  notes: string | null
}

export interface NozzleReading {
  id: string
  shiftId: string
  nozzleId: string
  nozzleName: string
  fuelType: FuelType
  openingReading: number
  closingReading: number | null
  litresSold: number
}

export interface TankerDelivery {
  id: string
  tankId: string
  tankName: string
  fuelType: FuelType
  quantityL: number
  ratePerLitre: number | null
  totalAmount: number | null
  supplierName: string | null
  invoiceNumber: string | null
  deliveryDate: string
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: string
  expenseDate: string
}
