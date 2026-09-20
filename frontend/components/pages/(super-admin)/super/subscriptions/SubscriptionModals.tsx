'use client'

import { MODULE_LABELS } from './types'
import type { SubscriptionsPageState } from './useSubscriptionsPage'
import SearchableSelect from "@/components/ui/SearchableSelect"

// Assign / edit subscription modal.
export function AssignModal({ page }: { page: SubscriptionsPageState }) {
  const {
    tenants, plans, subMap,
    setShowAssignModal,
    form, setForm,
    useModuleOverride, setUseModuleOverride,
    selectedModules, setSelectedModules,
    moduleOptions,
    submitting, handleAssign,
  } = page

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">
          {form.tenant_id && subMap.has(form.tenant_id) ? 'Update Subscription' : 'Assign Subscription Plan'}
        </h2>
        <form onSubmit={handleAssign} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Organisation *</label>
              <SearchableSelect
                required
                value={form.tenant_id}
                onChange={(v) => setForm((f) => ({ ...f, tenant_id: v }))}
                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="Select organisation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Plan *</label>
              <SearchableSelect
                required
                value={form.plan_id}
                onChange={(v) => setForm((f) => ({ ...f, plan_id: v }))}
                options={plans
                  .filter((p) => p.is_active)
                  .map((p) => ({ value: p.id, label: `${p.name} — ₹${p.price_monthly}/mo` }))}
                placeholder="Select plan"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Billing</label>
              <select
                value={form.billing_period}
                onChange={(e) => setForm((f) => ({ ...f, billing_period: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">End Date</label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Limit Overrides */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Max Students Override{' '}
                <span className="text-muted-foreground/70 font-normal">(0 = use plan default)</span>
              </label>
              <input
                type="number"
                min={0}
                value={form.max_students_override}
                onChange={(e) => setForm((f) => ({ ...f, max_students_override: parseInt(e.target.value) || 0 }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Max Employees Override{' '}
                <span className="text-muted-foreground/70 font-normal">(0 = plan default)</span>
              </label>
              <input
                type="number"
                min={0}
                value={form.max_employees_override}
                onChange={(e) => setForm((f) => ({ ...f, max_employees_override: parseInt(e.target.value) || 0 }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Module Override */}
          <div>
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useModuleOverride}
                onChange={(e) => setUseModuleOverride(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span className="text-sm font-medium text-foreground/80">Override modules for this org</span>
            </label>
            {useModuleOverride && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {moduleOptions.map((opt) => (
                  <label
                    key={opt.key}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                      selectedModules.includes(opt.key)
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(opt.key)}
                      onChange={() =>
                        setSelectedModules((prev) =>
                          prev.includes(opt.key) ? prev.filter((m) => m !== opt.key) : [...prev, opt.key]
                        )
                      }
                      className="rounded text-blue-600"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Notes</label>
            <textarea
              value={form.notes}
              rows={2}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAssignModal(false)}
              className="flex-1 border border-border rounded-lg py-2 text-sm font-medium text-foreground/80 hover:bg-muted/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 btn-primary text-white rounded-lg py-2 text-sm font-medium  disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Usage detail modal: per-tenant limits, usage bars, and enabled modules.
export function UsageDetailModal({ page }: { page: SubscriptionsPageState }) {
  const { currentTenantUsage, setShowDetailModal } = page
  if (!currentTenantUsage) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Usage Details</h2>
          <button onClick={() => setShowDetailModal(false)} className="text-muted-foreground/70 hover:text-muted-foreground text-xl">
            ×
          </button>
        </div>
        {currentTenantUsage.subscription && (
          <div className="mb-4 p-3 bg-muted/40 rounded-lg">
            <p className="text-sm font-medium text-foreground/80">{currentTenantUsage.subscription.plan?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {currentTenantUsage.subscription.status} · {currentTenantUsage.subscription.billing_period}
            </p>
          </div>
        )}
        <div className="space-y-3">
          {[
            {
              label: 'Students',
              used: currentTenantUsage.usage.students,
              max: currentTenantUsage.usage.max_students,
            },
            {
              label: 'Employees',
              used: currentTenantUsage.usage.employees,
              max: currentTenantUsage.usage.max_employees,
            },
          ].map((u) => {
            const pct = u.max > 0 ? Math.min(Math.round((u.used / u.max) * 100), 100) : 0
            return (
              <div key={u.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground/80">{u.label}</span>
                  <span
                    className={`font-medium ${
                      pct >= 90 ? 'text-red-600' : pct >= 75 ? 'text-orange-500' : 'text-muted-foreground'
                    }`}
                  >
                    {u.used} / {u.max}
                  </span>
                </div>
                <div className="w-full bg-muted/60 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-orange-400' : 'bg-blue-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Enabled Modules</p>
          <div className="flex flex-wrap gap-1">
            {(currentTenantUsage.usage.modules || '')
              .split(',')
              .filter(Boolean)
              .map((m) => (
                <span key={m} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                  {MODULE_LABELS[m] || m}
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
