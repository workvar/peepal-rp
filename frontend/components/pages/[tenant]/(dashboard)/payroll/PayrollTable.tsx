'use client'

import { Trash2 } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/skeletons'
import { PAYROLL_MONTHS } from '@/constants/payroll/months'
import { formatPayrollCurrency } from '@/functions/payroll/payrollFormatters'
import { StatusBadge, formatShortDate } from './helpers'
import type { PayrollPageState } from './usePayrollPage'

// Payroll list table with status-dependent row actions
// (View / Approve / Mark Paid / PDF / Delete).
// Draft rows support bulk checkbox selection for bulk delete.
export default function PayrollTable({ s }: { s: PayrollPageState }) {
  const {
    canManagePayroll, loading, displayPayrolls, filteredPayrolls,
    statusUpdatingId, downloadingId,
    selectedIds, selectableIds, toggleSelectId, toggleSelectAll, handleBulkDelete,
  } = s

  if (loading && displayPayrolls.length === 0) {
    return (
      <TableSkeleton
        columns={
          canManagePayroll
            ? ['', 'Employee', 'Period', 'Template', 'Gross', 'Deductions', 'Net Pay', 'Paid On', 'Status', 'Actions']
            : ['Period', 'Template', 'Gross', 'Deductions', 'Net Pay', 'Paid On', 'Status', 'Actions']
        }
        rows={6}
        colWidths={
          canManagePayroll
            ? ['w-8', 'w-32', 'w-24', 'w-28', 'w-20', 'w-20', 'w-20', 'w-24', 'w-16', 'w-28']
            : ['w-24', 'w-28', 'w-20', 'w-20', 'w-20', 'w-24', 'w-16', 'w-28']
        }
      />
    )
  }

  const allSelectableChecked = selectableIds.size > 0 && selectedIds.size === selectableIds.size
  const someSelected = selectedIds.size > 0 && !allSelectableChecked

  return (
    <div className="space-y-2">
      {/* Bulk action bar */}
      {canManagePayroll && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm">
          <span className="text-red-700 font-medium">{selectedIds.size} draft record{selectedIds.size > 1 ? 's' : ''} selected</span>
          <button
            onClick={() => void handleBulkDelete()}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 transition-colors"
          >
            <Trash2 size={12} /> Delete Selected
          </button>
          <button
            onClick={() => toggleSelectAll()}
            className="text-xs text-red-600 hover:underline ml-auto"
          >Clear selection</button>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {filteredPayrolls.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground/70">No payroll records found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                {canManagePayroll && (
                  <th className="px-3 py-3 w-8">
                    {selectableIds.size > 0 && (
                      <input
                        type="checkbox"
                        checked={allSelectableChecked}
                        ref={(el) => { if (el) el.indeterminate = someSelected }}
                        onChange={toggleSelectAll}
                        className="cursor-pointer accent-primary"
                        title="Select all draft records"
                      />
                    )}
                  </th>
                )}
                {canManagePayroll && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>}
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Template</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Gross</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Deductions</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net Pay</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paid On</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredPayrolls.map(p => {
                const isSelectable = canManagePayroll && p.status === 'draft'
                const isChecked = selectedIds.has(p.id)
                return (
                  <tr key={p.id} className={`hover:bg-muted/40 ${isChecked ? 'bg-red-50/40' : ''}`}>
                    {canManagePayroll && (
                      <td className="px-3 py-3 w-8">
                        {isSelectable && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectId(p.id)}
                            className="cursor-pointer accent-primary"
                          />
                        )}
                      </td>
                    )}
                    {canManagePayroll && (
                      <td className="px-4 py-3 font-medium text-foreground">
                        {p.employee?.user?.name || '—'}
                        <div className="text-xs text-muted-foreground/70">
                          {p.employee?.employeeId ? `${p.employee.employeeId} · ` : ''}{p.employee?.department?.name || ''}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-foreground/80">{PAYROLL_MONTHS[p.month - 1]} {p.year}</td>
                    <td className="px-4 py-3 text-foreground/80">{p.templateName || '—'}</td>
                    <td className="px-4 py-3 text-right text-foreground/80">{formatPayrollCurrency(p.grossSalary)}</td>
                    <td className="px-4 py-3 text-right text-red-600">-{formatPayrollCurrency(p.totalDeductions)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{formatPayrollCurrency(p.netSalary)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatShortDate(p.paymentDate)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* View — all users, all statuses */}
                        <button
                          onClick={() => s.setDrawerPayrollId(p.id)}
                          className="text-xs text-foreground/70 hover:underline"
                        >View</button>
                        {/* Approve — admin, draft */}
                        {canManagePayroll && p.status === 'draft' && (
                          <button
                            onClick={() => s.handleApprove(p.id)}
                            disabled={statusUpdatingId === p.id}
                            className="text-xs text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          >{statusUpdatingId === p.id ? 'Updating...' : 'Approve'}</button>
                        )}
                        {/* Mark Paid — admin, approved → opens modal */}
                        {canManagePayroll && p.status === 'approved' && (
                          <button
                            onClick={() => s.openMarkPaidModal(p)}
                            disabled={statusUpdatingId === p.id}
                            className="text-xs text-green-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          >{statusUpdatingId === p.id ? 'Updating...' : 'Mark Paid'}</button>
                        )}
                        {/* PDF — all users, paid */}
                        {p.status === 'paid' && (
                          <button
                            onClick={() => s.handleDownloadPayslip(p)}
                            disabled={downloadingId === p.id}
                            className="text-xs text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            title="Download this payslip as a PDF"
                          >{downloadingId === p.id ? 'Downloading…' : 'PDF'}</button>
                        )}
                        {/* Delete — admin, not paid */}
                        {canManagePayroll && p.status !== 'paid' && (
                          <button
                            onClick={() => s.handleDelete(p.id)}
                            className="text-xs text-red-500 hover:underline"
                          >Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
