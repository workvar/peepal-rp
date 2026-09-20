'use client'

// Create an allocation: pick a structure, how students pay (one-time, yearly,
// semester-wise), who it applies to, and the first due date. The installment
// schedule is generated instantly as an editable preview; amounts must add up
// to the structure's course total.

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import toast from 'react-hot-toast'
import {
  CREATE_FEE_ALLOCATION, LIST_COURSE_BATCHES, LIST_STUDENTS,
} from '@/queries/pages/fees/fees'
import { formatCurrency } from '@/functions/fees/feeFormatters'
import type { FeesPageState } from './useFeesPage'
import { FEE_REFETCH } from './useFeesPage'
import type { GqlCourseBatch, GqlFeeStructure } from './types'
import { FeeModal, ModalActions, inputCls, labelCls } from './ui'
import { buildInstallmentPreview, type PreviewRow } from './installmentPreview'
import SearchableSelect from '@/components/ui/SearchableSelect'

const FREQUENCY_OPTIONS = [
  { value: 'one_time', label: 'All at once', sublabel: 'One payment for the whole course' },
  { value: 'yearly', label: 'Yearly', sublabel: 'One installment per course year' },
  { value: 'semester', label: 'Semester-wise', sublabel: 'Year total split across semesters' },
]

const TARGET_OPTIONS = [
  { value: 'course', label: 'Whole course', sublabel: 'Every student of the course' },
  { value: 'batch', label: 'Batch', sublabel: 'One intake batch of the course' },
  { value: 'student', label: 'Single student', sublabel: 'One specific student' },
]

interface StudentOption {
  id: string
  rollNumber: string
  user?: { id: string; name: string } | null
}

export default function AllocationModal({ s, onClose }: {
  s: FeesPageState
  onClose: () => void
}) {
  const [structureId, setStructureId] = useState('')
  const [frequency, setFrequency] = useState('yearly')
  const [targetType, setTargetType] = useState('course')
  const [targetId, setTargetId] = useState('')
  const [name, setName] = useState('')
  const [firstDueDate, setFirstDueDate] = useState('')
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [edited, setEdited] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [createMut] = useMutation(CREATE_FEE_ALLOCATION, { refetchQueries: FEE_REFETCH })

  const structure: GqlFeeStructure | undefined = s.structures.find(fs => fs.id === structureId)
  const courseId = structure?.courseId ?? ''

  const { data: batchData } = useQuery(LIST_COURSE_BATCHES, {
    variables: { courseId }, skip: !courseId || targetType !== 'batch',
  })
  const { data: studentData } = useQuery(LIST_STUDENTS, {
    variables: { courseId }, skip: !courseId || targetType !== 'student',
  })
  const batches: GqlCourseBatch[] = batchData?.courseBatches ?? []
  const students: StudentOption[] = studentData?.students ?? []

  const structureOptions = s.structures.filter(fs => fs.isActive).map(fs => ({
    value: fs.id,
    label: `${fs.course?.name ?? '?'} — ${fs.name}`,
    sublabel: `${fs.code} · ${formatCurrency(fs.totalAmount)} total`,
  }))
  const targetIdOptions =
    targetType === 'batch'
      ? batches.map(b => ({ value: b.id, label: b.name, sublabel: `${b.startYear}–${b.endYear}` }))
      : targetType === 'student'
        ? students.map(st => ({ value: st.id, label: st.user?.name ?? st.rollNumber, sublabel: st.rollNumber }))
        : []

  // Regenerate the preview whenever inputs change, unless the admin already
  // hand-edited the schedule.
  useEffect(() => {
    if (!structure) { setRows([]); return }
    setRows(buildInstallmentPreview(structure, frequency, firstDueDate))
    setEdited(false)
  }, [structureId, frequency, firstDueDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const previewTotal = useMemo(
    () => Math.round(rows.reduce((sum, r) => sum + r.amount, 0) * 100) / 100,
    [rows],
  )
  const totalMatches = !structure || Math.abs(previewTotal - structure.totalAmount) < 0.01

  function setRow(i: number, patch: Partial<PreviewRow>) {
    setEdited(true)
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!structure) return
    if (!totalMatches) {
      toast.error(`Installments add up to ${formatCurrency(previewTotal)} but the course total is ${formatCurrency(structure.totalAmount)}`)
      return
    }
    const target = targetType === 'course' ? courseId : targetId
    if (!target) {
      toast.error('Pick who this allocation applies to')
      return
    }
    setSubmitting(true)
    try {
      const res = await createMut({
        variables: {
          input: {
            feeStructureId: structureId,
            name: name || null,
            frequency,
            targetType,
            targetId: target,
            firstDueDate: firstDueDate || null,
            // Only send the schedule when hand-edited; otherwise the backend
            // auto-generates the same thing.
            installments: edited
              ? rows.map(r => ({ label: r.label, yearNumber: r.yearNumber, dueDate: r.dueDate || null, amount: r.amount }))
              : null,
          },
        },
      })
      const n = res.data?.createFeeAllocation?.studentCount ?? 0
      toast.success(`Allocation created — ${n} student fee record${n === 1 ? '' : 's'} generated`)
      onClose()
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to create allocation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FeeModal title="Create Allocation" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Fee Structure *</label>
          <SearchableSelect options={structureOptions} value={structureId} onChange={setStructureId}
            placeholder="Select course — variation" searchPlaceholder="Search structures…" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Payment Plan *</label>
            <SearchableSelect options={FREQUENCY_OPTIONS} value={frequency} onChange={setFrequency}
              placeholder="How do students pay?" />
          </div>
          <div>
            <label className={labelCls}>First Due Date</label>
            <input type="date" value={firstDueDate} onChange={e => setFirstDueDate(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Applies To *</label>
            <SearchableSelect options={TARGET_OPTIONS} value={targetType}
              onChange={v => { setTargetType(v); setTargetId('') }} placeholder="Target" />
          </div>
          {targetType !== 'course' && (
            <div>
              <label className={labelCls}>{targetType === 'batch' ? 'Batch *' : 'Student *'}</label>
              <SearchableSelect options={targetIdOptions} value={targetId} onChange={setTargetId}
                placeholder={structure ? `Select ${targetType}` : 'Pick a structure first'}
                searchPlaceholder={`Search ${targetType}s…`} disabled={!structure} required />
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inputCls}
            placeholder={structure ? `${structure.course?.name} — ${structure.name} (${FREQUENCY_OPTIONS.find(f => f.value === frequency)?.label})` : 'Auto-generated if left blank'} />
        </div>

        {/* Installment preview (editable) */}
        {rows.length > 0 && structure && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>Installments {edited && <span className="text-xs text-blue-600">(customized)</span>}</label>
              <span className={`text-xs ${totalMatches ? 'text-muted-foreground' : 'text-red-600 font-medium'}`}>
                {formatCurrency(previewTotal)} / {formatCurrency(structure.totalAmount)}
              </span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_9rem_8rem] gap-2 items-center">
                  <input value={r.label} onChange={e => setRow(i, { label: e.target.value })} className={inputCls} />
                  <input type="date" value={r.dueDate} onChange={e => setRow(i, { dueDate: e.target.value })} className={inputCls} />
                  <input type="number" min={1} step={0.01} value={r.amount || ''}
                    onChange={e => setRow(i, { amount: parseFloat(e.target.value) || 0 })} className={inputCls} />
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Creating the allocation immediately generates a fee record for every covered student.
        </p>

        <ModalActions onClose={onClose} submitting={submitting} submitLabel="Create Allocation" />
      </form>
    </FeeModal>
  )
}
