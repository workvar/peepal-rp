'use client'

import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { StatRowSkeleton } from '@/components/ui/skeletons'
import { Skeleton } from '@/components/ui/skeleton'
import { PAYROLL_MONTHS } from '@/constants/payroll/months'
import { formatPayrollCurrency } from '@/functions/payroll/payrollFormatters'
import { currentYear } from './helpers'
import { usePayrollPage } from './usePayrollPage'
import PayrollTable from './PayrollTable'
import GeneratePayrollModal from './GeneratePayrollModal'
import MarkPaidModal from './MarkPaidModal'
import DetailDrawer from './DetailDrawer'
import BulkUploadButton from '@/components/ui/BulkUpload/BulkUploadButton'
import Can from '@/components/access/Can'
import { PAYMENT_MODES } from './helpers'

export default function PayrollPage() {
  const s = usePayrollPage()
  const { canManagePayroll, summary, summaryLoading, search, setSearch } = s

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payroll Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage employee salaries and payslips</p>
        </div>
        {canManagePayroll && (
          <div className="flex gap-2">
            <BulkUploadButton
              resource="payroll"
              onFinished={() => { s.setFilterMonth(0); s.refetch?.(); }}
              size="sm"
              dynamicOptions={{
                employee: {
                  options: s.employees.map((e) => ({
                    value: e.employeeId ?? e.id,
                    label: `${e.user?.name ?? 'Unknown'} (${e.employeeId ?? e.id})`,
                  })),
                  searchable: true,
                },
                payment_mode: PAYMENT_MODES.map((m) => ({
                  value: m.toLowerCase().replace(/ /g, '_'),
                  label: m,
                })),
              }}
            />
            <Can module="payroll" action="create">
              <button
                onClick={() => s.setShowGenModal(true)}
                className="btn-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                + Generate Payroll
              </button>
            </Can>
          </div>
        )}
      </div>

      {/* Filters */}
      {canManagePayroll && (
        <div className="flex gap-3 flex-wrap">
          <input
            className="flex-1 min-w-[200px] border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search employee, status…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            value={s.filterMonth}
            onChange={e => s.setFilterMonth(Number(e.target.value))}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>All months</option>
            {PAYROLL_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={s.filterYear}
            onChange={e => s.setFilterYear(Number(e.target.value))}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {/* Summary Cards (admin only) */}
      {canManagePayroll && summaryLoading && !summary && (
        <StatRowSkeleton count={4} />
      )}
      {canManagePayroll && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Gross', value: formatPayrollCurrency(summary.totalGross), color: 'blue' },
            { label: 'Total Net', value: formatPayrollCurrency(summary.totalNet), color: 'green' },
            { label: 'Total Deductions', value: formatPayrollCurrency(summary.totalDeductions), color: 'red' },
            { label: 'Employees', value: String(summary.totalEmployees), color: 'gray' },
          ].map(card => (
            <div key={card.label} className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-xl font-bold text-foreground mt-1">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Status summary chips */}
      {canManagePayroll && summaryLoading && !summary && (
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
      )}
      {canManagePayroll && summary && (
        <div className="flex gap-3 text-sm">
          <span className="px-3 py-1 bg-muted/60 text-foreground/80 rounded-full">{summary.draftCount} Draft</span>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">{summary.approvedCount} Approved</span>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">{summary.paidCount} Paid</span>
        </div>
      )}

      {!canManagePayroll && (
        <div>
          <input
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search period, status…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Payroll Table */}
      <PayrollTable s={s} />

      {/* Generate Payroll Modal */}
      {s.showGenModal && <GeneratePayrollModal s={s} />}

      {/* Mark Paid Modal */}
      {s.markPaidPayroll && <MarkPaidModal s={s} payroll={s.markPaidPayroll} />}

      <ConfirmDialog state={s.confirmState} onClose={() => s.setConfirmState(null)} />

      {/* Detail Drawer */}
      {s.drawerPayroll && (
        <DetailDrawer
          payroll={s.drawerPayroll}
          isAdmin={canManagePayroll}
          onClose={() => s.setDrawerPayrollId(null)}
        />
      )}
    </div>
  )
}
