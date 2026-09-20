'use client'

// Add-ons: optional facility charges (Transport, Hostel, Mess…) defined once
// here, then attached to individual students from the Student Fees tab. The
// base course structure stays untouched — students opt in or out per year.

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import toast from 'react-hot-toast'
import {
  CREATE_FEE_ADDON, DELETE_FEE_ADDON, RESYNC_FACILITY_FEES, UPDATE_FEE_ADDON,
} from '@/queries/pages/fees/fees'
import { formatCurrency } from '@/functions/fees/feeFormatters'
import type { FeesPageState } from './useFeesPage'
import { FEE_REFETCH } from './useFeesPage'
import type { GqlFeeAddOn } from './types'
import { FeeModal, ModalActions, inputCls, labelCls } from './ui'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { BulkDeleteBar, HeaderCheckbox, RowCheckbox, runBulkDelete, useBulkSelect } from '@/components/ui/bulkSelect'
import { useLazyList } from '@/components/ui/useLazyList'

export default function AddOnsTab({ s }: { s: FeesPageState }) {
  const [editing, setEditing] = useState<GqlFeeAddOn | null>(null)
  const showModal = s.createOpen || editing !== null
  const closeModal = () => { setEditing(null); s.setCreateOpen(false) }
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [resyncing, setResyncing] = useState(false)
  const sel = useBulkSelect()
  const [deleteMut] = useMutation(DELETE_FEE_ADDON, { refetchQueries: FEE_REFETCH })
  const [resyncMut] = useMutation(RESYNC_FACILITY_FEES, { refetchQueries: FEE_REFETCH })

  async function handleResync() {
    if (!confirm('Attach transport/hostel fees to all students who currently hold a route or room but are missing the charge?')) return
    setResyncing(true)
    try {
      const res = await resyncMut()
      const n = res.data?.resyncFacilityFees ?? 0
      toast.success(n > 0 ? `Synced — ${n} facility fee${n > 1 ? 's' : ''} attached` : 'Everything already in sync')
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to sync facility fees')
    } finally {
      setResyncing(false)
    }
  }

  const allIds = s.addOns.map(a => a.id)
  const { visible, sentinelRef, hasMore } = useLazyList(s.addOns, { enabled: s.lazyLoad })

  async function handleBulkDelete() {
    if (!confirm(`Delete ${sel.selected.size} selected add-on${sel.selected.size > 1 ? 's' : ''}? Add-ons attached to students will be skipped.`)) return
    setBulkDeleting(true)
    await runBulkDelete([...sel.selected], id => deleteMut({ variables: { id } }), 'add-on')
    sel.clear()
    setBulkDeleting(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this add-on?')) return
    try {
      await deleteMut({ variables: { id } })
      toast.success('Add-on deleted')
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Define optional facilities here, then attach them to individual students from the
          Student Fees tab. Transport/Hostel add-ons attach automatically on allocation.
          Charges are per course year and can be removed when a student opts out.
        </p>
        <button onClick={handleResync} disabled={resyncing}
          className="btn-secondary px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap disabled:opacity-50">
          {resyncing ? 'Syncing…' : 'Sync facility fees'}
        </button>
      </div>
      <BulkDeleteBar sel={sel} noun="add-on" onDelete={handleBulkDelete} deleting={bulkDeleting} />
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="table-th w-10">
                <HeaderCheckbox checked={sel.isAllSelected(allIds)} onChange={() => sel.toggleAll(allIds)} />
              </th>
              <th className="table-th">Add-on</th>
              <th className="table-th">Kind</th>
              <th className="table-th">Bills Under</th>
              <th className="table-th text-right">Amount / Year</th>
              <th className="table-th text-center">Students</th>
              <th className="table-th">Status</th>
              <th className="table-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map(a => (
              <tr key={a.id} className={sel.selected.has(a.id) ? 'bg-blue-50/50' : ''}>
                <td className="table-td">
                  <RowCheckbox checked={sel.selected.has(a.id)} onChange={() => sel.toggle(a.id)} />
                </td>
                <td className="table-td">
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{a.code}</p>
                </td>
                <td className="table-td">
                  {a.kind && a.kind !== 'other' ? (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium capitalize">
                      {a.kind} · auto
                    </span>
                  ) : <span className="text-xs text-muted-foreground">Manual</span>}
                </td>
                <td className="table-td text-muted-foreground">{a.feeCategory?.name ?? '—'}</td>
                <td className="table-td text-right font-semibold">{formatCurrency(a.amountPerYear)}</td>
                <td className="table-td text-center">{a.studentCount}</td>
                <td className="table-td">{a.isActive ? 'Active' : 'Inactive'}</td>
                <td className="table-td text-right space-x-3">
                  <button onClick={() => setEditing(a)} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {s.addOns.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                No add-ons yet. Define facilities like Transport, Hostel, or Mess.
              </td></tr>
            )}
            {hasMore && <tr ref={sentinelRef} aria-hidden />}
          </tbody>
        </table>
      </div>

      {showModal && <AddOnModal s={s} editing={editing} onClose={closeModal} />}
    </div>
  )
}

function AddOnModal({ s, editing, onClose }: {
  s: FeesPageState
  editing: GqlFeeAddOn | null
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    code: editing?.code ?? '',
    kind: editing?.kind ?? 'other',
    feeCategoryId: editing?.feeCategoryId ?? '',
    amountPerYear: editing?.amountPerYear ?? 0,
    description: editing?.description ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [createMut] = useMutation(CREATE_FEE_ADDON, { refetchQueries: FEE_REFETCH })
  const [updateMut] = useMutation(UPDATE_FEE_ADDON, { refetchQueries: FEE_REFETCH })

  const categoryOptions = s.categories.filter(c => c.isActive).map(c => ({
    value: c.id, label: c.name, sublabel: c.code,
  }))
  const kindOptions = [
    { value: 'other', label: 'Manual', sublabel: 'Attach to students by hand' },
    { value: 'transport', label: 'Transport', sublabel: 'Auto-attaches on bus route allocation' },
    { value: 'hostel', label: 'Hostel', sublabel: 'Auto-attaches on hostel room allocation (room-priced)' },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editing) {
        await updateMut({
          variables: {
            id: editing.id,
            input: { name: form.name, kind: form.kind, amountPerYear: form.amountPerYear, description: form.description },
          },
        })
        toast.success('Add-on updated')
      } else {
        await createMut({ variables: { input: form } })
        toast.success('Add-on created')
      }
      onClose()
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to save add-on')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FeeModal title={editing ? 'Edit Add-on' : 'Add Fee Add-on'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Name *</label>
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className={inputCls} placeholder="e.g. College Bus, Hostel Room" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Code *</label>
            <input required value={form.code} disabled={!!editing}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              className={`${inputCls} disabled:opacity-60`} placeholder="e.g. ADDON-BUS" />
          </div>
          <div>
            <label className={labelCls}>Amount per Year *</label>
            <input type="number" required min={1} step={0.01} value={form.amountPerYear || ''}
              onChange={e => setForm(f => ({ ...f, amountPerYear: parseFloat(e.target.value) || 0 }))}
              className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Bills Under Category *</label>
          {editing
            ? <input disabled value={editing.feeCategory?.name ?? ''} className={`${inputCls} disabled:opacity-60`} />
            : <SearchableSelect options={categoryOptions} value={form.feeCategoryId}
                onChange={v => setForm(f => ({ ...f, feeCategoryId: v }))}
                placeholder="Select fee category" searchPlaceholder="Search categories…" required />}
        </div>
        <div>
          <label className={labelCls}>Auto-attach Kind</label>
          <SearchableSelect options={kindOptions} value={form.kind}
            onChange={v => setForm(f => ({ ...f, kind: v }))} placeholder="Manual" />
          <p className="text-xs text-muted-foreground mt-1">
            Transport/Hostel add-ons attach to a student automatically when you allocate them a bus route or hostel room.
          </p>
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <input value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} />
        </div>
        <ModalActions onClose={onClose} submitting={submitting} submitLabel={editing ? 'Update' : 'Create'} />
      </form>
    </FeeModal>
  )
}
