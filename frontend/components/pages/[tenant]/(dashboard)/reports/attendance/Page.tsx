'use client'

import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { ATTENDANCE_REPORT } from '@/graphql/queries/reports'
import QueryError from '@/components/ui/QueryError'
import type { GqlAttendanceDailyRow } from '@/types/pages/reports/page'
import { useTerminology, useTenantType } from '@/store/hooks/useTerminology'
import { moduleAllowedForIndustry } from '@/lib/access'

export default function AttendanceReportPage() {
  const today = new Date()
  const monthAgo = new Date(today)
  monthAgo.setMonth(monthAgo.getMonth() - 1)

  const terms = useTerminology()
  const tenantType = useTenantType()
  // Only education tracks attendance for the member population; elsewhere the
  // report is employee-only, so the filter collapses to a single choice.
  const hasMembers = moduleAllowedForIndustry('students', tenantType)

  const [fromDate, setFromDate] = useState(monthAgo.toISOString().slice(0, 10))
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10))
  const [entityType, setEntityType] = useState(hasMembers ? 'student' : 'employee')

  const { data, loading, error, refetch } = useQuery(ATTENDANCE_REPORT, {
    variables: { fromDate, toDate, entityType },
  })

  const daily: GqlAttendanceDailyRow[] = data?.attendanceReport?.daily ?? []
  const totalPresent = daily.reduce((s, r) => s + r.present, 0)
  const totalAbsent = daily.reduce((s, r) => s + r.absent, 0)
  const overallTotal = daily.reduce((s, r) => s + r.total, 0)
  const attendancePct = overallTotal > 0 ? Math.round((totalPresent / overallTotal) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{terms.attendance} Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Daily {terms.attendance.toLowerCase()} trends over a date range
        </p>
      </div>

      {error && <QueryError message={error.message} onRetry={() => void refetch()} />}

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">From Date</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">To Date</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {hasMembers && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
            <select value={entityType} onChange={e => setEntityType(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="student">{terms.member_plural}</option>
              <option value="employee">Employees</option>
            </select>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: overallTotal, color: 'text-foreground' },
          { label: 'Present', value: totalPresent, color: 'text-green-600' },
          { label: 'Absent', value: totalAbsent, color: 'text-red-600' },
          { label: 'Attendance %', value: `${attendancePct}%`, color: attendancePct >= 75 ? 'text-green-600' : 'text-red-600' },
        ].map(c => (
          <div key={c.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Daily Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60">
          <h3 className="font-semibold text-foreground text-sm">Daily Breakdown</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground/70">Loading...</div>
        ) : daily.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground/70">No data for selected range</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Present</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Absent</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Late</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {daily.map((row) => {
                const pct = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0
                return (
                  <tr key={row.date} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5 text-foreground/80">{new Date(row.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                    <td className="px-4 py-2.5 text-center text-green-600 font-medium">{row.present}</td>
                    <td className="px-4 py-2.5 text-center text-red-500">{row.absent}</td>
                    <td className="px-4 py-2.5 text-center text-orange-500">{row.late}</td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">{row.total}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`font-semibold ${pct >= 75 ? 'text-green-600' : pct >= 60 ? 'text-orange-500' : 'text-red-600'}`}>{pct}%</span>
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
