import { useShiftsStore } from '@/store/shiftsStore'
import { useAppStore } from '@/store/appStore'
import { generateShiftReport } from '@/lib/pdf'

export type ExportPreset =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom'

export const EXPORT_PRESETS: { label: string; value: ExportPreset }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: 'last7' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'Custom', value: 'custom' },
]

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function rangeForPreset(
  preset: ExportPreset,
  customFrom: string,
  customTo: string,
): { start: Date; end: Date } | null {
  const now = new Date()
  if (preset === 'today') return { start: startOfDay(now), end: endOfDay(now) }
  if (preset === 'yesterday') {
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    return { start: startOfDay(y), end: endOfDay(y) }
  }
  if (preset === 'last7') {
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    return { start: startOfDay(start), end: endOfDay(now) }
  }
  if (preset === 'thisMonth') {
    return { start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), end: endOfDay(now) }
  }
  if (preset === 'lastMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return { start: startOfDay(start), end: endOfDay(end) }
  }
  if (preset === 'custom') {
    if (!customFrom || !customTo) return null
    const start = startOfDay(parseLocalDate(customFrom))
    const end = endOfDay(parseLocalDate(customTo))
    if (end < start) return null
    return { start, end }
  }
  return null
}

export function formatRangeLabel(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  return sameDay ? fmt(start) : `${fmt(start)} - ${fmt(end)}`
}

/**
 * Trigger a PDF export for the selected preset (optionally with custom dates).
 *
 * Reads from the live `useAppStore` and `useShiftsStore` snapshots, so the
 * caller doesn't need to pass any props. Lazy-loads any per-shift entries
 * not yet in the store. Throws on bad input or DB failure — callers should
 * try/catch and surface the message.
 */
export async function exportShiftReport(
  preset: ExportPreset,
  customFrom: string,
  customTo: string,
): Promise<void> {
  const range = rangeForPreset(preset, customFrom, customTo)
  if (!range) throw new Error('Pick a valid date range')

  const startMs = range.start.getTime()
  const endMs = range.end.getTime()

  const store = useShiftsStore.getState()
  const inRange = store.shifts.filter((s) => {
    if (s.status === 'open') return false
    const t = new Date(s.openedAt).getTime()
    return t >= startMs && t <= endMs
  })

  // Lazy-load per-shift child rows the user hasn't yet expanded in the UI.
  await Promise.all(
    inRange.map(async (s) => {
      const tasks: Promise<void>[] = []
      const hasReadings = store.nozzleReadings.some((r) => r.shiftId === s.id)
      if (!hasReadings) tasks.push(store.loadNozzleReadings(s.id))
      tasks.push(store.loadShiftEntries(s.id))
      await Promise.all(tasks)
    }),
  )

  const fresh = useShiftsStore.getState()
  const app = useAppStore.getState()

  const readingsByShift = new Map<string, typeof fresh.nozzleReadings>()
  const otherSalesByShift = new Map<string, typeof fresh.otherSales>()
  const electronicByShift = new Map<string, typeof fresh.electronicEntries>()
  const expensesByShift = new Map<string, typeof fresh.expenseEntries>()
  const creditByShift = new Map<string, typeof fresh.creditEntries>()

  for (const s of inRange) {
    readingsByShift.set(s.id, fresh.nozzleReadings.filter((r) => r.shiftId === s.id))
    otherSalesByShift.set(s.id, fresh.otherSales.filter((r) => r.shiftId === s.id))
    electronicByShift.set(s.id, fresh.electronicEntries.filter((r) => r.shiftId === s.id))
    expensesByShift.set(s.id, fresh.expenseEntries.filter((r) => r.shiftId === s.id))
    creditByShift.set(s.id, fresh.creditEntries.filter((r) => r.shiftId === s.id))
  }

  const nozzlesById = new Map(app.nozzles.map((n) => [n.id, n]))
  const msRate = app.fuelPrices.find((p) => p.fuelType === 'MS')?.pricePerLitre ?? 0
  const hsdRate = app.fuelPrices.find((p) => p.fuelType === 'HSD')?.pricePerLitre ?? 0

  generateShiftReport({
    bunkName: app.bunk.name || 'Petro Desk',
    startDate: range.start,
    endDate: range.end,
    shifts: inRange,
    readingsByShift,
    otherSalesByShift,
    electronicByShift,
    expensesByShift,
    creditByShift,
    dispenserUnits: app.dispenserUnits,
    nozzlesById,
    msRate,
    hsdRate,
    rangeLabel: formatRangeLabel(range.start, range.end),
  })
}
