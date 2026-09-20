'use client'

import { useSubscriptionsPage } from './useSubscriptionsPage'
import SubscriptionsTable from './SubscriptionsTable'
import { AssignModal, UsageDetailModal } from './SubscriptionModals'

export default function SubscriptionsPage() {
  const page = useSubscriptionsPage()
  const {
    subscriptions, tenants, subMap, currentTenantUsage,
    showAssignModal, setShowAssignModal, showDetailModal,
    setForm, openAssign,
  } = page

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage organisation access and billing</p>
        </div>
        <button
          onClick={() => openAssign()}
          className="btn-primary text-white px-4 py-2 rounded-lg text-sm font-medium "
        >
          + Assign Plan
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orgs', value: tenants.length },
          { label: 'Active Subscriptions', value: subscriptions.filter((s) => s.status === 'active').length },
          { label: 'Trial', value: subscriptions.filter((s) => s.status === 'trial').length },
          {
            label: 'Suspended / Expired',
            value: subscriptions.filter((s) => s.status === 'suspended' || s.status === 'expired').length,
          },
        ].map((c) => (
          <div key={c.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Subscriptions Table */}
      <SubscriptionsTable page={page} />

      {/* Unsubscribed Orgs */}
      {tenants.length > subscriptions.length && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground/80 mb-3">Organisations without a subscription</h3>
          <div className="flex flex-wrap gap-2">
            {tenants
              .filter((t) => !subMap.has(t.id))
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setForm((f) => ({ ...f, tenant_id: t.id }))
                    setShowAssignModal(true)
                  }}
                  className="px-3 py-1.5 bg-muted/40 border border-border rounded-lg text-sm text-foreground/80 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                >
                  {t.name}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Assign / Edit Modal */}
      {showAssignModal && <AssignModal page={page} />}

      {/* Usage Detail Modal */}
      {showDetailModal && currentTenantUsage && <UsageDetailModal page={page} />}
    </div>
  )
}
