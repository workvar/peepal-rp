'use client'

import { useCallback, useEffect, useState } from 'react'
import { moduleConfigAPI } from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import type { ModuleCatalogItem, ModulePageItem } from '@/types'

// State + actions for the module configurator. Mutations update optimistically
// and reload from the server on error.
export function useModuleConfig() {
  const [modules, setModules] = useState<ModuleCatalogItem[]>([])
  const [pages, setPages] = useState<ModulePageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await moduleConfigAPI.get()
      setModules(res.data.data.modules ?? [])
      setPages(res.data.data.pages ?? [])
      setError(null)
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load module configuration'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setPageMapping = async (id: string, moduleKey: string) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, module_key: moduleKey } : p)))
    try {
      await moduleConfigAPI.setPageMapping(id, moduleKey)
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to update mapping'))
      load()
    }
  }

  const addModule = async (label: string) => {
    try {
      await moduleConfigAPI.createModule({ label })
      await load()
      return true
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to add module'))
      return false
    }
  }

  const renameModule = async (key: string, label: string) => {
    setModules((prev) => prev.map((m) => (m.key === key ? { ...m, label } : m)))
    try {
      await moduleConfigAPI.updateModule(key, { label })
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to rename module'))
      load()
    }
  }

  const deleteModule = async (key: string) => {
    try {
      await moduleConfigAPI.deleteModule(key)
      await load()
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to delete module'))
    }
  }

  return {
    modules, pages, loading, error, setError,
    setPageMapping, addModule, renameModule, deleteModule,
  }
}

export type ModuleConfigState = ReturnType<typeof useModuleConfig>
