import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { useCustomersStore } from '@/store/customersStore'
import { cn } from '@/lib/utils'
import type { CustomerLedgerEntry } from '@/types'

interface RunningEntry extends CustomerLedgerEntry {
  balanceAfter: number
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface EntryModalProps {
  customerId: string
  mode: 'gave' | 'got'
  onClose: () => void
}

function EntryModal({ customerId, mode, onClose }: EntryModalProps) {
  const addCreditTaken = useCustomersStore((s) => s.addCreditTaken)
  const addSettlement = useCustomersStore((s) => s.addSettlement)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isGave = mode === 'gave'
  const title = isGave ? 'You Gave' : 'You Got'
  const accent = isGave ? 'text-rose-600' : 'text-emerald-600'
  const btnBg = isGave ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0] ?? null
    setPhotoFile(f)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(f ? URL.createObjectURL(f) : null)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid amount')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const action = isGave ? addCreditTaken : addSettlement
      await action({
        customerId,
        amount: amt,
        notes: notes.trim() || null,
        photoFile,
      })
      if (photoPreview) URL.revokeObjectURL(photoPreview)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save entry'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn('text-lg font-bold', accent)}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-on-surface-variant">Amount (₹) *</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              className="px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-lg font-semibold focus:outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-on-surface-variant">Photo (optional)</span>
            <input
              type="file"
              accept="image/*"
              onChange={onPickFile}
              className="text-sm text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-medium hover:file:bg-primary/20"
            />
          </label>
          {photoPreview && (
            <div className="rounded-lg overflow-hidden border border-outline-variant">
              <img
                src={photoPreview}
                alt="Receipt preview"
                className="w-full max-h-56 object-contain bg-surface-container"
              />
            </div>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-on-surface-variant">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary resize-none"
            />
          </label>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-outline-variant text-on-surface-variant font-medium hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-white font-semibold disabled:opacity-50',
                btnBg,
              )}
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CustomerDetailPage() {
  const role = useAuthStore((s) => s.currentUser?.role)
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const customers = useAppStore((s) => s.customers)
  const ledgerEntries = useCustomersStore((s) => s.ledgerEntries)
  const deleteLedgerEntry = useCustomersStore((s) => s.deleteLedgerEntry)
  const bunk = useAppStore((s) => s.bunk)
  const [modalMode, setModalMode] = useState<'gave' | 'got' | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Role check applied AFTER all hooks so the hook order stays stable.
  const denied = role !== 'owner' && role !== 'manager'

  const customer = useMemo(() => customers.find((c) => c.id === id) ?? null, [customers, id])

  // Walk entries chronologically once to compute running balance, then expose
  // descending for display. Also group by day for headers.
  const ascending = useMemo(() => {
    if (!customer) return [] as RunningEntry[]
    const entries = ledgerEntries
      .filter((e) => e.customerId === customer.id)
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    let bal = 0
    return entries.map((e) => {
      bal = e.entryType === 'credit_taken' ? bal + e.amount : bal - e.amount
      return { ...e, balanceAfter: bal }
    })
  }, [customer, ledgerEntries])

  const descending = useMemo(() => [...ascending].reverse(), [ascending])

  const groupedByDay = useMemo(() => {
    const groups: { day: string; rows: RunningEntry[] }[] = []
    for (const e of descending) {
      const k = dayKey(e.createdAt)
      const last = groups[groups.length - 1]
      if (last && last.day === k) {
        last.rows.push(e)
      } else {
        groups.push({ day: k, rows: [e] })
      }
    }
    return groups
  }, [descending])

  const balance = ascending.length > 0 ? ascending[ascending.length - 1].balanceAfter : 0
  const balanceLabel =
    balance > 0
      ? `₹${balance.toLocaleString('en-IN')} to receive`
      : balance < 0
      ? `₹${Math.abs(balance).toLocaleString('en-IN')} to pay`
      : 'Settled'
  const balanceTone =
    balance > 0 ? 'text-rose-600' : balance < 0 ? 'text-emerald-600' : 'text-on-surface-variant'

  if (denied) {
    return <Navigate to="/" replace />
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-on-surface-variant text-sm">Customer not found</p>
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold"
        >
          Back to Customers
        </button>
      </div>
    )
  }

  const handleDelete = async (entryId: string): Promise<void> => {
    if (!confirm('Delete this ledger entry?')) return
    setDeleteError(null)
    try {
      await deleteLedgerEntry(entryId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete entry'
      setDeleteError(msg)
    }
  }

  const handleExportPdf = (): void => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 36
    let y = margin

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(0, 36, 82)
    doc.text(bunk.name || 'Petro Desk', margin, y + 4)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(110, 110, 110)
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    doc.text(`Account Statement • ${today}`, pageWidth - margin, y + 4, { align: 'right' })
    y += 22

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(20, 20, 20)
    doc.text(customer.name, margin, y + 4)
    y += 16

    if (customer.phone) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(110, 110, 110)
      doc.text(`Phone: ${customer.phone}`, margin, y + 4)
      y += 14
    }

    const totalGave = ascending
      .filter((e) => e.entryType === 'credit_taken')
      .reduce((s, e) => s + e.amount, 0)
    const totalGot = ascending
      .filter((e) => e.entryType === 'settlement')
      .reduce((s, e) => s + e.amount, 0)
    const summaryLabel =
      balance > 0
        ? `Net to receive: Rs ${balance.toLocaleString('en-IN')}`
        : balance < 0
        ? `Net to pay: Rs ${Math.abs(balance).toLocaleString('en-IN')}`
        : 'Settled'

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(20, 20, 20)
    doc.text(summaryLabel, margin, y + 4)
    y += 16

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(110, 110, 110)
    doc.text(
      `Total You Gave: Rs ${totalGave.toLocaleString('en-IN')}    Total You Got: Rs ${totalGot.toLocaleString('en-IN')}`,
      margin,
      y + 4,
    )
    y += 18

    const body = ascending.map((e) => [
      formatDateShort(e.createdAt),
      e.entryType === 'credit_taken' ? `Rs ${e.amount.toLocaleString('en-IN')}` : '',
      e.entryType === 'settlement' ? `Rs ${e.amount.toLocaleString('en-IN')}` : '',
      `Rs ${Math.abs(e.balanceAfter).toLocaleString('en-IN')}${
        e.balanceAfter > 0 ? ' (Dr)' : e.balanceAfter < 0 ? ' (Cr)' : ''
      }`,
      e.notes ?? '',
    ])

    if (body.length === 0) {
      body.push(['—', '', '', '—', 'No entries yet'])
    }

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Date', 'You Gave', 'You Got', 'Balance', 'Notes']],
      body,
      theme: 'striped',
      headStyles: { fillColor: [0, 36, 82], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        1: { halign: 'right', textColor: [230, 20, 20] },
        2: { halign: 'right', textColor: [16, 122, 86] },
        3: { halign: 'right' },
      },
    })

    const safeName = customer.name.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const filenameDate = new Date().toISOString().slice(0, 10)
    doc.save(`khaata-${safeName || 'customer'}-${filenameDate}.pdf`)
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6 pb-32">
      {/* Header */}
      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="inline-flex items-center gap-1 text-on-surface-variant text-sm hover:text-on-surface mb-2"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>All customers</span>
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface break-words">{customer.name}</h2>
            {customer.phone && (
              <p className="text-sm text-on-surface-variant mt-1">{customer.phone}</p>
            )}
            {customer.notes && (
              <p className="text-sm text-on-surface-variant mt-1 italic">{customer.notes}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant">Balance</p>
            <p className={cn('text-xl sm:text-2xl font-bold', balanceTone)}>
              ₹{Math.abs(balance).toLocaleString('en-IN')}
            </p>
            <p className={cn('text-xs font-medium', balanceTone)}>{balanceLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            <span>PDF Report</span>
          </button>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container text-on-surface-variant text-sm font-semibold opacity-60 cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">notifications_active</span>
            <span>Reminders</span>
          </button>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container text-on-surface-variant text-sm font-semibold opacity-60 cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">sms</span>
            <span>SMS</span>
          </button>
        </div>
      </section>

      {deleteError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
          {deleteError}
        </div>
      )}

      {/* Ledger */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
            Account Ledger
          </h3>
          <p className="text-on-surface-variant text-xs">{ascending.length} entries</p>
        </div>

        {groupedByDay.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-8 text-center text-on-surface-variant text-sm">
            No entries yet — use the buttons below to record your first transaction.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groupedByDay.map((group) => (
              <div key={group.day}>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                  {group.day}
                </p>
                <ul className="flex flex-col gap-2">
                  {group.rows.map((e) => (
                    <li
                      key={e.id}
                      className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-3 sm:p-4"
                    >
                      <div className="grid grid-cols-12 gap-3 items-start">
                        {/* Left col: time + balance after */}
                        <div className="col-span-12 sm:col-span-5">
                          <p className="text-xs text-on-surface-variant">
                            {formatDateTime(e.createdAt)}
                          </p>
                          <p className="text-xs font-medium text-on-surface-variant mt-1">
                            Bal:{' '}
                            <span
                              className={cn(
                                e.balanceAfter > 0
                                  ? 'text-rose-600'
                                  : e.balanceAfter < 0
                                  ? 'text-emerald-600'
                                  : 'text-on-surface',
                              )}
                            >
                              ₹{Math.abs(e.balanceAfter).toLocaleString('en-IN')}
                            </span>
                          </p>
                          {e.notes && (
                            <p className="text-sm text-on-surface mt-1 break-words">{e.notes}</p>
                          )}
                          {e.shiftId && (
                            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mt-1">
                              From shift
                            </p>
                          )}
                        </div>

                        {/* Middle: You Gave */}
                        <div className="col-span-4 sm:col-span-3 text-right">
                          {e.entryType === 'credit_taken' ? (
                            <>
                              <p className="text-[10px] uppercase tracking-wider text-rose-600">
                                You Gave
                              </p>
                              <p className="text-base font-bold text-rose-600">
                                ₹{e.amount.toLocaleString('en-IN')}
                              </p>
                            </>
                          ) : (
                            <p className="text-on-surface-variant text-sm">—</p>
                          )}
                        </div>

                        {/* Right: You Got */}
                        <div className="col-span-4 sm:col-span-3 text-right">
                          {e.entryType === 'settlement' ? (
                            <>
                              <p className="text-[10px] uppercase tracking-wider text-emerald-600">
                                You Got
                              </p>
                              <p className="text-base font-bold text-emerald-600">
                                ₹{e.amount.toLocaleString('en-IN')}
                              </p>
                            </>
                          ) : (
                            <p className="text-on-surface-variant text-sm">—</p>
                          )}
                        </div>

                        {/* Delete */}
                        <div className="col-span-4 sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleDelete(e.id)}
                            aria-label="Delete entry"
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-rose-50 hover:text-rose-600"
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </div>
                      </div>

                      {e.photoUrl && (
                        <a
                          href={e.photoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-3 rounded-lg overflow-hidden border border-outline-variant w-fit"
                        >
                          <img
                            src={e.photoUrl}
                            alt="Receipt"
                            loading="lazy"
                            className="max-h-40 object-contain bg-surface-container"
                          />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bottom action bar — sits ABOVE the mobile bottom nav (`bottom-14`)
          on small screens, flush at `bottom-0` on desktop with the sidebar
          width offset (`md:left-64`). */}
      <div className="fixed inset-x-0 bottom-14 md:bottom-0 z-30 bg-surface-container-lowest border-t border-outline-variant p-3 sm:p-4 md:left-64">
        <div className="flex gap-2 w-full max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() => setModalMode('gave')}
            className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md"
          >
            YOU GAVE ₹
          </button>
          <button
            type="button"
            onClick={() => setModalMode('got')}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
          >
            YOU GOT ₹
          </button>
        </div>
      </div>

      {modalMode && (
        <EntryModal
          customerId={customer.id}
          mode={modalMode}
          onClose={() => setModalMode(null)}
        />
      )}
    </div>
  )
}
