'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useAppSelector } from '@/store/hooks'
import {
  DELETE_PAYROLL,
  GENERATE_PAYROLL,
  LIST_EMPLOYEES,
  LIST_PAYROLLS,
  LIST_SALARY_STRUCTURES,
  MY_PAYROLLS,
  PAYROLL_SUMMARY,
  UPDATE_PAYROLL_STATUS,
} from '@/queries/pages/payroll/payroll'
import { type ConfirmState } from '@/components/ui/ConfirmDialog'
import { PAYROLL_MONTHS } from '@/constants/payroll/months'
import { downloadPayslipAsPDF } from '@/functions/payroll/downloadPayslip'
import type { GqlPayroll, GqlPayrollSummary } from '@/types/pages/payroll/page'
import toast from 'react-hot-toast'
import { currentMonth, currentYear, type PayrollEmployeeOption } from './helpers'

// All payroll page state, queries, and mutation handlers; the page and its
// table/modal components consume this hook.
export function usePayrollPage() {
  // auth stays Redux — migrated to GraphQL in Batch 9
  const { user } = useAppSelector((s) => s.auth)
  const canManagePayroll = user?.role === 'admin' || user?.role === 'super_admin'
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const [filterMonth, setFilterMonth] = useState(currentMonth)
  const [filterYear, setFilterYear] = useState(currentYear)
  const [showGenModal, setShowGenModal] = useState(false)
  const [genForm, setGenForm] = useState({
    employee_id: '', month: currentMonth, year: currentYear,
    working_days: 26, present_days: 26, leave_days: 0, notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Detail drawer state — holds only the ID; displayed payroll is derived from live cache
  const [drawerPayrollId, setDrawerPayrollId] = useState<string | null>(null)

  // Mark Paid modal state
  const [markPaidPayroll, setMarkPaidPayroll] = useState<GqlPayroll | null>(null)
  const [markPaidForm, setMarkPaidForm] = useState({
    paymentMode: '',
    paymentDate: new Date().toISOString().slice(0, 10), // YYYY-MM-DD for date input
  })

  // filterMonth === 0 means "all months" — pass undefined so the backend skips that filter.
  const { data: payrollData, loading: payrollLoading, refetch: refetchPayrolls } = useQuery(LIST_PAYROLLS, {
    variables: {
      month: filterMonth === 0 ? undefined : filterMonth,
      year: filterYear,
    },
    skip: !canManagePayroll,
  })
  const { data: myPayrollData, loading: myPayrollLoading } = useQuery(MY_PAYROLLS, {
    skip: canManagePayroll,
  })
  const { data: summaryData, loading: summaryLoading } = useQuery(PAYROLL_SUMMARY, {
    variables: { month: filterMonth, year: filterYear },
    skip: !canManagePayroll,
  })
  const { data: ssData } = useQuery(LIST_SALARY_STRUCTURES, { skip: !canManagePayroll })
  const { data: empData } = useQuery(LIST_EMPLOYEES, { skip: !canManagePayroll })

  const payrolls: GqlPayroll[] = payrollData?.payrolls ?? []
  const myPayrolls: GqlPayroll[] = myPayrollData?.myPayrolls ?? []
  const salaryStructures: Array<{ employeeId: string; isActive: boolean }> = ssData?.salaryStructures ?? []
  const employees: PayrollEmployeeOption[] = empData?.employees ?? []
  const summary: GqlPayrollSummary | null = summaryData?.payrollSummary ?? null
  const loading = canManagePayroll ? payrollLoading : myPayrollLoading
  const displayPayrolls = canManagePayroll ? payrolls : myPayrolls

  const drawerPayroll = drawerPayrollId
    ? (displayPayrolls.find(p => p.id === drawerPayrollId) ?? null)
    : null

  const [generatePayrollMut] = useMutation(GENERATE_PAYROLL)
  const [updatePayrollStatusMut] = useMutation(UPDATE_PAYROLL_STATUS)
  const [deletePayrollMut] = useMutation(DELETE_PAYROLL)

  const filteredPayrolls = search
    ? displayPayrolls.filter(p => {
      const period = `${PAYROLL_MONTHS[p.month - 1]} ${p.year}`
      return [
        p.employee?.user?.name,
        p.employee?.employeeId,
        p.employee?.department?.name,
        p.status,
        period,
      ].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase()))
    })
    : displayPayrolls

  const activeStructureEmployeeIds = new Set(
    salaryStructures.filter(structure => structure.isActive).map(structure => structure.employeeId)
  )
  const payrollEligibleEmployees = employees.filter((emp) => activeStructureEmployeeIds.has(emp.id))

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!activeStructureEmployeeIds.has(genForm.employee_id)) {
      toast.error('Assign a salary template to this employee before generating payroll')
      return
    }
    // Snap the list's filter to the month/year we just generated for so the new
    // record actually shows up in the table (otherwise the user sees an empty or
    // stale list because the refetch hits a different month/year bucket).
    const generatedMonth = genForm.month
    const generatedYear = genForm.year
    setFilterMonth(generatedMonth)
    setFilterYear(generatedYear)
    setSubmitting(true)
    try {
      await generatePayrollMut({
        variables: {
          input: {
            employeeId: genForm.employee_id,
            month: generatedMonth,
            year: generatedYear,
            workingDays: genForm.working_days,
            presentDays: genForm.present_days,
            leaveDays: genForm.leave_days,
            notes: genForm.notes,
          },
        },
        refetchQueries: [
          { query: LIST_PAYROLLS, variables: { month: generatedMonth, year: generatedYear } },
          { query: PAYROLL_SUMMARY, variables: { month: generatedMonth, year: generatedYear } },
        ],
        awaitRefetchQueries: true,
      })
      setShowGenModal(false)
      setGenForm({ employee_id: '', month: currentMonth, year: currentYear, working_days: 26, present_days: 26, leave_days: 0, notes: '' })
      toast.success('Payroll generated successfully')
    } catch (err) {
      const e2 = err as { message?: string }
      toast.error(typeof err === 'string' ? err : (e2?.message ?? 'Failed to generate payroll'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApprove(id: string) {
    setStatusUpdatingId(id)
    try {
      await updatePayrollStatusMut({
        variables: {
          id,
          input: { status: 'approved' },
        },
        refetchQueries: [
          { query: LIST_PAYROLLS, variables: { month: filterMonth === 0 ? undefined : filterMonth, year: filterYear } },
        ],
      })
      toast.success('Payroll approved')
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Failed to approve payroll')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  function openMarkPaidModal(p: GqlPayroll) {
    setMarkPaidPayroll(p)
    setMarkPaidForm({
      paymentMode: '',
      paymentDate: new Date().toISOString().slice(0, 10),
    })
  }

  async function handleMarkPaidConfirm() {
    if (!markPaidPayroll || !markPaidForm.paymentMode) return
    setStatusUpdatingId(markPaidPayroll.id)
    try {
      await updatePayrollStatusMut({
        variables: {
          id: markPaidPayroll.id,
          input: {
            status: 'paid',
            // Send the date exactly as the <input type="date"> produced it
            // (YYYY-MM-DD). Wrapping it as "T00:00:00.000Z" broke the
            // backend's date parser, which is why Paid On was blank.
            paymentDate: markPaidForm.paymentDate,
            paymentMode: markPaidForm.paymentMode,
          },
        },
        refetchQueries: [
          { query: LIST_PAYROLLS, variables: { month: filterMonth === 0 ? undefined : filterMonth, year: filterYear } },
        ],
      })
      toast.success('Payroll marked as paid')
      setMarkPaidPayroll(null)
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Failed to mark payroll as paid')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  async function handleDelete(id: string) {
    setConfirmState({
      title: "Delete Payroll Record",
      message: "This payroll record will be permanently removed. This cannot be undone.",
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        const qVars = { month: filterMonth === 0 ? undefined : filterMonth, year: filterYear }
        await deletePayrollMut({
          variables: { id },
          refetchQueries: [
            { query: LIST_PAYROLLS, variables: qVars },
            { query: PAYROLL_SUMMARY, variables: qVars },
          ],
        })
        toast.success("Payroll record deleted")
      },
    })
  }

  // Selectable rows are those with status === 'draft' (not yet approved or paid).
  const selectableIds = new Set(filteredPayrolls.filter(p => p.status === 'draft').map(p => p.id))

  function toggleSelectId(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds(prev =>
      prev.size === selectableIds.size
        ? new Set()
        : new Set(selectableIds)
    )
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setConfirmState({
      title: `Delete ${ids.length} Payroll Record${ids.length > 1 ? 's' : ''}`,
      message: `${ids.length} draft payroll record${ids.length > 1 ? 's' : ''} will be permanently removed. This cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete All',
      onConfirm: async () => {
        await Promise.all(ids.map(id => deletePayrollMut({ variables: { id } })))
        await refetchPayrolls({ month: filterMonth === 0 ? undefined : filterMonth, year: filterYear })
        setSelectedIds(new Set())
        toast.success(`Deleted ${ids.length} payroll record${ids.length > 1 ? 's' : ''}`)
      },
    })
  }

  async function handleDownloadPayslip(p: GqlPayroll) {
    setDownloadingId(p.id)
    try {
      await downloadPayslipAsPDF(p)
    } catch (err) {
      // Backend returns a JSON error in the blob body on failure — try to surface it.
      const e2 = err as { response?: { data?: unknown }; message?: string }
      let message = "Failed to download payslip"
      const blob = e2?.response?.data
      if (blob instanceof Blob) {
        try {
          const text = await blob.text()
          const parsed = JSON.parse(text)
          if (parsed?.error) message = parsed.error
        } catch {
          // fall through to default message
        }
      } else if (e2?.message) {
        message = e2.message
      }
      toast.error(message)
    } finally {
      setDownloadingId(null)
    }
  }

  return {
    canManagePayroll, downloadingId, filterMonth, setFilterMonth, filterYear, setFilterYear,
    showGenModal, setShowGenModal, genForm, setGenForm, submitting, statusUpdatingId,
    confirmState, setConfirmState, search, setSearch, setDrawerPayrollId,
    markPaidPayroll, setMarkPaidPayroll, markPaidForm, setMarkPaidForm,
    summary, summaryLoading, loading, displayPayrolls, drawerPayroll, filteredPayrolls,
    employees, payrollEligibleEmployees,
    handleGenerate, handleApprove, openMarkPaidModal, handleMarkPaidConfirm,
    handleDelete, handleDownloadPayslip, handleBulkDelete,
    selectedIds, selectableIds, toggleSelectId, toggleSelectAll,
    refetch: refetchPayrolls,
  }
}

export type PayrollPageState = ReturnType<typeof usePayrollPage>
