'use client'

// Allocations: apply a course fee structure to students with a payment
// schedule — all at once, yearly, or semester-wise. Installments are
// auto-generated from the structure's per-year amounts. Creating an
// allocation materializes the student fee records.

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { DELETE_FEE_ALLOCATION, SYNC_FEE_ALLOCATION } from '@/queries/pages/fees/fees'
import { formatCurrency } from '@/functions/fees/feeFormatters'
import type { FeesPageState } from './useFeesPage'
import { FEE_REFETCH } from './useFeesPage'
import type { GqlFeeAllocation } from './types'
import AllocationModal from './AllocationModal'
import { BulkDeleteBar, HeaderCheckbox, RowCheckbox, runBulkDelete, useBulkSelect } from '@/components/ui/bulkSelect'
import { useLazyList } from '@/components/ui/useLazyList'

export const FREQUENCY_LABELS: Record<string, string> = {
  one_time: 'One-time',
  yearly: 'Yearly',
  semester: 'Semester-wise',
}

export default function AllocationsTab({ s }: { s: FeesPageState }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const sel = useBulkSelect()

  const [deleteMut] = useMutation(DELETE_FEE_ALLOCATION, { refetchQueries: FEE_REFETCH })
  const [syncMut] = useMutation(SYNC_FEE_ALLOCATION, { refetchQueries: FEE_REFETCH })

  const search = s.search.toLowerCase()
  const allocations = search
    ? s.allocations.filter(a => [
        a.name, a.targetName, a.frequency,
        a.feeStructure?.name, a.feeStructure?.course?.name,
      ].some(v => String(v ?? '').toLowerCase().includes(search)))
    : s.allocations

  async function handleDelete(id: string) {
    if (!confirm('Remove this allocation? Student fees without payments will be deleted.')) return
    try {
      await deleteMut({ variables: { id } })
      toast.success('Allocation removed')
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to remove allocation')
    }
  }

  const allIds = allocations.map(a => a.id)
  const { visible, sentinelRef, hasMore } = useLazyList(allocations, { enabled: s.lazyLoad })

  async function handleBulkDelete() {
    if (!confirm(`Remove ${sel.selected.size} selected allocation${sel.selected.size > 1 ? 's' : ''}? Student fees without payments will be deleted; allocations with payments will be skipped.`)) return
    setBulkDeleting(true)
    await runBulkDelete([...sel.selected], id => deleteMut({ variables: { id } }), 'allocation')
    sel.clear()
    setBulkDeleting(false)
  }

  async function handleSync(id: string) {
    try {
      const res = await syncMut({ variables: { id } })
      const n = res.data?.syncFeeAllocation ?? 0
      toast.success(n > 0 ? `${n} new student fee record${n > 1 ? 's' : ''} created` : 'Already up to date')
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to sync')
    }
  }

  return (
    <div className="space-y-4">
      <BulkDeleteBar sel={sel} noun="allocation" onDelete={handleBulkDelete} deleting={bulkDeleting} />
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="table-th w-10">
                <HeaderCheckbox checked={sel.isAllSelected(allIds)} onChange={() => sel.toggleAll(allIds)} />
              </th>
              <th className="table-th w-8"></th>
              <th className="table-th">Allocation</th>
              <th className="table-th">Structure</th>
              <th className="table-th">Plan</th>
              <th className="table-th">Applied To</th>
              <th className="table-th text-right">Total</th>
              <th className="table-th text-center">Students</th>
              <th className="table-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map(a => (
              <AllocationRow key={a.id} a={a}
                expanded={expanded === a.id}
                selected={sel.selected.has(a.id)}
                onSelect={() => sel.toggle(a.id)}
                onToggle={() => setExpanded(expanded === a.id ? null : a.id)}
                onSync={() => handleSync(a.id)}
                onDelete={() => handleDelete(a.id)} />
            ))}
            {allocations.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                No allocations yet. Create one to apply a course structure to students with a payment plan.
              </td></tr>
            )}
            {hasMore && <tr ref={sentinelRef} aria-hidden />}
          </tbody>
        </table>
      </div>

      {s.createOpen && <AllocationModal s={s} onClose={() => s.setCreateOpen(false)} />}
    </div>
  )
}

function AllocationRow({ a, expanded, selected, onSelect, onToggle, onSync, onDelete }: {
  a: GqlFeeAllocation
  expanded: boolean
  selected: boolean
  onSelect: () => void
  onToggle: () => void
  onSync: () => void
  onDelete: () => void
}) {
  return (
    <>
      <tr className={`hover:bg-muted/30 cursor-pointer ${selected ? 'bg-blue-50/50' : ''}`} onClick={onToggle}>
        <td className="table-td" onClick={e => e.stopPropagation()}>
          <RowCheckbox checked={selected} onChange={onSelect} />
        </td>
        <td className="table-td text-muted-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
        <td className="table-td font-medium">{a.name}</td>
        <td className="table-td">
          <p>{a.feeStructure?.course?.name}</p>
          <p className="text-xs text-muted-foreground">{a.feeStructure?.name}</p>
        </td>
        <td className="table-td">
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
            {FREQUENCY_LABELS[a.frequency] ?? a.frequency} · {a.installments.length} installment{a.installments.length > 1 ? 's' : ''}
          </span>
        </td>
        <td className="table-td">
          <span className="capitalize text-xs text-muted-foreground">{a.targetType}: </span>{a.targetName}
        </td>
        <td className="table-td text-right font-semibold">{formatCurrency(a.totalAmount)}</td>
        <td className="table-td text-center">{a.studentCount}</td>
        <td className="table-td text-right space-x-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
          <button onClick={onSync} title="Pick up newly admitted students"
            className="text-blue-600 hover:underline">Sync</button>
          <button onClick={onDelete} className="text-red-600 hover:underline">Delete</button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={9} className="px-6 pb-4 pt-1 bg-muted/20">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Installment Schedule</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {a.installments.map(in_ => (
                <div key={in_.id} className="flex justify-between bg-card border border-border rounded-lg px-3 py-2 text-sm">
                  <span>
                    {in_.label}
                    {in_.dueDate && <span className="block text-xs text-muted-foreground">due {in_.dueDate}</span>}
                  </span>
                  <span className="font-medium">{formatCurrency(in_.amount)}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
