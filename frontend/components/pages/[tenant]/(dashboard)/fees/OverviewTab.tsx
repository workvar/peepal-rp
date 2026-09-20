'use client'

// Overview: reports & analytics. Headline collection totals, per-course
// collection, payment modes, monthly trend, and recent payments — served by
// the single feeOverview GraphQL query (staff/admin only).

import { useMemo } from 'react'
import { formatCurrency } from '@/functions/fees/feeFormatters'
import type { FeesPageState } from './useFeesPage'
import { studentFeeStatusBuckets } from './overviewStats'

const STATUS_BAR: Record<string, string> = {
  paid: 'bg-green-500',
  partial: 'bg-amber-500',
  pending: 'bg-gray-400',
  cancelled: 'bg-red-500',
}

export default function OverviewTab({ s }: { s: FeesPageState }) {
  const summary = s.overview?.summary
  const byCourse = s.overview?.byCourse ?? []
  const byMode = s.overview?.byMode ?? []
  const byMonth = s.overview?.byMonth ?? []
  const recent = s.overview?.recentPayments ?? []

  const collectionRate =
    summary && summary.totalExpected > 0
      ? Math.round((summary.totalCollected / summary.totalExpected) * 100)
      : 0

  const statusBuckets = useMemo(() => studentFeeStatusBuckets(s.studentFees), [s.studentFees])
  const totalFees = s.studentFees.length
  const maxMode = Math.max(1, ...byMode.map(m => m.amount))
  const maxMonth = Math.max(1, ...byMonth.map(m => m.amount))

  const cards = [
    { label: 'Total Collected', value: formatCurrency(summary?.totalCollected ?? 0), sub: `${summary?.paymentCount ?? 0} payments` },
    { label: 'Total Expected', value: formatCurrency(summary?.totalExpected ?? 0), sub: 'net across student fees' },
    { label: 'Pending Dues', value: formatCurrency(summary?.pendingDues ?? 0), sub: 'outstanding balance' },
    { label: 'Collection Rate', value: `${collectionRate}%`, sub: 'of expected fees' },
  ]

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{c.value}</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Collection progress */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-foreground">Collection Progress</p>
          <p className="text-xs text-muted-foreground">{collectionRate}% collected</p>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${collectionRate}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Collected {formatCurrency(summary?.totalCollected ?? 0)}</span>
          <span>Pending {formatCurrency(summary?.pendingDues ?? 0)}</span>
        </div>
      </div>

      {/* Collection by course */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium text-foreground">Collection by Course</p>
        </div>
        {byCourse.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No student fees yet. Create an allocation to generate fee records.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="table-th">Course</th>
                <th className="table-th text-right">Students</th>
                <th className="table-th text-right">Expected</th>
                <th className="table-th text-right">Collected</th>
                <th className="table-th text-right">Pending</th>
                <th className="table-th w-40">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byCourse.map(c => {
                const pct = c.expected > 0 ? Math.round((c.collected / c.expected) * 100) : 0
                return (
                  <tr key={c.courseId}>
                    <td className="table-td font-medium">{c.courseName}</td>
                    <td className="table-td text-right">{c.studentCount}</td>
                    <td className="table-td text-right">{formatCurrency(c.expected)}</td>
                    <td className="table-td text-right">{formatCurrency(c.collected)}</td>
                    <td className="table-td text-right text-amber-700">{formatCurrency(c.pending)}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-9 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Student fees by status */}
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm font-medium text-foreground mb-3">Student Fees by Status</p>
          {totalFees === 0 ? (
            <p className="text-sm text-muted-foreground">No student fees yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
                {statusBuckets.map(b => (
                  <div key={b.status} className={STATUS_BAR[b.status] ?? 'bg-gray-400'}
                    style={{ width: `${(b.count / totalFees) * 100}%` }} />
                ))}
              </div>
              {statusBuckets.map(b => (
                <div key={b.status} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${STATUS_BAR[b.status] ?? 'bg-gray-400'}`} />
                    <span className="capitalize">{b.status}</span>
                    <span className="text-muted-foreground">· {b.count}</span>
                  </span>
                  <span className="font-medium">{formatCurrency(b.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payments by mode */}
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm font-medium text-foreground mb-3">Payments by Mode</p>
          {byMode.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {byMode.map(m => (
                <div key={m.mode}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="capitalize">{m.mode} <span className="text-muted-foreground">· {m.count}</span></span>
                    <span className="font-medium">{formatCurrency(m.amount)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(m.amount / maxMode) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Monthly trend */}
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm font-medium text-foreground mb-3">Monthly Collection</p>
          {byMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="flex items-end gap-2 h-36">
              {byMonth.slice(-12).map(m => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1" title={`${m.month}: ${formatCurrency(m.amount)} (${m.count} payments)`}>
                  <div className="w-full rounded-t bg-blue-500/80 hover:bg-blue-600 transition-colors"
                    style={{ height: `${Math.max(4, (m.amount / maxMonth) * 100)}%` }} />
                  <span className="text-[10px] text-muted-foreground rotate-0 whitespace-nowrap">{m.month.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm font-medium text-foreground mb-3">Recent Payments</p>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recent.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b border-border/60 pb-2 last:border-0">
                  <span>
                    <span className="font-medium">{p.student?.user?.name ?? p.student?.rollNumber ?? '—'}</span>
                    <span className="block text-xs text-muted-foreground">{p.paymentDate} · {p.receiptNumber}</span>
                  </span>
                  <span className="font-semibold">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
