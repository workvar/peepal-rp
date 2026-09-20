'use client'

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchSubscriptions,
  fetchPlans,
  assignSubscription,
  updateSubscriptionStatus,
  fetchTenantSubscription,
} from '@/store/slices/subscriptionSlice'
import { fetchTenants } from '@/store/slices/tenantSlice'
import { getErrorMessage } from '@/lib/errors'
import { useModuleCatalog } from '@/lib/hooks/useModuleCatalog'
import type { TenantSubscription } from '@/types'
import { emptyAssignForm } from './types'

// All subscriptions page state and handlers; the table and modals consume
// this hook.
export function useSubscriptionsPage() {
  const dispatch = useAppDispatch()
  const { subscriptions, plans, currentTenantUsage, loading } = useAppSelector((s) => s.subscription)
  const { tenants } = useAppSelector((s) => s.tenant)

  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [form, setForm] = useState(emptyAssignForm)
  const [useModuleOverride, setUseModuleOverride] = useState(false)
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  // The list of modules to show in the override picker comes from the live,
  // super-admin-editable catalog (falls back to the built-in list until the
  // request resolves — see useModuleCatalog).
  const { options: moduleOptions, keys: allModuleKeys } = useModuleCatalog()

  useEffect(() => {
    dispatch(fetchSubscriptions())
    dispatch(fetchPlans())
    dispatch(fetchTenants(undefined))
  }, [dispatch])

  // Build a map of tenantId -> subscription for quick lookup
  const subMap = new Map(subscriptions.map((s) => [s.tenant_id, s]))

  function openAssign(sub?: TenantSubscription) {
    if (sub) {
      setForm({
        tenant_id: sub.tenant_id,
        plan_id: sub.plan_id,
        billing_period: sub.billing_period,
        status: sub.status,
        start_date: sub.start_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        end_date: sub.end_date?.slice(0, 10) || '',
        max_students_override: sub.max_students_override,
        max_employees_override: sub.max_employees_override,
        modules_override: sub.modules_override || '',
        notes: sub.notes || '',
      })
      const hasMods = !!sub.modules_override
      setUseModuleOverride(hasMods)
      setSelectedModules(hasMods ? sub.modules_override.split(',').filter(Boolean) : allModuleKeys)
    } else {
      setForm(emptyAssignForm)
      setUseModuleOverride(false)
      setSelectedModules(allModuleKeys)
    }
    setShowAssignModal(true)
  }

  async function openDetail(tenantId: string) {
    await dispatch(fetchTenantSubscription(tenantId))
    setShowDetailModal(true)
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const payload = {
      ...form,
      modules_override: useModuleOverride ? selectedModules.join(',') : '',
    }
    try {
      await dispatch(assignSubscription(payload)).unwrap()
      setShowAssignModal(false)
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to assign subscription'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStatusChange(id: string, status: string) {
    await dispatch(updateSubscriptionStatus({ id, data: { status } }))
  }

  return {
    subscriptions, plans, currentTenantUsage, loading, tenants, subMap,
    showAssignModal, setShowAssignModal,
    showDetailModal, setShowDetailModal,
    form, setForm,
    useModuleOverride, setUseModuleOverride,
    selectedModules, setSelectedModules,
    moduleOptions,
    submitting,
    openAssign, openDetail, handleAssign, handleStatusChange,
  }
}

export type SubscriptionsPageState = ReturnType<typeof useSubscriptionsPage>
