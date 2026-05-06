import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  exportShiftReport,
  EXPORT_PRESETS,
  type ExportPreset,
} from '@/lib/exportShiftReport'

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Compact PDF-export panel — preset chips + a "Export PDF" button.
 * Used on Owner + Manager dashboards (the user wanted the export there
 * instead of buried in the Reports → Daily Sales tab).
 */
export default function ExportShiftReportPanel() {
  const [preset, setPreset] = useState<ExportPreset>('today')
  const [customFrom, setCustomFrom] = useState(todayISO())
  const [customTo, setCustomTo] = useState(todayISO())
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport(): Promise<void> {
    setError(null)
    setExporting(true)
    try {
      await exportShiftReport(preset, customFrom, customTo)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h3 className="text-on-surface font-semibold text-sm">Export shift report (PDF)</h3>
          <p className="text-on-surface-variant text-xs mt-0.5">
            Daily / weekly / monthly summary with per-DU per-nozzle breakdown.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="self-start shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary-container text-on-secondary text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
          {exporting ? 'Exporting…' : 'Export PDF'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {EXPORT_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPreset(p.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              preset === p.value
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface-container border-outline-variant text-on-surface-variant hover:bg-surface-container-high',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-on-surface-variant">
            From
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm text-on-surface"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-on-surface-variant">
            To
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm text-on-surface"
            />
          </label>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-rose-600 font-medium">{error}</p>
      )}
    </section>
  )
}
