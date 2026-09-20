'use client'

import { useModuleConfig } from './useModuleConfig'
import ModuleCatalogSection from './ModuleCatalogSection'
import PageMappingSection from './PageMappingSection'

export default function ModuleConfiguratorPage() {
  const cfg = useModuleConfig()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Module Configurator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define the subscription modules and map each page onto one. Changes apply to gating immediately.
        </p>
      </div>

      {cfg.error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-2 text-sm">
          <span>{cfg.error}</span>
          <button onClick={() => cfg.setError(null)} className="text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {cfg.loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <ModuleCatalogSection cfg={cfg} />
          <PageMappingSection cfg={cfg} />
        </>
      )}
    </div>
  )
}
