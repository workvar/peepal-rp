'use client'

import { STATUS_COLORS, formatCurrency } from './types'
import type { SubscriptionsPageState } from './useSubscriptionsPage'

// Subscriptions table with usage/edit/suspend/reactivate row actions.
export default function SubscriptionsTable({ page }: { page: SubscriptionsPageState }) {
  const { subscriptions, loading, openDetail, openAssign, handleStatusChange } = page

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {loading ? (
        <div className="p-8 text-center text-muted-foreground/70">Loading...</div>
      ) : subscriptions.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground/70">
          No subscriptions yet. Assign a plan to an organisation.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Organisation</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Billing</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expires</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {subscriptions.map((sub) => (
              <tr key={sub.id} className="hover:bg-muted/40">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{sub.tenant?.name || sub.tenant_id}</div>
                  <div className="text-xs text-muted-foreground/70">{sub.tenant?.subdomain}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground/90">{sub.plan?.name || sub.plan_id}</div>
                  {sub.plan && (
                    <div className="text-xs text-muted-foreground/70">
                      {sub.billing_period === 'monthly'
                        ? formatCurrency(sub.plan.price_monthly) + '/mo'
                        : formatCurrency(sub.plan.price_annually) + '/yr'}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{sub.billing_period}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      STATUS_COLORS[sub.status] || 'bg-muted/60 text-muted-foreground'
                    }`}
                  >
                    {sub.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{sub.end_date ? new Date(sub.end_date).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => openDetail(sub.tenant_id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Usage
                    </button>
                    <button onClick={() => openAssign(sub)} className="text-xs text-muted-foreground hover:underline">
                      Edit
                    </button>
                    {sub.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(sub.id, 'suspended')}
                        className="text-xs text-orange-500 hover:underline"
                      >
                        Suspend
                      </button>
                    )}
                    {sub.status === 'suspended' && (
                      <button
                        onClick={() => handleStatusChange(sub.id, 'active')}
                        className="text-xs text-green-600 hover:underline"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
