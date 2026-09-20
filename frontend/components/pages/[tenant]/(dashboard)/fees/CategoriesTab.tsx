'use client'

// Fee Categories: the master list of fee codes (TUITION, TRANSPORT, FOOD…).

import { useEffect, useState } from 'react'
import { useMutation } from '@apollo/client'
import toast from 'react-hot-toast'
import {
  CREATE_FEE_CATEGORY, DELETE_FEE_CATEGORY, UPDATE_FEE_CATEGORY,
} from '@/queries/pages/fees/fees'
import type { FeesPageState } from './useFeesPage'
import { FEE_REFETCH } from './useFeesPage'
import type { GqlFeeCategory } from './types'
import { FeeModal, ModalActions, inputCls, labelCls } from './ui'
import { BulkDeleteBar, HeaderCheckbox, RowCheckbox, runBulkDelete, useBulkSelect } from '@/components/ui/bulkSelect'
import { useLazyList } from '@/components/ui/useLazyList'

const EMPTY = { name: '', code: '', description: '' }

export default function CategoriesTab({ s }: { s: FeesPageState }) {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<GqlFeeCategory | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const sel = useBulkSelect()

  const [createMut] = useMutation(CREATE_FEE_CATEGORY, { refetchQueries: FEE_REFETCH })
  const [updateMut] = useMutation(UPDATE_FEE_CATEGORY, { refetchQueries: FEE_REFETCH })
  const [deleteMut] = useMutation(DELETE_FEE_CATEGORY, { refetchQueries: FEE_REFETCH })

  const allIds = s.categories.map(c => c.id)
  const { visible, sentinelRef, hasMore } = useLazyList(s.categories, { enabled: s.lazyLoad })

  async function handleBulkDelete() {
    if (!confirm(`Delete ${sel.selected.size} selected categor${sel.selected.size > 1 ? 'ies' : 'y'}? Categories used by structures will be skipped.`)) return
    setBulkDeleting(true)
    await runBulkDelete([...sel.selected], id => deleteMut({ variables: { id } }), 'category')
    sel.clear()
    setBulkDeleting(false)
  }

  // The page header's "+ New Category" button drives create mode.
  useEffect(() => {
    if (s.createOpen) {
      setEditing(null)
      setForm(EMPTY)
      setShowModal(true)
    }
  }, [s.createOpen])

  function closeModal() {
    setShowModal(false)
    s.setCreateOpen(false)
  }

  function openEdit(cat: GqlFeeCategory) {
    setEditing(cat)
    setForm({ name: cat.name, code: cat.code, description: cat.description || '' })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editing) {
        await updateMut({ variables: { id: editing.id, input: { name: form.name, description: form.description } } })
        toast.success('Category updated')
      } else {
        await createMut({ variables: { input: form } })
        toast.success('Category created')
      }
      closeModal()
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to save category')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category?')) return
    try {
      await deleteMut({ variables: { id } })
      toast.success('Category deleted')
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      <BulkDeleteBar sel={sel} noun="category" onDelete={handleBulkDelete} deleting={bulkDeleting} />
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="table-th w-10">
                <HeaderCheckbox checked={sel.isAllSelected(allIds)} onChange={() => sel.toggleAll(allIds)} />
              </th>
              <th className="table-th">Name</th>
              <th className="table-th">Code</th>
              <th className="table-th">Description</th>
              <th className="table-th">Status</th>
              <th className="table-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map(cat => (
              <tr key={cat.id} className={sel.selected.has(cat.id) ? 'bg-blue-50/50' : ''}>
                <td className="table-td">
                  <RowCheckbox checked={sel.selected.has(cat.id)} onChange={() => sel.toggle(cat.id)} />
                </td>
                <td className="table-td font-medium">{cat.name}</td>
                <td className="table-td font-mono text-xs">{cat.code}</td>
                <td className="table-td text-muted-foreground">{cat.description || '—'}</td>
                <td className="table-td">{cat.isActive ? 'Active' : 'Inactive'}</td>
                <td className="table-td text-right space-x-3">
                  <button onClick={() => openEdit(cat)} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(cat.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {s.categories.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No categories yet. Add codes like Tuition, Transport, Food.</td></tr>
            )}
            {hasMore && <tr ref={sentinelRef} aria-hidden />}
          </tbody>
        </table>
      </div>

      {showModal && (
        <FeeModal title={editing ? 'Edit Category' : 'Add Fee Category'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Name *</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="e.g. Tuition Fee" />
            </div>
            <div>
              <label className={labelCls}>Code *</label>
              <input required value={form.code} disabled={!!editing}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                className={`${inputCls} disabled:opacity-60`} placeholder="e.g. TUITION" />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} />
            </div>
            <ModalActions onClose={closeModal} submitting={submitting} submitLabel={editing ? 'Update' : 'Create'} />
          </form>
        </FeeModal>
      )}
    </div>
  )
}
