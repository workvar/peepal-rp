'use client'

// Attach an add-on (Transport, Hostel…) to one student's fee for chosen
// course years. The student's totals and unpaid installments update
// immediately; the add-on can be removed again from the same place.

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import toast from 'react-hot-toast'
import { ADD_STUDENT_FEE_ADDON } from '@/queries/pages/fees/fees'
import { formatCurrency } from '@/functions/fees/feeFormatters'
import type { FeesPageState } from './useFeesPage'
import { FEE_REFETCH } from './useFeesPage'
import type { GqlStudentFee } from './types'
import { FeeModal, ModalActions, labelCls } from './ui'
import SearchableSelect from '@/components/ui/SearchableSelect'

export default function AttachAddOnModal({ s, sf, onClose }: {
  s: FeesPageState
  sf: GqlStudentFee
  onClose: () => void
}) {
  const [feeAddOnId, setFeeAddOnId] = useState('')
  const [years, setYears] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [addMut] = useMutation(ADD_STUDENT_FEE_ADDON, { refetchQueries: FEE_REFETCH })

  const courseYears = sf.feeAllocation?.feeStructure?.course?.durationYears ?? 4
  const attached = new Set(sf.addOns.filter(a => a.feeAddOnId === feeAddOnId).map(a => a.yearNumber))
  const addOn = s.addOns.find(a => a.id === feeAddOnId)

  const addOnOptions = s.addOns.filter(a => a.isActive).map(a => ({
    value: a.id, label: a.name, sublabel: `${a.code} · ${formatCurrency(a.amountPerYear)}/year`,
  }))

  function toggleYear(y: number) {
    setYears(ys => ys.includes(y) ? ys.filter(v => v !== y) : [...ys, y].sort((a, b) => a - b))
  }

  const addedTotal = (addOn?.amountPerYear ?? 0) * years.length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!feeAddOnId || years.length === 0) {
      toast.error('Pick an add-on and at least one year')
      return
    }
    setSubmitting(true)
    try {
      const res = await addMut({ variables: { input: { studentFeeId: sf.id, feeAddOnId, yearNumbers: years } } })
      toast.success(`Add-on attached — new total ${formatCurrency(res.data?.addStudentFeeAddOn?.netAmount ?? 0)}`)
      onClose()
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to attach add-on')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FeeModal title={`Attach Add-on — ${sf.student?.user?.name ?? ''}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Add-on *</label>
          <SearchableSelect options={addOnOptions} value={feeAddOnId}
            onChange={v => { setFeeAddOnId(v); setYears([]) }}
            placeholder="Select add-on" searchPlaceholder="Search add-ons…" required />
        </div>

        {addOn && (
          <div>
            <label className={labelCls}>Charge in Years *</label>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: courseYears }, (_, i) => i + 1).map(y => {
                const taken = attached.has(y)
                const active = years.includes(y)
                return (
                  <button key={y} type="button" disabled={taken} onClick={() => toggleYear(y)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors
                      ${taken ? 'opacity-40 cursor-not-allowed border-border'
                        : active ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-border hover:border-blue-400'}`}>
                    Year {y}{taken ? ' ✓' : ''}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {years.length > 0
                ? `Adds ${formatCurrency(addedTotal)} (${formatCurrency(addOn.amountPerYear)} × ${years.length} year${years.length > 1 ? 's' : ''}) to this student's fee.`
                : 'Years already attached are marked ✓.'}
            </p>
          </div>
        )}

        <ModalActions onClose={onClose} submitting={submitting} submitLabel="Attach" />
      </form>
    </FeeModal>
  )
}
