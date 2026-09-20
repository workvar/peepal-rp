'use client'

// Student Fees: the materialized per-student fee records. Search a student
// and expand their row to see installments, attach/remove add-ons (Transport,
// Hostel…), and manage discounts. Add-ons can change any time; discounts lock
// once a payment exists.

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import toast from 'react-hot-toast'
import {
  ADD_STUDENT_FEE_DISCOUNT, REMOVE_STUDENT_FEE_ADDON, REMOVE_STUDENT_FEE_DISCOUNT,
} from '@/queries/pages/fees/fees'
import { formatCurrency } from '@/functions/fees/feeFormatters'
import type { FeesPageState } from './useFeesPage'
import { FEE_REFETCH } from './useFeesPage'
import type { GqlStudentFee } from './types'
import { FeeModal, ModalActions, StatusBadge, inputCls, labelCls } from './ui'
import AttachAddOnModal from './AttachAddOnModal'
import { useLazyList } from '@/components/ui/useLazyList'

export default function StudentFeesTab({ s }: { s: FeesPageState }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [discounting, setDiscounting] = useState<GqlStudentFee | null>(null)
  const [attaching, setAttaching] = useState<GqlStudentFee | null>(null)

  const [removeDiscountMut] = useMutation(REMOVE_STUDENT_FEE_DISCOUNT, { refetchQueries: FEE_REFETCH })
  const [removeAddOnMut] = useMutation(REMOVE_STUDENT_FEE_ADDON, { refetchQueries: FEE_REFETCH })

  const search = s.search.toLowerCase()
  const fees = search
    ? s.studentFees.filter(sf => [
        sf.student?.user?.name, sf.student?.rollNumber, sf.feeAllocation?.name, sf.status,
      ].some(v => String(v ?? '').toLowerCase().includes(search)))
    : s.studentFees
  const { visible, sentinelRef, hasMore } = useLazyList(fees, { enabled: s.lazyLoad })

  async function handleRemoveDiscount(id: string) {
    if (!confirm('Remove this discount?')) return
    try {
      await removeDiscountMut({ variables: { id } })
      toast.success('Discount removed')
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to remove discount')
    }
  }

  async function handleRemoveAddOn(id: string) {
    if (!confirm('Remove this add-on? Unpaid installments will be reduced accordingly.')) return
    try {
      await removeAddOnMut({ variables: { id } })
      toast.success('Add-on removed')
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to remove add-on')
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="table-th">Student</th>
              <th className="table-th">Allocation</th>
              <th className="table-th text-right">Net</th>
              <th className="table-th text-right">Paid</th>
              <th className="table-th text-right">Due</th>
              <th className="table-th">Status</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map(sf => (
              <FeeRow key={sf.id} sf={sf} expanded={expanded === sf.id}
                onToggle={() => setExpanded(expanded === sf.id ? null : sf.id)}
                onDiscount={() => setDiscounting(sf)}
                onRemoveDiscount={handleRemoveDiscount}
                onAttachAddOn={() => setAttaching(sf)}
                onRemoveAddOn={handleRemoveAddOn}
                isAdmin={s.isAdmin} isStaff={s.isStaff} />
            ))}
            {fees.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No student fees yet. Create an allocation from the Allocations tab.</td></tr>
            )}
            {hasMore && <tr ref={sentinelRef} aria-hidden />}
          </tbody>
        </table>
      </div>

      {discounting && <DiscountModal sf={discounting} onClose={() => setDiscounting(null)} />}
      {attaching && <AttachAddOnModal s={s} sf={attaching} onClose={() => setAttaching(null)} />}
    </div>
  )
}

function FeeRow({ sf, expanded, onToggle, onDiscount, onRemoveDiscount, onAttachAddOn, onRemoveAddOn, isAdmin, isStaff }: {
  sf: GqlStudentFee
  expanded: boolean
  onToggle: () => void
  onDiscount: () => void
  onRemoveDiscount: (id: string) => void
  onAttachAddOn: () => void
  onRemoveAddOn: (id: string) => void
  isAdmin: boolean
  isStaff: boolean
}) {
  const due = Math.round((sf.netAmount - sf.paidAmount) * 100) / 100
  return (
    <>
      <tr className="cursor-pointer hover:bg-muted/30" onClick={onToggle}>
        <td className="table-td">
          <p className="font-medium">{sf.student?.user?.name ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{sf.student?.rollNumber} · {sf.student?.course?.name}</p>
        </td>
        <td className="table-td">{sf.feeAllocation?.name}</td>
        <td className="table-td text-right">
          {formatCurrency(sf.netAmount)}
          {sf.discountAmount > 0 && <p className="text-xs text-green-600">-{formatCurrency(sf.discountAmount)} off</p>}
        </td>
        <td className="table-td text-right">{formatCurrency(sf.paidAmount)}</td>
        <td className="table-td text-right font-medium">{formatCurrency(due)}</td>
        <td className="table-td"><StatusBadge status={sf.status} /></td>
        <td className="table-td text-muted-foreground">{expanded ? '▾' : '▸'}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="px-6 py-4 bg-muted/20">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Installments</p>
                {sf.installments.map(in_ => (
                  <div key={in_.id} className="flex justify-between items-center py-1">
                    <span>
                      {in_.sequence}. {in_.label}{in_.dueDate ? ` · due ${in_.dueDate}` : ''}
                      {in_.isOverdue && <span className="ml-2 text-xs text-red-600 font-medium">overdue</span>}
                    </span>
                    <span>{formatCurrency(in_.paidAmount)} / {formatCurrency(in_.amount)} <StatusBadge status={in_.status} /></span>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Add-ons</p>
                  {isStaff && (
                    <button onClick={onAttachAddOn} className="text-xs text-blue-600 hover:underline">+ Attach add-on</button>
                  )}
                </div>
                {sf.addOns.length === 0 && <p className="text-muted-foreground">No add-ons. Attach transport, hostel, etc.</p>}
                {sf.addOns.map(a => (
                  <div key={a.id} className="flex justify-between items-center py-1">
                    <span>{a.feeAddOn?.name ?? '—'} <span className="text-xs text-muted-foreground">· Year {a.yearNumber}</span></span>
                    <span className="space-x-2">
                      <span className="font-medium">+{formatCurrency(a.amount)}</span>
                      {isStaff && (
                        <button onClick={() => onRemoveAddOn(a.id)} className="text-red-500 text-xs hover:underline">remove</button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Discounts</p>
                  {isAdmin && sf.paidAmount === 0 && (
                    <button onClick={onDiscount} className="text-xs text-blue-600 hover:underline">+ Add discount</button>
                  )}
                </div>
                {sf.discounts.length === 0 && <p className="text-muted-foreground">No discounts.</p>}
                {sf.discounts.map(d => (
                  <div key={d.id} className="flex justify-between items-center py-1">
                    <span>{d.label} <span className="text-xs text-muted-foreground">({d.discountType === 'percent' ? `${d.value}%` : 'fixed'})</span></span>
                    <span className="space-x-2">
                      <span className="text-green-600">-{formatCurrency(d.amount)}</span>
                      {isAdmin && sf.paidAmount === 0 && (
                        <button onClick={() => onRemoveDiscount(d.id)} className="text-red-500 text-xs hover:underline">remove</button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function DiscountModal({ sf, onClose }: { sf: GqlStudentFee; onClose: () => void }) {
  const [form, setForm] = useState({ label: '', discountType: 'fixed', value: 0, remarks: '' })
  const [submitting, setSubmitting] = useState(false)
  const [addMut] = useMutation(ADD_STUDENT_FEE_DISCOUNT, { refetchQueries: FEE_REFETCH })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await addMut({ variables: { input: { studentFeeId: sf.id, ...form } } })
      toast.success('Discount added')
      onClose()
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to add discount')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FeeModal title={`Discount — ${sf.student?.user?.name ?? ''}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Label *</label>
          <input required value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            className={inputCls} placeholder="e.g. Merit Scholarship" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Type *</label>
            <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))} className={inputCls}>
              <option value="fixed">Fixed amount</option>
              <option value="percent">Percentage</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{form.discountType === 'percent' ? 'Percentage *' : 'Amount *'}</label>
            <input type="number" required min={0.01} step={0.01}
              max={form.discountType === 'percent' ? 100 : undefined}
              value={form.value || ''} onChange={e => setForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))}
              className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Remarks</label>
          <input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} className={inputCls} />
        </div>
        <ModalActions onClose={onClose} submitting={submitting} submitLabel="Add Discount" />
      </form>
    </FeeModal>
  )
}
