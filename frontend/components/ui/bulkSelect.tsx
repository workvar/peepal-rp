'use client'

// Shared bulk-selection state and action bar for list/table pages. Rows are
// selected with checkboxes; the bar runs the page's delete mutation one row at
// a time and reports how many succeeded/failed (rows guarded by the backend,
// e.g. structures with allocations, simply fail with their reason).

import { useState } from 'react'
import toast from 'react-hot-toast'

export function useBulkSelect() {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Toggle a whole list: if every id is already selected, unselect them all.
  function toggleAll(ids: string[]) {
    setSelected(prev => {
      const next = new Set(prev)
      const all = ids.length > 0 && ids.every(id => next.has(id))
      ids.forEach(id => (all ? next.delete(id) : next.add(id)))
      return next
    })
  }

  const clear = () => setSelected(new Set())
  const isAllSelected = (ids: string[]) => ids.length > 0 && ids.every(id => selected.has(id))

  return { selected, toggle, toggleAll, clear, isAllSelected }
}

export type BulkSelectState = ReturnType<typeof useBulkSelect>

// Runs deleteOne sequentially over the selection, surfacing per-row failures.
export async function runBulkDelete(
  ids: string[],
  deleteOne: (id: string) => Promise<unknown>,
  noun: string,
): Promise<void> {
  let ok = 0
  const failures: string[] = []
  for (const id of ids) {
    try {
      await deleteOne(id)
      ok++
    } catch (err) {
      failures.push((err as { message?: string })?.message || 'unknown error')
    }
  }
  if (ok > 0) toast.success(`${ok} ${noun}${ok > 1 ? 's' : ''} deleted`)
  if (failures.length > 0) {
    const first = failures[0].replace(/^ApolloError:\s*/, '')
    toast.error(`${failures.length} could not be deleted — ${first}`, { duration: 6000 })
  }
}

export function BulkDeleteBar({ sel, onDelete, deleting }: {
  sel: BulkSelectState
  noun?: string
  onDelete: () => void
  deleting: boolean
}) {
  if (sel.selected.size === 0) return null
  return (
    <div className="flex items-center justify-between bg-muted/60 border border-border rounded-lg px-4 py-2 mb-3">
      <span className="text-sm font-medium">{sel.selected.size} selected</span>
      <div className="flex items-center gap-3">
        <button onClick={sel.clear} className="text-sm text-muted-foreground hover:text-foreground">Clear</button>
        <button onClick={onDelete} disabled={deleting}
          className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50">
          {deleting ? 'Deleting…' : 'Delete selected'}
        </button>
      </div>
    </div>
  )
}

const checkboxCls = 'rounded cursor-pointer'

export function RowCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <input type="checkbox" checked={checked} onChange={onChange}
      onClick={e => e.stopPropagation()} className={checkboxCls} />
  )
}

export function HeaderCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <input type="checkbox" checked={checked} onChange={onChange}
      onClick={e => e.stopPropagation()} className={checkboxCls} title="Select all" />
  )
}
