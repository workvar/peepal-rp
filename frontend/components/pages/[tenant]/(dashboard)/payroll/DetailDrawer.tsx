'use client'

import { PAYROLL_MONTHS } from '@/constants/payroll/months'
import { formatPayrollCurrency } from '@/functions/payroll/payrollFormatters'
import type { GqlPayroll } from '@/types/pages/payroll/page'
import { formatShortDate } from './helpers'

// Right-hand slide-over showing the full breakdown of a single payroll record.
export default function DetailDrawer({
  payroll,
  isAdmin,
  onClose,
}: {
  payroll: GqlPayroll
  isAdmin: boolean
  onClose: () => void
}) {
  const emp = payroll.employee

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-card shadow-xl flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-base font-semibold text-foreground">Payroll Detail</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 flex-1">
          {/* Employee Section — admin only */}
          {isAdmin && emp && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Employee</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="text-foreground font-medium">{emp.user?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employee ID</span>
                  <span className="text-foreground">{emp.employeeId || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span className="text-foreground">{emp.department?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Designation</span>
                  <span className="text-foreground">{emp.designation || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="text-foreground">{emp.user?.email || '—'}</span>
                </div>
              </div>
            </section>
          )}

          {/* Pay Period */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pay Period</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Month / Year</span>
                <span className="text-foreground">{PAYROLL_MONTHS[payroll.month - 1]} {payroll.year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Template</span>
                <span className="text-foreground">{payroll.templateName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processed By</span>
                <span className="text-foreground">{payroll.processedBy || '—'}</span>
              </div>
            </div>
          </section>

          {/* Earnings */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Earnings</h3>
            <div className="space-y-1.5 text-sm">
              {([
                ['Basic Salary', payroll.basicSalary],
                ['HRA', payroll.hra],
                ['DA', payroll.da],
                ['TA', payroll.ta],
                ['Medical Allowance', payroll.medicalAllowance],
                ['Other Allowances', payroll.otherAllowances],
              ] as [string, number][]).map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground">{formatPayrollCurrency(val)}</span>
                </div>
              ))}
              {payroll.extraAllowance > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Extra Allowance</span>
                  <span className="text-foreground">{formatPayrollCurrency(payroll.extraAllowance)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 mt-1">
                <span className="font-semibold text-foreground">Gross Salary</span>
                <span className="font-semibold text-foreground">{formatPayrollCurrency(payroll.grossSalary)}</span>
              </div>
            </div>
          </section>

          {/* Deductions */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Deductions</h3>
            <div className="space-y-1.5 text-sm">
              {([
                ['Provident Fund (PF)', payroll.pf],
                ['ESI', payroll.esi],
                ['TDS', payroll.tds],
                ['Other Deductions', payroll.otherDeductions],
              ] as [string, number][]).map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-red-600">-{formatPayrollCurrency(val)}</span>
                </div>
              ))}
              {payroll.extraDeduction > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Extra Deduction</span>
                  <span className="text-red-600">-{formatPayrollCurrency(payroll.extraDeduction)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 mt-1">
                <span className="font-semibold text-foreground">Total Deductions</span>
                <span className="font-semibold text-red-600">-{formatPayrollCurrency(payroll.totalDeductions)}</span>
              </div>
            </div>
          </section>

          {/* Net Pay */}
          <section>
            <div className="bg-green-50 border border-green-200 rounded-lg px-5 py-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-green-800">Net Pay</span>
              <span className="text-2xl font-bold text-green-700">{formatPayrollCurrency(payroll.netSalary)}</span>
            </div>
          </section>

          {/* Attendance */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Attendance</h3>
            <div className="grid grid-cols-3 gap-3 text-sm text-center">
              {([
                ['Working Days', payroll.workingDays],
                ['Present Days', payroll.presentDays],
                ['Leave Days', payroll.leaveDays],
              ] as [string, number][]).map(([label, val]) => (
                <div key={label} className="bg-muted/40 rounded-lg py-3">
                  <p className="text-xl font-bold text-foreground">{val}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Payment — skip section if all empty */}
          {(payroll.paymentDate || payroll.paymentMode || payroll.notes) && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Payment</h3>
              <div className="space-y-1.5 text-sm">
                {payroll.paymentDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="text-foreground">{formatShortDate(payroll.paymentDate)}</span>
                  </div>
                )}
                {payroll.paymentMode && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mode</span>
                    <span className="text-foreground">{payroll.paymentMode}</span>
                  </div>
                )}
                {payroll.notes && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Notes</span>
                    <span className="text-foreground text-right">{payroll.notes}</span>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
