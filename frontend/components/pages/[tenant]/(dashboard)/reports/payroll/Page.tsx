'use client'

import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { PAYROLL_REPORT } from '@/graphql/queries/reports'
import QueryError from '@/components/ui/QueryError'
import type { GqlPayrollMonthRow } from '@/types/pages/reports/page'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function PayrollReportPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear))

  const { data, loading, error, refetch } = useQuery(PAYROLL_REPORT, { variables: { year } })
  const payrollReport = data?.payrollReport

  const monthly: GqlPayrollMonthRow[] = payrollReport?.monthlyTrend ?? []
  const maxNet = Math.max(...monthly.map((r) => r.netSalary), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payroll Report</h1>
        <p className="text-sm text-muted-foreground mt-1">Annual payroll summary and monthly breakdown</p>
      </div>

      {error && <QueryError message={error.message} onRetry={() => void refetch()} />}

      {/* Filter */}
      <div className="bg-card rounded-xl border border-border p-4 flex gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Year</label>
          <select value={year} onChange={e => setYear(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs text-muted-foreground">Annual Gross</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(payrollReport?.totalGross ?? 0)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs text-muted-foreground">Annual Net Payout</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(payrollReport?.totalNet ?? 0)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs text-muted-foreground">Employees on Payroll</p>
          <p className="text-2xl font-bold text-foreground mt-1">{payrollReport?.totalEmployees ?? 0}</p>
        </div>
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">Monthly Net Salary Trend</h3>
        {loading ? (
          <p className="text-muted-foreground/70 text-sm">Loading...</p>
        ) : monthly.length === 0 ? (
          <p className="text-muted-foreground/70 text-sm">No payroll data for {year}</p>
        ) : (
          <div className="space-y-2">
            {monthly.map((row) => {
              const monthLabel = MONTHS[parseInt(row.month) - 1] || row.month
              return (
                <div key={row.month} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-8 shrink-0">{monthLabel}</span>
                  <div className="flex-1 bg-muted/60 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${(row.netSalary / maxNet) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-foreground/80 w-24 text-right shrink-0">{formatCurrency(row.netSalary)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Monthly Detail Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60">
          <h3 className="font-semibold text-foreground text-sm">Monthly Breakdown</h3>
        </div>
        {monthly.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground/70">No data available</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Month</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Gross</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Deductions</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Employees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {monthly.map((row) => (
                <tr key={row.month} className="hover:bg-muted/40">
                  <td className="px-4 py-2.5 font-medium text-foreground">{MONTHS[parseInt(row.month) - 1]} {year}</td>
                  <td className="px-4 py-2.5 text-right text-foreground/80">{formatCurrency(row.grossSalary)}</td>
                  <td className="px-4 py-2.5 text-right text-red-500">-{formatCurrency(row.totalDeductions)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-700">{formatCurrency(row.netSalary)}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{row.employeeCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
