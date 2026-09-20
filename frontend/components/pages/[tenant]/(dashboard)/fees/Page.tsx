'use client'

// Fees module — tabbed UI driven by route, laid out like the Transport page:
// page header with per-tab actions (Bulk Upload + "+ New …"), a full-width
// search bar, underline tabs, then the active tab's table.
//
//   /fees/overview     → Overview: collection reports & analytics (staff/admin)
//   /fees/structures   → Structures: course base plans, grouped by course
//   /fees/allocations  → Allocations: installment plans (one-time/yearly/semester)
//   /fees/addons       → Add-ons: optional facility charges attached per student
//   /fees/payments     → Payments (admin/staff record + history; students see their fees)
//   /fees/students     → Student Fees: materialized records with installments & discounts
//   /fees/categories   → Categories: master fee codes

import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import Header from '@/components/layout/Header'
import Can from '@/components/access/Can'
import { BulkUploadButton } from '@/components/ui/BulkUpload'
import type { DynamicFieldConfig } from '@/components/ui/BulkUpload/EditableTable'
import type { FeesTab } from "@/types/pages/fees/page"
import { useFeesPage } from './useFeesPage'
import OverviewTab from './OverviewTab'
import PaymentsTab from './PaymentsTab'
import StudentFeesTab from './StudentFeesTab'
import AllocationsTab from './AllocationsTab'
import AddOnsTab from './AddOnsTab'
import StructuresTab from './StructuresTab'
import CategoriesTab from './CategoriesTab'

interface Props {
  initialTab: FeesTab
  /** Reveal long tables incrementally on scroll. Default true. */
  lazyLoad?: boolean
}

const TAB_LABELS: Record<FeesTab, string> = {
  overview: 'Overview',
  structures: 'Structures',
  allocations: 'Allocations',
  addons: 'Add-ons',
  payments: 'Payments',
  students: 'Student Fees',
  categories: 'Categories',
}

// Per-tab header config: bulk upload resource, create button label, search.
const TAB_META: Record<FeesTab, { bulk?: string; create?: string; search?: string }> = {
  overview: {},
  structures: { bulk: 'fee_structures', create: 'New Structure', search: 'Search courses, plans, codes…' },
  allocations: { bulk: 'fee_allocations', create: 'New Allocation', search: 'Search allocations, courses, targets…' },
  addons: { bulk: 'fee_addons', create: 'New Add-on', search: 'Search add-ons…' },
  payments: { bulk: 'fee_payments', create: 'Record Payment', search: 'Search receipts, students, allocations…' },
  students: { search: 'Search by student, roll number, allocation, status…' },
  categories: { bulk: 'fee_categories', create: 'New Category', search: 'Search categories…' },
}

export default function FeesPage({ initialTab, lazyLoad = true }: Props) {
  const s = useFeesPage(initialTab, lazyLoad)
  const { isAdmin, isStaff, isStudent, tab } = s

  // Tabs follow the setup order: define Categories first, then Add-ons,
  // build Structures, apply Allocations, then day-to-day collection views.
  const tabs: FeesTab[] = isAdmin
    ? ['categories', 'addons', 'structures', 'allocations', 'payments', 'students', 'overview']
    : isStaff ? ['payments', 'students', 'overview'] : ['payments']

  const meta = TAB_META[tab]
  const canAct = tab === 'payments' ? isStaff : isAdmin

  // Dynamic options for fee_payments bulk upload.
  // Derives student list and per-student allocations from already-loaded studentFees.
  const feePaymentBulkOpts = useMemo(() => {
    // Deduplicate students by roll number.
    const studentMap = new Map<string, { name: string; rollNumber: string }>()
    for (const sf of s.studentFees) {
      const st = sf.student
      if (!st?.rollNumber) continue
      if (!studentMap.has(st.rollNumber)) {
        studentMap.set(st.rollNumber, {
          name: st.user?.name ?? st.rollNumber,
          rollNumber: st.rollNumber,
        })
      }
    }
    const studentList = Array.from(studentMap.values()).sort((a, b) =>
      a.rollNumber.localeCompare(b.rollNumber)
    )

    // roll_number: searchable; on select, auto-fill allocation when student has exactly one.
    // strict: a roll number that isn't among students with a fee record shows red
    // (a payment needs an existing fee), and matched values normalize to the roll number.
    const rollNumberConfig: DynamicFieldConfig = {
      options: studentList.map(st => ({
        value: st.rollNumber,
        label: `${st.name} (${st.rollNumber})`,
      })),
      searchable: true,
      strict: true,
      onRowChange: (rollNumber) => {
        const allocs = s.studentFees.filter(sf => sf.student?.rollNumber === rollNumber)
        return {
          allocation: allocs.length === 1 ? (allocs[0].feeAllocation?.name ?? '') : '',
        }
      },
    }

    // allocation: searchable; options filtered to the selected student's fees.
    // strict: a non-blank allocation that isn't one of that student's fees shows red.
    // It may still be left blank when the student has a single fee (handled by the backend).
    const allocationConfig: DynamicFieldConfig = {
      options: (row) => {
        const rollNumber = row.roll_number
        const matchingFees = rollNumber
          ? s.studentFees.filter(sf => sf.student?.rollNumber === rollNumber)
          : s.studentFees
        return matchingFees
          .filter(sf => sf.feeAllocation?.name)
          .map(sf => ({
            value: sf.feeAllocation!.name,
            label: sf.feeAllocation!.name,
          }))
      },
      searchable: true,
      strict: true,
    }

    return {
      roll_number: rollNumberConfig,
      allocation: allocationConfig,
    }
  }, [s.studentFees])

  // Dynamic options for fee_allocations bulk upload: pick the fee structure
  // from a searchable dropdown instead of typing its code. Active structures
  // only, since the backend rejects inactive ones. The stored value is the
  // structure code (what the CSV template uses); falls back to the id.
  //
  // `strict` flags any uploaded value that doesn't resolve to a real structure
  // as a red cell. The label leads with the name and ends with "(code)" so an
  // uploaded CSV resolves whether it holds the code (any case) or the name; a
  // match is normalized to the code, anything else is rejected.
  const feeAllocationBulkOpts = useMemo(() => {
    const structureConfig: DynamicFieldConfig = {
      options: s.structures
        .filter(st => st.isActive)
        .map(st => ({
          value: st.code || st.id,
          label: st.course
            ? `${st.name} - ${st.course.name} (${st.code})`
            : `${st.name} (${st.code})`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      searchable: true,
      strict: true,
    }
    return { structure: structureConfig }
  }, [s.structures])

  return (
    <div>
      <Header
        title="Fee Management"
        subtitle={isStudent ? 'Your fees, installments, and payments' : 'Course fee structures, payment plans, and collections'}
        action={
          canAct && !isStudent && (
            <div className="flex items-center gap-2">
              {meta.bulk && (
                <BulkUploadButton
                  resource={meta.bulk}
                  onFinished={(r) => { if (r.successful > 0) s.refetchAll() }}
                  dynamicOptions={
                    meta.bulk === 'fee_payments' ? feePaymentBulkOpts
                    : meta.bulk === 'fee_allocations' ? feeAllocationBulkOpts
                    : undefined
                  }
                />
              )}
              {meta.create && (
                <Can module="fees" action="create">
                  <button className="btn-primary flex items-center gap-2" onClick={() => s.setCreateOpen(true)}>
                    <Plus size={16} /> {meta.create}
                  </button>
                </Can>
              )}
            </div>
          )
        }
      />

      {/* Search */}
      {isStaff && meta.search && (
        <div className="mb-4">
          <input className="input-field w-full" placeholder={meta.search}
            value={s.search} onChange={e => s.setSearch(e.target.value)} />
        </div>
      )}

      {/* Tabs */}
      {isStaff && (
        <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto">
          {tabs.map(t => (
            <button key={t} onClick={() => s.switchTab(t)}
              className={`px-4 py-2 font-medium text-sm transition whitespace-nowrap ${
                tab === t
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {tab === 'overview' && isStaff && <OverviewTab s={s} />}
      {tab === 'structures' && isAdmin && <StructuresTab s={s} />}
      {tab === 'allocations' && isAdmin && <AllocationsTab s={s} />}
      {tab === 'addons' && isAdmin && <AddOnsTab s={s} />}
      {(tab === 'payments' || isStudent) && <PaymentsTab s={s} />}
      {tab === 'students' && isStaff && <StudentFeesTab s={s} />}
      {tab === 'categories' && isAdmin && <CategoriesTab s={s} />}
    </div>
  )
}
