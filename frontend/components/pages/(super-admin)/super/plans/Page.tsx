'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Search, Sparkles } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchPlans, createPlan, updatePlan, deletePlan } from '@/store/slices/subscriptionSlice'
import { getErrorMessage } from '@/lib/errors'
import { useModuleCatalog } from '@/lib/hooks/useModuleCatalog'
import type { SubscriptionPlan } from '@/types'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

// Module metadata: label + short description shown on each card
const MODULE_META: Record<string, { label: string; description: string }> = {
  attendance: {
    label: 'Attendance',
    description: 'Track daily attendance for students and employees with bulk entry and reports.',
  },
  marks: {
    label: 'Marks & Grades',
    description: 'Enter exam marks, auto-calculate grades (O/A+/A/B+/B/C/F) and track performance.',
  },
  leaves: {
    label: 'Leave Management',
    description: 'Apply for leaves, approve or reject requests, and manage leave balances.',
  },
  employees: {
    label: 'Employee Management',
    description: 'Manage employee profiles, departments, designations and employment records.',
  },
  students: {
    label: 'Student Management',
    description: 'Enrol students, manage course assignments and access student directories.',
  },
  payroll: {
    label: 'Payroll',
    description: 'Process salaries, manage salary structures, deductions and payslips.',
  },
  fees: {
    label: 'Fee Management',
    description: 'Manage fee structures, collect payments and track outstanding dues.',
  },
  announcements: {
    label: 'Announcements',
    description: 'Broadcast notices and important updates to students, staff and teachers.',
  },
  reports: {
    label: 'Reports & Analytics',
    description: 'Attendance, marks, fees, payroll and leave reports with charts and exports.',
  },
  academic: {
    label: 'Academic',
    description: 'Configure subjects, exam schedules and the academic structure of the institute.',
  },
  learning: {
    label: 'Learning Matrix',
    description: 'Create learning goals, assignments and track individual learning journeys.',
  },
  hostel: {
    label: 'Hostel',
    description: 'Manage hostel rooms, allocations, occupancy and resident records.',
  },
  transport: {
    label: 'Transport',
    description: 'Manage transport routes, vehicles and student/staff transport assignments.',
  },
  library: {
    label: 'Library',
    description: 'Manage the library catalogue, book issues, returns and member records.',
  },
  events: {
    label: 'Events',
    description: 'Schedule and publish institute events, activities and calendar entries.',
  },
  timetable: {
    label: 'Timetable',
    description: 'Build class timetables and view daily schedules for teachers and students.',
  },
  notifications: {
    label: 'Notifications',
    description: 'In-app notifications for reminders, approvals, deadlines and alerts.',
  },
}

const emptyForm = {
  name: '',
  description: '',
  price_monthly: 0,
  price_annually: 0,
  max_students: 100,
  max_employees: 20,
  modules: '',
}

export default function PlansPage() {
  const dispatch = useAppDispatch()
  const { plans, loading } = useAppSelector((s) => s.subscription)
  const { options: moduleOptions, keys: moduleKeys, presets, applyPreset } = useModuleCatalog()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [moduleSearch, setModuleSearch] = useState('')

  // moduleLabel prefers the live catalog label, falls back to the static
  // description table (for the compiled-in keys), then the raw key.
  function moduleLabel(mod: string) {
    return moduleOptions.find((o) => o.key === mod)?.label || MODULE_META[mod]?.label || mod
  }

  useEffect(() => {
    dispatch(fetchPlans())
  }, [dispatch])

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, modules: moduleKeys.join(',') })
    setSelectedModules([...moduleKeys])
    setModuleSearch('')
    setShowModal(true)
  }

  function openEdit(plan: SubscriptionPlan) {
    setEditing(plan)
    setForm({
      name: plan.name,
      description: plan.description,
      price_monthly: plan.price_monthly,
      price_annually: plan.price_annually,
      max_students: plan.max_students,
      max_employees: plan.max_employees,
      modules: plan.modules,
    })
    setSelectedModules(plan.modules ? plan.modules.split(',').filter(Boolean) : [...moduleKeys])
    setModuleSearch('')
    setShowModal(true)
  }

  function toggleModule(mod: string) {
    setSelectedModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const payload = { ...form, modules: selectedModules.join(',') }
    try {
      if (editing) {
        await dispatch(updatePlan({ id: editing.id, data: payload })).unwrap()
      } else {
        await dispatch(createPlan(payload)).unwrap()
      }
      setShowModal(false)
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to save plan'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this plan? It cannot be deleted if organisations are using it.')) return
    try {
      await dispatch(deletePlan(id)).unwrap()
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete'))
    }
  }

  // Filter modules by search query (label or description match, case-insensitive)
  const filteredModules = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase()
    if (!q) return moduleOptions.map((o) => o.key)
    return moduleOptions
      .filter((o) => {
        const desc = (MODULE_META[o.key]?.description || '').toLowerCase()
        return o.label.toLowerCase().includes(q) || desc.includes(q) || o.key.toLowerCase().includes(q)
      })
      .map((o) => o.key)
  }, [moduleSearch, moduleOptions])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscription Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">Define plans that organisations can subscribe to</p>
        </div>
        <button
          onClick={openCreate}
          className="btn-primary text-white px-4 py-2 rounded-lg text-sm font-medium "
        >
          + New Plan
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground/70">Loading plans...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground/70">No plans yet. Create your first plan.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const mods = plan.modules ? plan.modules.split(',').filter(Boolean) : []
            return (
              <div key={plan.id} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{plan.name}</h3>
                    {plan.description && <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      plan.is_active ? 'bg-green-100 text-green-700' : 'bg-muted/60 text-muted-foreground'
                    }`}
                  >
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Monthly</p>
                    <p className="font-bold text-foreground">{formatCurrency(plan.price_monthly)}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Annual</p>
                    <p className="font-bold text-foreground">{formatCurrency(plan.price_annually)}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Max Students</p>
                    <p className="font-bold text-foreground">{plan.max_students}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Max Employees</p>
                    <p className="font-bold text-foreground">{plan.max_employees}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Included Modules ({mods.length}/{moduleKeys.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {mods.map((m) => (
                      <span key={m} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                        {moduleLabel(m)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1 border-t border-border/60">
                  <button
                    onClick={() => openEdit(plan)}
                    className="flex-1 text-sm text-blue-600 hover:underline py-1"
                  >
                    Edit
                  </button>
                  <button onClick={() => handleDelete(plan.id)} className="flex-1 text-sm text-red-500 hover:underline py-1">
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit Plan' : 'New Subscription Plan'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Plan Name *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Starter, Professional, Enterprise"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Description</label>
                <textarea
                  value={form.description}
                  rows={2}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Monthly Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.price_monthly}
                    onChange={(e) => setForm((f) => ({ ...f, price_monthly: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Annual Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.price_annually}
                    onChange={(e) => setForm((f) => ({ ...f, price_annually: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Max Students</label>
                  <input
                    type="number"
                    min={1}
                    value={form.max_students}
                    onChange={(e) => setForm((f) => ({ ...f, max_students: parseInt(e.target.value) || 100 }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Max Employees</label>
                  <input
                    type="number"
                    min={1}
                    value={form.max_employees}
                    onChange={(e) => setForm((f) => ({ ...f, max_employees: parseInt(e.target.value) || 20 }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Module Toggles */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-foreground/80">
                    Included Modules ({selectedModules.length}/{moduleKeys.length})
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedModules([...moduleKeys])}
                      className="text-blue-600 hover:underline"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedModules([])}
                      className="text-muted-foreground hover:underline"
                    >
                      None
                    </button>
                  </div>
                </div>

                {/* Vertical presets — one click to swap the selection for a
                    server-defined module set (Education, Hospital, ...) */}
                {presets.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Sparkles size={12} /> Quick fill:
                    </span>
                    {presets.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setSelectedModules(applyPreset(p))}
                        className="text-xs font-medium px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Search bar for modules */}
                <div className="relative mb-3">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                    placeholder="Search modules..."
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Module cards grid — 2 cards per row, 2 columns */}
                {filteredModules.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No modules match "{moduleSearch}"
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredModules.map((mod) => {
                      const meta = MODULE_META[mod]
                      const label = moduleLabel(mod)
                      const checked = selectedModules.includes(mod)
                      return (
                        <div
                          key={mod}
                          role="checkbox"
                          aria-checked={checked}
                          tabIndex={0}
                          onClick={() => toggleModule(mod)}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault()
                              toggleModule(mod)
                            }
                          }}
                          className={`relative p-4 pr-10 rounded-lg border-2 cursor-pointer transition-all select-none ${
                            checked
                              ? 'border-blue-500 bg-blue-50 shadow-sm'
                              : 'border-border bg-card hover:border-blue-200 hover:bg-muted/30'
                          }`}
                        >
                          {/* Checkbox top-right */}
                          <div
                            className={`absolute top-3 right-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              checked
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-border bg-card'
                            }`}
                          >
                            {checked && <Check size={13} className="text-white" strokeWidth={3} />}
                          </div>

                          <h4
                            className={`text-sm font-semibold mb-1 ${
                              checked ? 'text-blue-700' : 'text-foreground'
                            }`}
                          >
                            {label}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-snug">
                            {meta?.description || 'No description available.'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-border rounded-lg py-2 text-sm font-medium text-foreground/80 hover:bg-muted/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-primary text-white rounded-lg py-2 text-sm font-medium  disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
