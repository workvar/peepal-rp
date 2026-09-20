// Pure aggregations for the fees Overview tab. Most analytics now come from
// the feeOverview GraphQL query; this keeps only the status mix, which is
// derived from the already-loaded student fees.

import type { GqlStudentFee } from './types'

export interface StatusBucket {
  status: string
  count: number
  amount: number
}

// Student fees grouped by payment status, carrying the net amount per bucket.
// Ordered paid → partial → pending so the stacked bar reads left to right.
export function studentFeeStatusBuckets(fees: GqlStudentFee[]): StatusBucket[] {
  const order = ['paid', 'partial', 'pending']
  const map = new Map<string, StatusBucket>()
  for (const f of fees) {
    const key = f.status || 'pending'
    const b = map.get(key) ?? { status: key, count: 0, amount: 0 }
    b.count++
    b.amount += f.netAmount
    map.set(key, b)
  }
  return [...map.values()].sort(
    (a, b) => order.indexOf(a.status) - order.indexOf(b.status),
  )
}
