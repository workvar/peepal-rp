'use client'

import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { LEAVE_REPORT } from '@/graphql/queries/reports'
import QueryError from '@/components/ui/QueryError'
import type { GqlStatusCount, GqlMonthCount, GqlDepartmentCount } from '@/types/pages/reports/page'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const STATUS_COLORS: Record<string, string> = {
  approved: 'bg-green-500',
  pending: 'bg-yellow-400',
  rejected: 'bg-red-500',
}

export default function LeaveReportPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear))

  const { data, loading, error, refetch } = useQuery(LEAVE_REPORT, { variables: { year } })
  const leaveReport = data?.leaveReport

  const monthly: GqlMonthCount[] = leaveReport?.monthlyTrend ?? []
  const statuses: GqlStatusCount[] = leaveReport?.statusBreakdown ?? []
  const departments: GqlDepartmentCount[] = leaveReport?.byDepartment ?? []
  const maxMonthCount = Math.max(...monthly.map((r) => r.count), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leave Report</h1>
        <p className="text-sm text-muted-foreground mt-1">Leave utilization and approval statistics</p>
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

      {/* Summary + Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs text-muted-foreground">Total Applications</p>
          <p className="text-3xl font-bold text-foreground mt-1">{leaveReport?.total ?? 0}</p>
          <p className="text-sm text-muted-foreground/70 mt-1">{leaveReport?.approved ?? 0} approved</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs text-muted-foreground mb-3">By Status</p>
          <div className="space-y-2">
            {statuses.map((s) => (
              <div key={s.status} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[s.status] || 'bg-gray-400'}`} />
                <span className="text-sm capitalize text-foreground/80 flex-1">{s.status}</span>
                <span className="text-sm font-semibold">{s.count}</span>
              </div>
            ))}
            {statuses.length === 0 && <p className="text-muted-foreground/70 text-sm">No data</p>}
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">Monthly Leave Applications</h3>
        {loading ? (
          <p className="text-muted-foreground/70 text-sm">Loading...</p>
        ) : monthly.length === 0 ? (
          <p className="text-muted-foreground/70 text-sm">No data for {year}</p>
        ) : (
          <div className="space-y-2">
            {monthly.map((row) => {
              const monthLabel = MONTHS[parseInt(row.month) - 1] || row.month
              return (
                <div key={row.month} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-8 shrink-0">{monthLabel}</span>
                  <div className="flex-1 bg-muted/60 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-orange-400 rounded-full transition-all"
                      style={{ width: `${(row.count / maxMonthCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-foreground/80 w-8 text-right shrink-0">{row.count}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* By Department */}
      {departments.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60">
            <h3 className="font-semibold text-foreground text-sm">Leaves by Department</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Applications</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {departments.map((d) => (
                <tr key={d.department} className="hover:bg-muted/40">
                  <td className="px-4 py-2.5 font-medium text-foreground">{d.department || '(No dept)'}</td>
                  <td className="px-4 py-2.5 text-right text-foreground/80 font-semibold">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
