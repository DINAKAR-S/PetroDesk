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
  // Seed values for the FIRST shift on this nozzle. After the first close,
  // subsequent shifts pick up from the previous shift's closing instead.
  initialCumVolume: number
  initialCumSale: number
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
  // Phase 2: section totals stored on the shift for fast reporting
  testingMsVolume: number
  testingMsSale: number
  testingHsdVolume: number
  testingHsdSale: number
  totalOtherSales: number
  totalElectronic: number
  totalCredit: number
  totalExpenses: number
  cashInHand: number
  handoverToNext: number
  depositToOwner: number
  notes: string | null
}

// ─── Phase 2 catalogs (configured in Settings) ──────────────

export interface OtherSalesCategory {
  id: string
  name: string
  active: boolean
}

export interface OtherSalesItem {
  id: string
  categoryId: string
  name: string
  // Unit price (kept the column name `price_per_litre` from Phase 2 for
  // back-compat — it really means per-unit price now).
  pricePerLitre: number
  active: boolean
}

export interface ElectronicMethod {
  id: string
  name: string
  active: boolean
}

export interface ExpenseCategory {
  id: string
  name: string
  active: boolean
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  notes: string | null
}

// ─── Phase 2 per-shift entries ──────────────────────────────

export interface ShiftOtherSale {
  id: string
  shiftId: string
  itemId: string | null
  itemName: string
  categoryId: string | null
  categoryName: string
  quantity: number
  unitPrice: number
  discount: number
  amount: number
}

export interface ShiftElectronicEntry {
  id: string
  shiftId: string
  methodId: string | null
  methodName: string
  amount: number
  bankConfirmed: boolean
  bankConfirmedAt: string | null
  bankConfirmedByUserId: string | null
}

export interface ShiftExpenseEntry {
  id: string
  shiftId: string
  categoryId: string | null
  categoryName: string
  amount: number
  description: string | null
}

export interface ShiftCreditEntry {
  id: string
  shiftId: string
  customerId: string | null
  customerName: string
  amount: number
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
