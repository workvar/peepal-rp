'use client'

// Fee Structures: course fee variations. Every structure belongs to one
// course and covers its entire duration with per-year category amounts.
// Structures are grouped under their course; variations (Regular, NRI,
// Scholarship…) sit side by side and can be cloned to start a new tier.

import { useMemo, useState } from 'react'
import { useMutation } from '@apollo/client'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { DELETE_FEE_STRUCTURE } from '@/queries/pages/fees/fees'
import { formatCurrency } from '@/functions/fees/feeFormatters'
import type { FeesPageState } from './useFeesPage'
import { FEE_REFETCH } from './useFeesPage'
import type { GqlFeeStructure } from './types'
import StructureModal from './StructureModal'
import CloneStructureModal from './CloneStructureModal'
import { BulkDeleteBar, HeaderCheckbox, RowCheckbox, runBulkDelete, useBulkSelect } from '@/components/ui/bulkSelect'

interface CourseGroup {
  courseId: string
  courseName: string
  durationYears: number
  structures: GqlFeeStructure[]
}

export default function StructuresTab({ s }: { s: FeesPageState }) {
  const [editing, setEditing] = useState<GqlFeeStructure | null>(null)
  const showModal = s.createOpen || editing !== null
  const closeModal = () => { setEditing(null); s.setCreateOpen(false) }
  const [cloning, setCloning] = useState<GqlFeeStructure | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const sel = useBulkSelect()

  const [deleteMut] = useMutation(DELETE_FEE_STRUCTURE, { refetchQueries: FEE_REFETCH })

  async function handleBulkDelete() {
    if (!confirm(`Delete ${sel.selected.size} selected structure${sel.selected.size > 1 ? 's' : ''}? Structures with allocations will be skipped.`)) return
    setBulkDeleting(true)
    await runBulkDelete([...sel.selected], id => deleteMut({ variables: { id } }), 'structure')
    sel.clear()
    setBulkDeleting(false)
  }

  const search = s.search.toLowerCase()
  const groups: CourseGroup[] = useMemo(() => {
    const filtered = search
      ? s.structures.filter(fs => [fs.name, fs.code, fs.course?.name, fs.batch?.name]
          .some(v => String(v ?? '').toLowerCase().includes(search)))
      : s.structures
    const map = new Map<string, CourseGroup>()
    for (const fs of filtered) {
      const id = fs.courseId
      const g = map.get(id) ?? {
        courseId: id,
        courseName: fs.course?.name ?? 'Unknown course',
        durationYears: fs.course?.durationYears ?? 0,
        structures: [],
      }
      g.structures.push(fs)
      map.set(id, g)
    }
    return [...map.values()].sort((a, b) => a.courseName.localeCompare(b.courseName))
  }, [s.structures, search])

  async function handleDelete(id: string) {
    if (!confirm('Delete this structure variation?')) return
    try {
      await deleteMut({ variables: { id } })
      toast.success('Structure deleted')
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to delete')
    }
  }

  function openEdit(fs: GqlFeeStructure) {
    setEditing(fs)
  }

  return (
    <div className="space-y-4">
      <BulkDeleteBar sel={sel} noun="structure" onDelete={handleBulkDelete} deleting={bulkDeleting} />

      {groups.length === 0 && (
        <div className="bg-card rounded-xl border border-border px-4 py-10 text-center text-muted-foreground text-sm">
          No fee structures yet. Add one per course, then create variations like Regular, NRI, or Scholarship.
        </div>
      )}

      {groups.map(g => {
        const isCollapsed = collapsed[g.courseId]
        return (
          <div key={g.courseId} className="card p-0 overflow-hidden">
            {/* Course header */}
            <button onClick={() => setCollapsed(c => ({ ...c, [g.courseId]: !c[g.courseId] }))}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left">
              <span className="flex items-center gap-2 font-semibold text-foreground">
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {g.courseName}
                {g.durationYears > 0 && <span className="text-xs font-normal text-muted-foreground">· {g.durationYears} year{g.durationYears > 1 ? 's' : ''}</span>}
              </span>
              <span className="text-xs text-muted-foreground">{g.structures.length} variation{g.structures.length > 1 ? 's' : ''}</span>
            </button>

            {!isCollapsed && (
              <table className="w-full text-sm">
                <thead className="border-t border-b border-border">
                  <tr>
                    <th className="table-th w-10">
                      <HeaderCheckbox
                        checked={sel.isAllSelected(g.structures.map(fs => fs.id))}
                        onChange={() => sel.toggleAll(g.structures.map(fs => fs.id))} />
                    </th>
                    <th className="table-th">Variation</th>
                    <th className="table-th">Batch</th>
                    <th className="table-th">Per-Year</th>
                    <th className="table-th text-right">Course Total</th>
                    <th className="table-th text-center">Allocations</th>
                    <th className="table-th">Status</th>
                    <th className="table-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {g.structures.map(fs => (
                    <tr key={fs.id} className={sel.selected.has(fs.id) ? 'bg-blue-50/50' : ''}>
                      <td className="table-td">
                        <RowCheckbox checked={sel.selected.has(fs.id)} onChange={() => sel.toggle(fs.id)} />
                      </td>
                      <td className="table-td">
                        <p className="font-medium">{fs.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{fs.code}</p>
                      </td>
                      <td className="table-td text-muted-foreground">{fs.batch?.name ?? 'All batches'}</td>
                      <td className="table-td">
                        <div className="flex flex-wrap gap-1">
                          {fs.yearTotals.map(yt => (
                            <span key={yt.yearNumber} className="px-2 py-0.5 rounded-full bg-muted text-xs">
                              Y{yt.yearNumber}: {formatCurrency(yt.amount)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="table-td text-right font-semibold">{formatCurrency(fs.totalAmount)}</td>
                      <td className="table-td text-center">{fs.allocationCount}</td>
                      <td className="table-td">{fs.isActive ? 'Active' : 'Inactive'}</td>
                      <td className="table-td text-right space-x-3 whitespace-nowrap">
                        <button onClick={() => openEdit(fs)} className="text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => setCloning(fs)} className="text-foreground/70 hover:underline">Clone</button>
                        <button onClick={() => handleDelete(fs.id)} className="text-red-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}

      {showModal && <StructureModal s={s} editing={editing} onClose={closeModal} />}
      {cloning && <CloneStructureModal structure={cloning} onClose={() => setCloning(null)} />}
    </div>
  )
}
