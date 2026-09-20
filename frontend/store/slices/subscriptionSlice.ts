import { createSlice, createAsyncThunk, type SerializedError } from '@reduxjs/toolkit'
import { plansAPI, subscriptionsAPI } from '@/lib/api'
import type { SubscriptionPlan, TenantSubscription, SubscriptionUsage } from '@/types'

interface SubscriptionState {
  plans: SubscriptionPlan[]
  subscriptions: TenantSubscription[]
  currentTenantUsage: SubscriptionUsage | null
  mySubscription: SubscriptionUsage | null
  loading: boolean
  error: string | null
}

const initialState: SubscriptionState = {
  plans: [],
  subscriptions: [],
  currentTenantUsage: null,
  mySubscription: null,
  loading: false,
  error: null,
}

export const fetchPlans = createAsyncThunk('subscription/fetchPlans', async () => {
  const res = await plansAPI.list()
  return res.data.data as SubscriptionPlan[]
})

export const createPlan = createAsyncThunk('subscription/createPlan', async (data: object) => {
  const res = await plansAPI.create(data)
  return res.data.data as SubscriptionPlan
})

export const updatePlan = createAsyncThunk(
  'subscription/updatePlan',
  async ({ id, data }: { id: string; data: object }) => {
    const res = await plansAPI.update(id, data)
    return res.data.data as SubscriptionPlan
  }
)

export const deletePlan = createAsyncThunk('subscription/deletePlan', async (id: string) => {
  await plansAPI.delete(id)
  return id
})

export const fetchSubscriptions = createAsyncThunk('subscription/fetchSubscriptions', async () => {
  const res = await subscriptionsAPI.list()
  return res.data.data as TenantSubscription[]
})

export const fetchTenantSubscription = createAsyncThunk(
  'subscription/fetchTenantSubscription',
  async (tenantId: string) => {
    const res = await subscriptionsAPI.getByTenant(tenantId)
    return res.data.data as SubscriptionUsage
  }
)

export const assignSubscription = createAsyncThunk(
  'subscription/assignSubscription',
  async (data: object) => {
    const res = await subscriptionsAPI.assign(data)
    return res.data.data as TenantSubscription
  }
)

export const updateSubscriptionStatus = createAsyncThunk(
  'subscription/updateStatus',
  async ({ id, data }: { id: string; data: { status: string; notes?: string } }) => {
    const res = await subscriptionsAPI.updateStatus(id, data)
    return res.data.data as TenantSubscription
  }
)

export const fetchMySubscription = createAsyncThunk('subscription/fetchMy', async () => {
  const res = await subscriptionsAPI.mySubscription()
  return res.data.data as SubscriptionUsage
})

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    const setLoading = (state: SubscriptionState) => {
      state.loading = true
      state.error = null
    }
    const setError = (state: SubscriptionState, action: { error: SerializedError }) => {
      state.loading = false
      state.error = action.error.message || 'Error'
    }

    builder
      .addCase(fetchPlans.pending, setLoading)
      .addCase(fetchPlans.fulfilled, (state, action) => {
        state.loading = false
        state.plans = action.payload ?? []
      })
      .addCase(fetchPlans.rejected, setError)

      .addCase(createPlan.fulfilled, (state, action) => {
        state.plans.unshift(action.payload)
      })
      .addCase(updatePlan.fulfilled, (state, action) => {
        const idx = state.plans.findIndex((p) => p.id === action.payload.id)
        if (idx !== -1) state.plans[idx] = action.payload
      })
      .addCase(deletePlan.fulfilled, (state, action) => {
        state.plans = state.plans.filter((p) => p.id !== action.payload)
      })

      .addCase(fetchSubscriptions.pending, setLoading)
      .addCase(fetchSubscriptions.fulfilled, (state, action) => {
        state.loading = false
        state.subscriptions = action.payload ?? []
      })
      .addCase(fetchSubscriptions.rejected, setError)

      .addCase(fetchTenantSubscription.fulfilled, (state, action) => {
        state.currentTenantUsage = action.payload
      })

      .addCase(assignSubscription.fulfilled, (state, action) => {
        const idx = state.subscriptions.findIndex((s) => s.tenant_id === action.payload.tenant_id)
        if (idx !== -1) state.subscriptions[idx] = action.payload
        else state.subscriptions.unshift(action.payload)
      })

      .addCase(updateSubscriptionStatus.fulfilled, (state, action) => {
        const idx = state.subscriptions.findIndex((s) => s.id === action.payload.id)
        if (idx !== -1) state.subscriptions[idx] = action.payload
      })

      .addCase(fetchMySubscription.fulfilled, (state, action) => {
        state.mySubscription = action.payload
      })
  },
})

export default subscriptionSlice.reducer
