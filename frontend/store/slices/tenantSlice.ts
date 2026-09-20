import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { superAdminAPI } from "@/lib/api";
import type { Tenant, TenantStats } from "@/types";

// ── Async Thunks ──────────────────────────────────────────────

export const fetchTenants = createAsyncThunk(
  "tenant/fetchTenants",
  async (params: { status?: string; page?: number; limit?: number } | undefined, { rejectWithValue }) => {
    try {
      const res = await superAdminAPI.listTenants(params);
      const data = res.data.data as { tenants: Tenant[]; pagination: unknown };
      return data.tenants;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error || "Failed to fetch tenants");
    }
  }
);

export const fetchTenantStats = createAsyncThunk(
  "tenant/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const res = await superAdminAPI.getStats();
      return res.data.data as TenantStats;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error || "Failed to fetch stats");
    }
  }
);

// Invite info returned when a tenant is created with an emailed admin invite.
export interface CreatedTenantInvite {
  link: string;
  sent: boolean;
  expires_at: string;
}

export const createTenant = createAsyncThunk(
  "tenant/create",
  async (data: object, { rejectWithValue }) => {
    try {
      const res = await superAdminAPI.createTenant(data);
      const result = res.data.data as {
        tenant: Tenant;
        admin: unknown;
        invite: CreatedTenantInvite | null;
      };
      return { tenant: result.tenant, invite: result.invite };
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error || "Failed to create tenant");
    }
  }
);

export const updateTenantStatus = createAsyncThunk(
  "tenant/updateStatus",
  async ({ id, status }: { id: string; status: string }, { rejectWithValue }) => {
    try {
      const res = await superAdminAPI.updateTenantStatus(id, status);
      return res.data.data as Tenant;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error || "Failed to update tenant");
    }
  }
);

export const hardDeleteTenant = createAsyncThunk(
  "tenant/hardDelete",
  async ({ id, password }: { id: string; password: string }, { rejectWithValue }) => {
    try {
      await superAdminAPI.deleteTenant(id, password);
      return id;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error || "Failed to delete tenant");
    }
  }
);

// ── State Type ─────────────────────────────────────────────────

export interface TenantState {
  tenants: Tenant[];
  selected: Tenant | null;
  stats: TenantStats | null;
  loading: boolean;
  error: string | null;
}

// ── Initial State ──────────────────────────────────────────────

const initialState: TenantState = {
  tenants: [],
  selected: null,
  stats: null,
  loading: false,
  error: null,
};

// ── Slice ──────────────────────────────────────────────────────

const tenantSlice = createSlice({
  name: "tenant",
  initialState,
  reducers: {
    selectTenant(state, action) {
      state.selected = action.payload;
    },
    clearTenantError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchTenants
      .addCase(fetchTenants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenants.fulfilled, (state, action) => {
        state.loading = false;
        state.tenants = action.payload;
      })
      .addCase(fetchTenants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchTenantStats
      .addCase(fetchTenantStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTenantStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchTenantStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createTenant
      .addCase(createTenant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTenant.fulfilled, (state, action) => {
        state.loading = false;
        state.tenants.push(action.payload.tenant);
      })
      .addCase(createTenant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateTenantStatus
      .addCase(updateTenantStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTenantStatus.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.tenants.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) {
          state.tenants[idx] = action.payload;
        }
        if (state.selected?.id === action.payload.id) {
          state.selected = action.payload;
        }
      })
      .addCase(updateTenantStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // hardDeleteTenant
      .addCase(hardDeleteTenant.pending, (state) => {
        state.error = null;
      })
      .addCase(hardDeleteTenant.fulfilled, (state, action) => {
        state.loading = false;
        state.tenants = state.tenants.filter((t) => t.id !== action.payload);
        if (state.selected?.id === action.payload) {
          state.selected = null;
        }
      })
      .addCase(hardDeleteTenant.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { selectTenant, clearTenantError } = tenantSlice.actions;
export default tenantSlice.reducer;
