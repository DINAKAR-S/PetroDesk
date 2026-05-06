import { useMemo, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { useCustomersStore } from '@/store/customersStore'
import { cn } from '@/lib/utils'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'No activity yet'
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffSec = Math.max(0, Math.round((now - then) / 1000))
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `${diffH} hr ago`
  const diffD = Math.round(diffH / 24)
  if (diffD < 30) return `${diffD} day${diffD === 1 ? '' : 's'} ago`
  const diffM = Math.round(diffD / 30)
  if (diffM < 12) return `${diffM} month${diffM === 1 ? '' : 's'} ago`
  const diffY = Math.round(diffM / 12)
  return `${diffY} year${diffY === 1 ? '' : 's'} ago`
}

interface AddCustomerModalProps {
  onClose: () => void
}

function AddCustomerModal({ onClose }: AddCustomerModalProps) {
  const addCustomer = useAppStore((s) => s.addCustomer)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await addCustomer({
        name: name.trim(),
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      })
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add customer'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-on-surface">Add Customer</h3>
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
            <span className="text-xs font-medium text-on-surface-variant">Name *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-on-surface-variant">Phone (optional)</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
            />
          </label>
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
              className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CustomersPage() {
  const role = useAuthStore((s) => s.currentUser?.role)
  const customers = useAppStore((s) => s.customers)
  const ledgerEntries = useCustomersStore((s) => s.ledgerEntries)
  const getOutstandingCustomers = useCustomersStore((s) => s.getOutstandingCustomers)
  const getTotalOutstanding = useCustomersStore((s) => s.getTotalOutstanding)
  const getTotalNegative = useCustomersStore((s) => s.getTotalNegative)
  const [query, setQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // Salesman gate — applied AFTER hooks so the hook count is stable across
  // renders (rules-of-hooks). Render a sentinel Navigate at the bottom.
  const denied = role !== 'owner' && role !== 'manager'

  // Recompute on any change to either input. We re-derive outstanding via the
  // store helper so totals stay in sync with the row balance.
  // ledgerEntries + customers participate in the dependency set even though
  // the helper reads them via getState — re-running the memo on change is the
  // cheap, correct path.
  const outstanding = useMemo(() => {
    return getOutstandingCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, ledgerEntries, getOutstandingCustomers])

  const totalToReceive = useMemo(() => {
    return getTotalOutstanding()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, ledgerEntries, getTotalOutstanding])

  const totalToGive = useMemo(() => {
    return getTotalNegative()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, ledgerEntries, getTotalNegative])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? outstanding.filter((c) => c.name.toLowerCase().includes(q))
      : outstanding
    // Sort: outstanding (positive) first, then negative, then settled. Within
    // each group, most-recent activity first.
    return [...list].sort((a, b) => {
      const aGroup = a.balance > 0 ? 0 : a.balance < 0 ? 1 : 2
      const bGroup = b.balance > 0 ? 0 : b.balance < 0 ? 1 : 2
      if (aGroup !== bGroup) return aGroup - bGroup
      const aTime = a.lastEntryAt ?? ''
      const bTime = b.lastEntryAt ?? ''
      return bTime.localeCompare(aTime)
    })
  }, [outstanding, query])

  if (denied) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6 pb-24">
      {/* Header card with totals */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-xl border border-outline-variant shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            You will GIVE
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-emerald-600 break-words">
            ₹{totalToGive.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">advance / overpaid by customers</p>
        </div>
        <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-xl border border-outline-variant shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
            You will GET
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-rose-600 break-words">
            ₹{totalToReceive.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">outstanding khaata across customers</p>
        </div>
      </section>

      {/* Search */}
      <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 shadow-sm">
        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customers"
          className="flex-1 bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant"
        />
      </div>

      {/* List */}
      <section>
        {filtered.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-8 text-center text-on-surface-variant text-sm">
            {customers.length === 0
              ? 'No customers yet — tap "Add Customer" to get started'
              : 'No customers match your search'}
          </div>
        ) : (
          <ul className="flex flex-col gap-2 sm:gap-3">
            {filtered.map((c) => {
              const tone =
                c.balance > 0 ? 'text-rose-600' : c.balance < 0 ? 'text-emerald-600' : 'text-on-surface-variant'
              const balanceLabel =
                c.balance > 0
                  ? `₹${c.balance.toLocaleString('en-IN')}`
                  : c.balance < 0
                  ? `+₹${Math.abs(c.balance).toLocaleString('en-IN')}`
                  : 'Settled'
              const sub =
                c.balance > 0 ? 'will get' : c.balance < 0 ? 'will give' : ''
              return (
                <li key={c.id}>
                  <Link
                    to={`/customers/${c.id}`}
                    className="flex items-center gap-3 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-3 sm:p-4 hover:bg-surface-container/60 transition-colors"
                  >
                    <div className="size-10 sm:size-11 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                      {initialsOf(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-on-surface truncate">{c.name}</p>
                      <p className="text-xs text-on-surface-variant truncate">
                        {relativeTime(c.lastEntryAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn('font-bold whitespace-nowrap', tone)}>{balanceLabel}</p>
                      {sub && <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">{sub}</p>}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-20 md:bottom-8 right-5 sm:right-8 z-30 inline-flex items-center gap-2 px-4 sm:px-5 py-3 rounded-full bg-secondary-container text-white font-semibold shadow-lg hover:opacity-90 transition-opacity"
      >
        <span className="material-symbols-outlined text-[20px]">person_add</span>
        <span className="text-sm">Add Customer</span>
      </button>

      {showAddModal && <AddCustomerModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
