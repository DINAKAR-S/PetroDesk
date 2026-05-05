export type Role = 'owner' | 'manager' | 'salesman'
export type FuelType = 'MS' | 'HSD'
export type ShiftStatus = 'open' | 'closed' | 'flagged'
export type NozzleSlot = 1 | 2 | 3 | 4

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

export interface DispenserUnit {
  id: string
  number: string
  displayName: string
}

export interface Nozzle {
  id: string
  name: string
  dispenserUnitId: string
  tankId: string
  slot: NozzleSlot
  fuelType: FuelType
}

export interface FuelPrice {
  id: string
  fuelType: FuelType
  pricePerLitre: number
}

export interface Shift {
  id: string
  dispenserUnitId: string
  salesmanId: string
  salesmanName: string
  openedAt: string
  closedAt: string | null
  status: ShiftStatus
  totalLitresSold: number
  totalRevenue: number
  totalCashCollected: number
  expectedCash: number
  cashVariance: number
  msLitres: number
  hsdLitres: number
  msRevenue: number
  hsdRevenue: number
  notes: string | null
}

export interface NozzleReading {
  id: string
  shiftId: string
  nozzleId: string
  nozzleName: string
  fuelType: FuelType
  slot: NozzleSlot
  openingCumVolume: number
  openingCumSale: number
  closingCumVolume: number | null
  closingCumSale: number | null
  litresSold: number
  rupeesSold: number
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
