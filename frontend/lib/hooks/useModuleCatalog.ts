import { useEffect, useState } from 'react'
import { moduleConfigAPI } from '@/lib/api'
import { ALL_MODULES } from '@/types'
import type { ModuleCatalogItem, ModulePreset } from '@/types'

// Fallback labels for the compiled-in module keys, used only until the live
// catalog request resolves (or if it fails). Keep in sync with the backend's
// defaultModuleLabels in backend/models/module_config.go — but note the live
// catalog is the source of truth, this is just a loading-state placeholder.
const FALLBACK_LABELS: Record<string, string> = {
  attendance: 'Attendance', marks: 'Marks', leaves: 'Leaves',
  employees: 'Employees', students: 'Students', payroll: 'Payroll',
  fees: 'Fees', announcements: 'Announcements', reports: 'Reports',
  academic: 'Academic', learning: 'Learning Matrix', hostel: 'Hostel',
  transport: 'Transport', library: 'Library', events: 'Events',
  timetable: 'Timetable', notifications: 'Notifications',
}

export interface ModuleOption {
  key: string
  label: string
}

// Super-admin-editable coarse module catalog (see /super/modules). Any page
// that lets a super-admin pick modules — plan creation, subscription
// overrides — must read this live list instead of a hardcoded one, or
// modules created/renamed there silently fail to show up elsewhere.
//
// Also carries the server-defined vertical presets (Education, Hospital, …)
// from the same response, so a preset "quick fill" button never drifts out
// of sync with the modules that actually exist.
export function useModuleCatalog() {
  const [catalog, setCatalog] = useState<ModuleCatalogItem[]>([])
  const [presets, setPresets] = useState<ModulePreset[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    moduleConfigAPI
      .get()
      .then((res) => {
        setCatalog(res.data.data.modules ?? [])
        setPresets(res.data.data.presets ?? [])
      })
      .catch(() => { /* keep the built-in fallback below */ })
      .finally(() => setLoading(false))
  }, [])

  const options: ModuleOption[] = catalog.length
    ? catalog.map((m) => ({ key: m.key, label: m.label }))
    : ALL_MODULES.map((k) => ({ key: k, label: FALLBACK_LABELS[k] || k }))

  const keys = options.map((o) => o.key)

  return {
    catalog,
    presets,
    loading,
    options,
    keys,
    labelFor: (key: string) => options.find((o) => o.key === key)?.label || key,
    // Modules from a preset that don't exist in the live catalog (e.g. a
    // super-admin deleted one) are dropped rather than silently selected.
    applyPreset: (preset: ModulePreset) => preset.modules.filter((m) => keys.includes(m)),
  }
}
