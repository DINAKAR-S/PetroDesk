import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type {
  Shift,
  NozzleReading,
  ShiftOtherSale,
  ShiftElectronicEntry,
  ShiftExpenseEntry,
  ShiftCreditEntry,
  DispenserUnit,
  Nozzle,
} from '@/types'

// Color palette — used as RGB triples for jsPDF/autoTable text colors.
const COLOR_BLACK: [number, number, number] = [20, 20, 20]
const COLOR_RED: [number, number, number] = [230, 20, 20]
const COLOR_MUTED: [number, number, number] = [110, 110, 110]
const COLOR_BORDER: [number, number, number] = [220, 220, 220]
const COLOR_HEADER_BG: [number, number, number] = [245, 245, 247]
const COLOR_NAVY: [number, number, number] = [0, 36, 82]

const PAGE_MARGIN = 36 // pt — ~12.7mm
const COLUMN_GAP = 12

interface ShiftReportInput {
  bunkName: string
  startDate: Date
  endDate: Date
  shifts: Shift[]
  readingsByShift: Map<string, NozzleReading[]>
  otherSalesByShift: Map<string, ShiftOtherSale[]>
  electronicByShift: Map<string, ShiftElectronicEntry[]>
  expensesByShift: Map<string, ShiftExpenseEntry[]>
  creditByShift: Map<string, ShiftCreditEntry[]>
  dispenserUnits: DispenserUnit[]
  nozzlesById: Map<string, Nozzle>
  msRate: number
  hsdRate: number
  rangeLabel: string
}

interface ShiftBlock {
  shift: Shift
  readings: NozzleReading[]
  otherSales: ShiftOtherSale[]
  electronic: ShiftElectronicEntry[]
  expenses: ShiftExpenseEntry[]
  credits: ShiftCreditEntry[]
}

function formatINR(n: number): string {
  // Uses Indian grouping (e.g. 1,23,456). Numbers preserve sign.
  return `Rs ${Math.round(n).toLocaleString('en-IN')}`
}

function formatLitres(n: number): string {
  // Two decimals only when meaningful, else integer + L.
  const rounded = Math.round(n * 100) / 100
  return `${rounded.toLocaleString('en-IN')} L`
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function localDateKey(iso: string): string {
  // YYYY-MM-DD in local timezone — keying by this groups shifts that opened
  // on the same calendar day regardless of UTC offset.
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDayHeader(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' })
}

function groupShiftsByDate(shifts: Shift[]): Map<string, Shift[]> {
  const map = new Map<string, Shift[]>()
  for (const s of shifts) {
    const key = localDateKey(s.openedAt)
    const list = map.get(key) ?? []
    list.push(s)
    map.set(key, list)
  }
  // Sort within each date by openedAt ascending so first shift renders left.
  for (const [k, v] of map) {
    v.sort((a, b) => a.openedAt.localeCompare(b.openedAt))
    map.set(k, v)
  }
  return map
}

function ensureSpace(doc: jsPDF, neededY: number, currentY: number): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (currentY + neededY > pageHeight - PAGE_MARGIN) {
    doc.addPage()
    return PAGE_MARGIN
  }
  return currentY
}

function buildShiftBlock(shiftId: string, input: ShiftReportInput): ShiftBlock | null {
  const shift = input.shifts.find((s) => s.id === shiftId)
  if (!shift) return null
  return {
    shift,
    readings: (input.readingsByShift.get(shiftId) ?? []).slice().sort((a, b) => a.slot - b.slot),
    otherSales: input.otherSalesByShift.get(shiftId) ?? [],
    electronic: input.electronicByShift.get(shiftId) ?? [],
    expenses: input.expensesByShift.get(shiftId) ?? [],
    credits: input.creditByShift.get(shiftId) ?? [],
  }
}

function duLabel(block: ShiftBlock, dispenserUnits: DispenserUnit[]): string {
  const du = dispenserUnits.find((d) => d.id === block.shift.dispenserUnitId)
  if (!du) return 'Dispenser'
  return du.displayName || `DU ${du.number}`
}

function renderShiftCard(
  doc: jsPDF,
  block: ShiftBlock,
  x: number,
  y: number,
  width: number,
  input: ShiftReportInput,
): number {
  const startY = y
  let cursorY = y

  // Card border + title bar
  const titleHeight = 22
  doc.setDrawColor(...COLOR_BORDER)
  doc.setFillColor(...COLOR_HEADER_BG)
  doc.roundedRect(x, cursorY, width, titleHeight, 4, 4, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...COLOR_NAVY)
  const shiftIndex = `Shift • ${block.shift.salesmanName}`
  doc.text(shiftIndex, x + 8, cursorY + 9)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLOR_MUTED)
  const timeRange = `${formatTime(block.shift.openedAt)} → ${formatTime(block.shift.closedAt)}  •  ${duLabel(block, input.dispenserUnits)}`
  doc.text(timeRange, x + 8, cursorY + 18)

  cursorY += titleHeight + 4

  // Nozzle readings table
  const readingRows: Array<Array<{ content: string; styles?: Record<string, unknown> }>> = []
  for (const r of block.readings) {
    const fuelLabel = r.fuelType === 'MS' ? 'Petrol' : 'Diesel'
    const nozzleLabel = `${r.nozzleName} (${fuelLabel})`
    readingRows.push([
      { content: nozzleLabel },
      { content: formatLitres(r.litresSold), styles: { halign: 'right' } },
      { content: formatINR(r.rupeesSold), styles: { halign: 'right', textColor: COLOR_BLACK } },
    ])
  }
  if (readingRows.length === 0) {
    readingRows.push([{ content: 'No nozzle readings recorded', styles: { textColor: COLOR_MUTED, fontStyle: 'italic' } }, { content: '' }, { content: '' }])
  }

  autoTable(doc, {
    startY: cursorY,
    margin: { left: x, right: doc.internal.pageSize.getWidth() - (x + width) },
    tableWidth: width,
    body: readingRows,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: COLOR_BLACK, lineColor: COLOR_BORDER, lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: width * 0.5 },
      1: { cellWidth: width * 0.22 },
      2: { cellWidth: width * 0.28 },
    },
  })
  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4

  // Section: Testing / Other / Electronic / Credit / Expense — color-coded
  const summaryRows: Array<Array<{ content: string; styles?: Record<string, unknown> }>> = []

  const testingMs = block.shift.testingMsVolume
  const testingHsd = block.shift.testingHsdVolume
  if (testingMs > 0 || testingHsd > 0) {
    const parts: string[] = []
    if (testingMs > 0) parts.push(`Petrol -${formatLitres(testingMs)}`)
    if (testingHsd > 0) parts.push(`Diesel -${formatLitres(testingHsd)}`)
    summaryRows.push([
      { content: 'Testing', styles: { fontStyle: 'bold' } },
      { content: parts.join(', '), styles: { halign: 'right', textColor: COLOR_MUTED } },
    ])
  }

  if (block.shift.totalOtherSales > 0) {
    summaryRows.push([
      { content: `Other Sales (${block.otherSales.length})`, styles: { fontStyle: 'bold' } },
      { content: formatINR(block.shift.totalOtherSales), styles: { halign: 'right', textColor: COLOR_BLACK } },
    ])
  }

  if (block.shift.totalElectronic > 0) {
    summaryRows.push([
      { content: `UPI / Card (${block.electronic.length})`, styles: { fontStyle: 'bold' } },
      { content: formatINR(block.shift.totalElectronic), styles: { halign: 'right', textColor: COLOR_BLACK } },
    ])
  }

  if (block.shift.totalCredit > 0) {
    summaryRows.push([
      { content: `Credit (${block.credits.length})`, styles: { fontStyle: 'bold', textColor: COLOR_RED } },
      { content: `- ${formatINR(block.shift.totalCredit)}`, styles: { halign: 'right', textColor: COLOR_RED } },
    ])
  }

  if (block.shift.totalExpenses > 0) {
    summaryRows.push([
      { content: `Expenses (${block.expenses.length})`, styles: { fontStyle: 'bold', textColor: COLOR_RED } },
      { content: `- ${formatINR(block.shift.totalExpenses)}`, styles: { halign: 'right', textColor: COLOR_RED } },
    ])
  }

  if (summaryRows.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      margin: { left: x, right: doc.internal.pageSize.getWidth() - (x + width) },
      tableWidth: width,
      body: summaryRows,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: COLOR_BLACK, lineColor: COLOR_BORDER, lineWidth: 0.2 },
      columnStyles: {
        0: { cellWidth: width * 0.55 },
        1: { cellWidth: width * 0.45 },
      },
    })
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4
  }

  // Footer: cash-in-hand + variance
  const variance = block.shift.cashVariance
  const varianceColor: [number, number, number] = variance < 0 ? COLOR_RED : COLOR_BLACK
  const varianceLabel = variance === 0 ? formatINR(0) : variance > 0 ? `+${formatINR(variance)}` : `-${formatINR(Math.abs(variance))}`

  const footerRows = [
    [
      { content: 'Cash in Hand', styles: { fontStyle: 'bold' } },
      { content: formatINR(block.shift.cashInHand), styles: { halign: 'right', fontStyle: 'bold' } },
    ],
    [
      { content: 'Variance', styles: { fontStyle: 'bold' } },
      { content: varianceLabel, styles: { halign: 'right', fontStyle: 'bold', textColor: varianceColor } },
    ],
  ]

  autoTable(doc, {
    startY: cursorY,
    margin: { left: x, right: doc.internal.pageSize.getWidth() - (x + width) },
    tableWidth: width,
    body: footerRows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3, fillColor: COLOR_HEADER_BG, lineColor: COLOR_BORDER, lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: width * 0.55 },
      1: { cellWidth: width * 0.45 },
    },
  })
  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  // Outer card border (drawn last to enclose all content)
  doc.setDrawColor(...COLOR_BORDER)
  doc.roundedRect(x, startY, width, cursorY - startY, 4, 4, 'S')

  return cursorY
}

function renderDayTotal(
  doc: jsPDF,
  shifts: Shift[],
  startX: number,
  endX: number,
  y: number,
): number {
  const totals = shifts.reduce(
    (acc, s) => {
      acc.litres += s.totalLitresSold
      acc.revenue += s.totalRevenue
      acc.cashInHand += s.cashInHand
      return acc
    },
    { litres: 0, revenue: 0, cashInHand: 0 },
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR_NAVY)
  const summary = `Day total: ${formatINR(totals.revenue)}  •  Litres ${formatLitres(totals.litres)}  •  Cash in hand ${formatINR(totals.cashInHand)}`
  doc.text(summary, startX, y, { maxWidth: endX - startX })
  return y + 12
}

export function generateShiftReport(input: ShiftReportInput): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - PAGE_MARGIN * 2
  let cursorY = PAGE_MARGIN

  // ── Header ──────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...COLOR_NAVY)
  doc.text(input.bunkName, PAGE_MARGIN, cursorY + 4)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...COLOR_MUTED)
  doc.text(input.rangeLabel, pageWidth - PAGE_MARGIN, cursorY + 4, { align: 'right' })
  cursorY += 16

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR_BLACK)
  const rateLine = `Petrol (MS): Rs ${input.msRate.toFixed(2)}/L  •  Diesel (HSD): Rs ${input.hsdRate.toFixed(2)}/L`
  doc.text(rateLine, PAGE_MARGIN, cursorY + 4)
  cursorY += 14

  doc.setDrawColor(...COLOR_BORDER)
  doc.line(PAGE_MARGIN, cursorY, pageWidth - PAGE_MARGIN, cursorY)
  cursorY += 12

  // ── Group + render by day ───────────────────────────────
  const grouped = groupShiftsByDate(input.shifts)
  const sortedKeys = Array.from(grouped.keys()).sort() // ascending YYYY-MM-DD

  if (sortedKeys.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(11)
    doc.setTextColor(...COLOR_MUTED)
    doc.text('No closed shifts in the selected range.', PAGE_MARGIN, cursorY + 8)
    doc.save(`petrodesk-report-${input.rangeLabel.replace(/\s+/g, '-')}.pdf`)
    return
  }

  for (const dateKey of sortedKeys) {
    const dayShifts = grouped.get(dateKey) ?? []
    if (dayShifts.length === 0) continue

    cursorY = ensureSpace(doc, 60, cursorY)

    // Day header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...COLOR_BLACK)
    doc.text(formatDayHeader(dateKey), PAGE_MARGIN, cursorY + 4)
    cursorY += 14

    // Render shift cards in pairs (2 columns). For odd counts the last card
    // takes only the left column (full width would visually break the grid).
    let i = 0
    while (i < dayShifts.length) {
      const left = dayShifts[i]
      const right = i + 1 < dayShifts.length ? dayShifts[i + 1] : null
      const leftBlock = buildShiftBlock(left.id, input)
      const rightBlock = right ? buildShiftBlock(right.id, input) : null

      cursorY = ensureSpace(doc, 180, cursorY)

      const colWidth = right ? (contentWidth - COLUMN_GAP) / 2 : contentWidth
      const leftX = PAGE_MARGIN
      const rightX = PAGE_MARGIN + colWidth + COLUMN_GAP

      const startCardY = cursorY
      let leftEnd = startCardY
      let rightEnd = startCardY

      if (leftBlock) {
        leftEnd = renderShiftCard(doc, leftBlock, leftX, startCardY, colWidth, input)
      }
      if (rightBlock) {
        rightEnd = renderShiftCard(doc, rightBlock, rightX, startCardY, colWidth, input)
      }

      cursorY = Math.max(leftEnd, rightEnd) + 8
      i += 2
    }

    // Day total line
    cursorY = ensureSpace(doc, 18, cursorY)
    cursorY = renderDayTotal(doc, dayShifts, PAGE_MARGIN, pageWidth - PAGE_MARGIN, cursorY)
    cursorY += 10
  }

  // ── Footer page numbers ─────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p += 1) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COLOR_MUTED)
    doc.text(
      `Page ${p} of ${pageCount}`,
      pageWidth - PAGE_MARGIN,
      doc.internal.pageSize.getHeight() - 16,
      { align: 'right' },
    )
    doc.text(
      `Generated ${new Date().toLocaleString('en-IN')}`,
      PAGE_MARGIN,
      doc.internal.pageSize.getHeight() - 16,
    )
  }

  const safeRange = input.rangeLabel.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  doc.save(`petrodesk-report-${safeRange || 'export'}.pdf`)
}
