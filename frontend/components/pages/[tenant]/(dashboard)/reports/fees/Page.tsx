'use client'

import { useQuery } from '@apollo/client'
import { FEE_REPORT } from '@/graphql/queries/reports'
import QueryError from '@/components/ui/QueryError'
import type { GqlFeeMonthRow, GqlFeeModeRow, GqlFeePlanRow } from '@/types/pages/reports/page'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export default function FeeReportPage() {
  const { data, loading, error, refetch } = useQuery(FEE_REPORT)
  const feeReport = data?.feeReport

  const monthly: GqlFeeMonthRow[] = feeReport?.monthlyTrend ?? []
  const modes: GqlFeeModeRow[] = feeReport?.byPaymentMode ?? []
  const plans: GqlFeePlanRow[] = feeReport?.byPlan ?? []
  const maxMonthAmount = Math.max(...monthly.map((r) => r.amount), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fee Collection Report</h1>
        <p className="text-sm text-muted-foreground mt-1">Revenue analysis and collection trends</p>
      </div>

      {error && <QueryError message={error.message} onRetry={() => void refetch()} />}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs text-muted-foreground">Total Collected</p>
          <p className="text-3xl font-bold text-foreground mt-1">{formatCurrency(feeReport?.totalCollected ?? 0)}</p>
          <p className="text-sm text-muted-foreground/70 mt-1">{feeReport?.paymentCount ?? 0} payments</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs text-muted-foreground mb-3">Payment Modes</p>
          <div className="space-y-2">
            {modes.map((m) => (
              <div key={m.mode} className="flex items-center justify-between text-sm">
                <span className="capitalize text-foreground/80">{m.mode}</span>
                <span className="font-medium">{formatCurrency(m.amount)} <span className="text-muted-foreground/70 font-normal">({m.count})</span></span>
              </div>
            ))}
            {modes.length === 0 && <p className="text-muted-foreground/70 text-sm">No data</p>}
          </div>
        </div>
      </div>

      {/* Monthly Trend Bar Chart */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">Monthly Collection Trend</h3>
        {loading ? (
          <p className="text-muted-foreground/70 text-sm">Loading...</p>
        ) : monthly.length === 0 ? (
          <p className="text-muted-foreground/70 text-sm">No monthly data</p>
        ) : (
          <div className="space-y-2">
            {monthly.map((row) => (
              <div key={row.month} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16 shrink-0">{row.month}</span>
                <div className="flex-1 bg-muted/60 rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(row.amount / maxMonthAmount) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-foreground/80 w-24 text-right shrink-0">{formatCurrency(row.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* By Plan */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60">
          <h3 className="font-semibold text-foreground text-sm">Collection by Fee Plan</h3>
        </div>
        {plans.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground/70">No plan data</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Payments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {plans.map((row) => (
                <tr key={row.plan} className="hover:bg-muted/40">
                  <td className="px-4 py-2.5 font-medium text-foreground">{row.plan}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-700">{formatCurrency(row.amount)}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
