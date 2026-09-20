'use client'

// Duplicate a structure (with all per-year items) as a new variation under
// the same course — the quick way to spin up an NRI/management/scholarship
// tier and then tweak the amounts.

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import toast from 'react-hot-toast'
import { CLONE_FEE_STRUCTURE } from '@/queries/pages/fees/fees'
import { FEE_REFETCH } from './useFeesPage'
import type { GqlFeeStructure } from './types'
import { FeeModal, ModalActions, inputCls, labelCls } from './ui'

export default function CloneStructureModal({ structure, onClose }: {
  structure: GqlFeeStructure
  onClose: () => void
}) {
  const [name, setName] = useState(structure.name + ' Copy')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cloneMut] = useMutation(CLONE_FEE_STRUCTURE, { refetchQueries: FEE_REFETCH })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await cloneMut({ variables: { id: structure.id, name, code } })
      toast.success('Variation created — adjust its amounts as needed')
      onClose()
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to clone structure')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FeeModal title={`Clone "${structure.name}" (${structure.course?.name})`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Creates a new variation under {structure.course?.name} with the same per-year amounts.
        </p>
        <div>
          <label className={labelCls}>New Variation Name *</label>
          <input required value={name} onChange={e => setName(e.target.value)} className={inputCls}
            placeholder="e.g. NRI Quota" />
        </div>
        <div>
          <label className={labelCls}>New Code *</label>
          <input required value={code} onChange={e => setCode(e.target.value.toUpperCase())}
            className={inputCls} placeholder="e.g. BTCSE-NRI" />
        </div>
        <ModalActions onClose={onClose} submitting={submitting} submitLabel="Clone" />
      </form>
    </FeeModal>
  )
}
