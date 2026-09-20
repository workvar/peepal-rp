'use client'

// Create/edit one course fee structure (variation). The admin picks a course,
// names the variation, and enters per-year amounts for each fee category —
// covering the entire course duration in one place.

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import toast from 'react-hot-toast'
import {
  CREATE_FEE_STRUCTURE, LIST_COURSE_BATCHES, UPDATE_FEE_STRUCTURE,
} from '@/queries/pages/fees/fees'
import { formatCurrency } from '@/functions/fees/feeFormatters'
import type { FeesPageState } from './useFeesPage'
import { FEE_REFETCH } from './useFeesPage'
import type { GqlCourseBatch, GqlFeeStructure } from './types'
import { FeeModal, ModalActions, inputCls, labelCls } from './ui'
import SearchableSelect from '@/components/ui/SearchableSelect'

interface ItemRow {
  feeCategoryId: string
  yearNumber: number
  amount: number
}

export default function StructureModal({ s, editing, onClose }: {
  s: FeesPageState
  editing: GqlFeeStructure | null
  onClose: () => void
}) {
  const [courseId, setCourseId] = useState(editing?.courseId ?? '')
  const [batchId, setBatchId] = useState(editing?.batchId ?? '')
  const [name, setName] = useState(editing?.name ?? '')
  const [code, setCode] = useState(editing?.code ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [items, setItems] = useState<ItemRow[]>(
    editing?.items.map(it => ({ feeCategoryId: it.feeCategoryId, yearNumber: it.yearNumber, amount: it.amount }))
      ?? [{ feeCategoryId: '', yearNumber: 1, amount: 0 }],
  )
  const [submitting, setSubmitting] = useState(false)

  const [createMut] = useMutation(CREATE_FEE_STRUCTURE, { refetchQueries: FEE_REFETCH })
  const [updateMut] = useMutation(UPDATE_FEE_STRUCTURE, { refetchQueries: FEE_REFETCH })

  const course = s.courses.find(c => c.id === courseId)
  const years = Math.max(course?.durationYears ?? 1, 1)
  const itemsLocked = !!editing && editing.allocationCount > 0

  const { data: batchData } = useQuery(LIST_COURSE_BATCHES, {
    variables: { courseId }, skip: !courseId,
  })
  const batches: GqlCourseBatch[] = batchData?.courseBatches ?? []

  const courseOptions = s.courses.map(c => ({
    value: c.id, label: c.name, sublabel: c.code + (c.durationYears ? ` · ${c.durationYears} years` : ''),
  }))
  const batchOptions = [
    { value: '', label: 'All batches' },
    ...batches.map(b => ({ value: b.id, label: b.name, sublabel: `${b.startYear}–${b.endYear}` })),
  ]
  const categoryOptions = s.categories.filter(c => c.isActive).map(c => ({
    value: c.id, label: c.name, sublabel: c.code,
  }))
  const yearOptions = Array.from({ length: years }, (_, i) => ({
    value: String(i + 1), label: `Year ${i + 1}`,
  }))

  const yearTotals = useMemo(() => {
    const totals = new Map<number, number>()
    for (const it of items) {
      if (!it.feeCategoryId || it.amount <= 0) continue
      totals.set(it.yearNumber, (totals.get(it.yearNumber) ?? 0) + it.amount)
    }
    return [...totals.entries()].sort((a, b) => a[0] - b[0])
  }, [items])
  const grandTotal = yearTotals.reduce((sum, [, amt]) => sum + amt, 0)

  function setItem(i: number, patch: Partial<ItemRow>) {
    setItems(rows => rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  function fillAllYears(i: number) {
    // Convenience: repeat this row's category+amount for every course year.
    const row = items[i]
    if (!row.feeCategoryId || row.amount <= 0) return
    const others = items.filter((r, idx) => idx !== i && !(r.feeCategoryId === row.feeCategoryId))
    const filled = Array.from({ length: years }, (_, y) => ({ ...row, yearNumber: y + 1 }))
    setItems([...others, ...filled])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valid = items.filter(it => it.feeCategoryId && it.amount > 0)
    if (!editing && valid.length === 0) {
      toast.error('Add at least one line item')
      return
    }
    setSubmitting(true)
    try {
      if (editing) {
        await updateMut({
          variables: {
            id: editing.id,
            input: {
              name, description, batchId,
              ...(itemsLocked ? {} : { items: valid }),
            },
          },
        })
        toast.success('Structure updated')
      } else {
        await createMut({
          variables: { input: { courseId, name, code, batchId: batchId || null, description, items: valid } },
        })
        toast.success('Structure created')
      }
      onClose()
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to save structure')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FeeModal title={editing ? 'Edit Structure' : 'Add Fee Structure'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Course *</label>
            {editing
              ? <input disabled value={editing.course?.name ?? ''} className={`${inputCls} disabled:opacity-60`} />
              : <SearchableSelect options={courseOptions} value={courseId} onChange={setCourseId}
                  placeholder="Select course" searchPlaceholder="Search courses…" required />}
          </div>
          <div>
            <label className={labelCls}>Intake Batch</label>
            <SearchableSelect options={batchOptions} value={batchId ?? ''} onChange={setBatchId}
              placeholder="All batches" searchPlaceholder="Search batches…" disabled={!courseId} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Variation Name *</label>
            <input required value={name} onChange={e => setName(e.target.value)} className={inputCls}
              placeholder="e.g. Regular, NRI Quota, Merit Scholarship" />
          </div>
          <div>
            <label className={labelCls}>Code *</label>
            <input required value={code} disabled={!!editing}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className={`${inputCls} disabled:opacity-60`} placeholder="e.g. BTCSE-REG" />
          </div>
        </div>

        {/* Per-year line items */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls}>Fees per Year {itemsLocked && <span className="text-xs text-amber-600">(locked — allocations exist)</span>}</label>
            {!itemsLocked && (
              <button type="button" onClick={() => setItems(rows => [...rows, { feeCategoryId: '', yearNumber: 1, amount: 0 }])}
                className="text-sm text-blue-600 hover:underline">+ Add line</button>
            )}
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_8.5rem_8rem_auto_auto] gap-2 items-center">
                <SearchableSelect options={categoryOptions} value={it.feeCategoryId}
                  onChange={v => setItem(i, { feeCategoryId: v })} placeholder="Fee category"
                  searchPlaceholder="Search categories…" disabled={itemsLocked} />
                <SearchableSelect options={yearOptions} value={String(it.yearNumber)}
                  onChange={v => setItem(i, { yearNumber: parseInt(v) || 1 })} placeholder="Year"
                  disabled={itemsLocked} />
                <input type="number" min={1} step={0.01} value={it.amount || ''} disabled={itemsLocked}
                  onChange={e => setItem(i, { amount: parseFloat(e.target.value) || 0 })}
                  className={`${inputCls} disabled:opacity-60`} placeholder="Amount" />
                {!itemsLocked && years > 1 ? (
                  <button type="button" title="Repeat this amount for every year" onClick={() => fillAllYears(i)}
                    className="text-xs text-blue-600 hover:underline whitespace-nowrap">all years</button>
                ) : <span />}
                {!itemsLocked && items.length > 1 ? (
                  <button type="button" onClick={() => setItems(rows => rows.filter((_, idx) => idx !== i))}
                    className="text-red-500 hover:text-red-700 text-lg leading-none">×</button>
                ) : <span />}
              </div>
            ))}
          </div>
        </div>

        {/* Totals preview */}
        {yearTotals.length > 0 && (
          <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
            {yearTotals.map(([y, amt]) => (
              <div key={y} className="flex justify-between text-muted-foreground">
                <span>Year {y}</span><span>{formatCurrency(amt)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1">
              <span>Course Total</span><span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Description</label>
          <input value={description ?? ''} onChange={e => setDescription(e.target.value)} className={inputCls} />
        </div>

        <ModalActions onClose={onClose} submitting={submitting} submitLabel={editing ? 'Update' : 'Create'} />
      </form>
    </FeeModal>
  )
}
