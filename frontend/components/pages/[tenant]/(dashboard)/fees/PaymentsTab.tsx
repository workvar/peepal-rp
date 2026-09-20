'use client'

// Payments: record money against a student fee (applied to installments
// oldest-first, or to a chosen installment) and view/cancel history.
// Students see their own fee cards and payment history here.

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import toast from 'react-hot-toast'
import { PAYMENT_MODES } from '@/constants/fees/paymentModes'
import { CANCEL_FEE_PAYMENT, RECORD_FEE_PAYMENT } from '@/queries/pages/fees/fees'
import { formatCurrency } from '@/functions/fees/feeFormatters'
import type { FeesPageState } from './useFeesPage'
import { FEE_REFETCH } from './useFeesPage'
import type { GqlStudentFee } from './types'
import { FeeModal, ModalActions, StatusBadge, inputCls, labelCls } from './ui'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { useLazyList } from '@/components/ui/useLazyList'

export default function PaymentsTab({ s }: { s: FeesPageState }) {
  const [cancelMut] = useMutation(CANCEL_FEE_PAYMENT, { refetchQueries: FEE_REFETCH })

  const search = s.search.toLowerCase()
  const payments = search
    ? s.payments.filter(p => [
        p.receiptNumber, p.student?.user?.name, p.student?.rollNumber,
        p.studentFee?.feeAllocation?.name, p.paymentMode,
      ].some(v => String(v ?? '').toLowerCase().includes(search)))
    : s.payments
  const { visible, sentinelRef, hasMore } = useLazyList(payments, { enabled: s.lazyLoad })

  async function handleCancel(id: string) {
    if (!confirm('Cancel this payment? Its amount will be reversed from the installments.')) return
    try {
      await cancelMut({ variables: { id } })
      toast.success('Payment cancelled')
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to cancel payment')
    }
  }

  return (
    <div className="space-y-4">
      {/* Student self-service: their fee records */}
      {s.isStudent && (
        <div className="grid md:grid-cols-2 gap-4">
          {s.myFees.map(sf => (
            <div key={sf.id} className="bg-card rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">{sf.feeAllocation?.name}</p>
                <StatusBadge status={sf.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Paid {formatCurrency(sf.paidAmount)} of {formatCurrency(sf.netAmount)}
                {sf.discountAmount > 0 && <span className="text-green-600"> ({formatCurrency(sf.discountAmount)} discount applied)</span>}
              </p>
              {sf.addOns.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {sf.addOns.map(a => (
                    <span key={a.id} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">
                      {a.feeAddOn?.name} · Y{a.yearNumber}
                    </span>
                  ))}
                </div>
              )}
              <div className="space-y-1 text-sm">
                {sf.installments.map(in_ => (
                  <div key={in_.id} className="flex justify-between">
                    <span>
                      {in_.label}{in_.dueDate ? ` · due ${in_.dueDate}` : ''}
                      {in_.isOverdue && <span className="ml-2 text-xs text-red-600 font-medium">overdue</span>}
                    </span>
                    <span>{formatCurrency(in_.paidAmount)} / {formatCurrency(in_.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {s.myFees.length === 0 && (
            <div className="bg-card rounded-xl border border-border px-4 py-8 text-center text-muted-foreground text-sm md:col-span-2">
              No fees allocated to you yet.
            </div>
          )}
        </div>
      )}

      {s.isStudent && <h3 className="font-semibold text-foreground">Payment History</h3>}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="table-th">Receipt</th>
              {s.isStaff && <th className="table-th">Student</th>}
              <th className="table-th">Allocation</th>
              <th className="table-th text-right">Amount</th>
              <th className="table-th">Date</th>
              <th className="table-th">Mode</th>
              <th className="table-th">Status</th>
              {s.isAdmin && <th className="table-th text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map(p => (
              <tr key={p.id}>
                <td className="table-td font-mono text-xs">{p.receiptNumber}</td>
                {s.isStaff && (
                  <td className="table-td">
                    <p className="font-medium">{p.student?.user?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{p.student?.rollNumber}</p>
                  </td>
                )}
                <td className="table-td">{p.studentFee?.feeAllocation?.name ?? '—'}</td>
                <td className="table-td text-right font-medium">{formatCurrency(p.amount)}</td>
                <td className="table-td">{p.paymentDate}</td>
                <td className="table-td capitalize">{p.paymentMode}</td>
                <td className="table-td"><StatusBadge status={p.status} /></td>
                {s.isAdmin && (
                  <td className="table-td text-right">
                    {p.status === 'paid' && (
                      <button onClick={() => handleCancel(p.id)} className="text-red-600 hover:underline">Cancel</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No payments recorded yet.</td></tr>
            )}
            {hasMore && <tr ref={sentinelRef} aria-hidden />}
          </tbody>
        </table>
      </div>

      {s.isStaff && s.createOpen && <RecordPaymentModal s={s} onClose={() => s.setCreateOpen(false)} />}
    </div>
  )
}

function RecordPaymentModal({ s, onClose }: { s: FeesPageState; onClose: () => void }) {
  const [studentFeeId, setStudentFeeId] = useState('')
  const [installmentId, setInstallmentId] = useState('')
  const [form, setForm] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'cash',
    transactionRef: '',
    remarks: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [recordMut] = useMutation(RECORD_FEE_PAYMENT, { refetchQueries: FEE_REFETCH })

  const openFees = s.studentFees.filter(sf => sf.status !== 'paid')
  const selected: GqlStudentFee | undefined = openFees.find(sf => sf.id === studentFeeId)
  const outstanding = selected ? Math.round((selected.netAmount - selected.paidAmount) * 100) / 100 : 0

  const feeOptions = openFees.map(sf => ({
    value: sf.id,
    label: `${sf.student?.user?.name ?? '?'} (${sf.student?.rollNumber ?? '?'})`,
    sublabel: `${sf.feeAllocation?.name ?? ''} · ${formatCurrency(Math.round((sf.netAmount - sf.paidAmount) * 100) / 100)} due`,
  }))
  const installmentOptions = [
    { value: '', label: 'Apply oldest-first' },
    ...(selected?.installments.filter(in_ => in_.status !== 'paid').map(in_ => ({
      value: in_.id,
      label: in_.label,
      sublabel: `${formatCurrency(in_.amount - in_.paidAmount)} due${in_.dueDate ? ` by ${in_.dueDate}` : ''}`,
    })) ?? []),
  ]
  const modeOptions = PAYMENT_MODES.map(m => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!studentFeeId) {
      toast.error('Select a student fee')
      return
    }
    setSubmitting(true)
    try {
      const res = await recordMut({
        variables: {
          input: {
            studentFeeId,
            installmentId: installmentId || null,
            amount: form.amount,
            paymentDate: form.paymentDate,
            paymentMode: form.paymentMode,
            transactionRef: form.transactionRef,
            remarks: form.remarks,
          },
        },
      })
      toast.success(`Payment recorded — receipt ${res.data?.recordFeePayment?.receiptNumber ?? ''}`)
      onClose()
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FeeModal title="Record Fee Payment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Student Fee *</label>
          <SearchableSelect options={feeOptions} value={studentFeeId}
            onChange={v => { setStudentFeeId(v); setInstallmentId('') }}
            placeholder="Select student fee" searchPlaceholder="Search students, allocations…" required />
          {selected && (
            <p className="text-xs text-muted-foreground mt-1">Outstanding: <span className="font-medium text-foreground">{formatCurrency(outstanding)}</span></p>
          )}
        </div>

        {selected && (
          <div>
            <label className={labelCls}>Installment (optional — otherwise oldest first)</label>
            <SearchableSelect options={installmentOptions} value={installmentId} onChange={setInstallmentId}
              placeholder="Apply oldest-first" searchPlaceholder="Search installments…" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Amount *</label>
            <input type="number" required min={1} step={0.01} max={outstanding || undefined} value={form.amount || ''}
              onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Payment Date</label>
            <input type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Payment Mode</label>
            <SearchableSelect options={modeOptions} value={form.paymentMode}
              onChange={v => setForm(f => ({ ...f, paymentMode: v }))} placeholder="Mode" />
          </div>
          <div>
            <label className={labelCls}>Transaction Ref</label>
            <input value={form.transactionRef} onChange={e => setForm(f => ({ ...f, transactionRef: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Remarks</label>
          <input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} className={inputCls} />
        </div>

        <ModalActions onClose={onClose} submitting={submitting} submitLabel="Record Payment" />
      </form>
    </FeeModal>
  )
}
