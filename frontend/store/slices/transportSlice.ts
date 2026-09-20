import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apolloClient } from "@/lib/apollo";
import {
  GET_TRANSPORT_ROUTES,
  GET_TRANSPORT_VEHICLES,
  GET_TRANSPORT_ALLOCATIONS,
} from "@/graphql/queries/transport";
import {
  CREATE_TRANSPORT_ROUTE,
  UPDATE_TRANSPORT_ROUTE,
  DELETE_TRANSPORT_ROUTE,
  CREATE_TRANSPORT_VEHICLE,
  UPDATE_TRANSPORT_VEHICLE,
  DELETE_TRANSPORT_VEHICLE,
  ALLOCATE_TRANSPORT_VEHICLE,
  REMOVE_TRANSPORT_ALLOCATION,
  BULK_DELETE_TRANSPORT_ROUTES,
  BULK_DELETE_TRANSPORT_VEHICLES,
  BULK_DELETE_TRANSPORT_ALLOCATIONS,
} from "@/graphql/mutations/transport";
import type { TransportRoute, TransportVehicle, TransportAllocation } from "@/types";

interface TransportState {
  routes: TransportRoute[];
  vehicles: TransportVehicle[];
  allocations: TransportAllocation[];
  loading: boolean;
  error: string | null;
}

const initialState: TransportState = {
  routes: [],
  vehicles: [],
  allocations: [],
  loading: false,
  error: null,
};

// ── Routes ──────────────────────────────────────────────────────
export const fetchRoutes = createAsyncThunk("transport/fetchRoutes", async () => {
  const { data } = await apolloClient.query({
    query: GET_TRANSPORT_ROUTES,
    fetchPolicy: "network-only",
  });
  return data.transportRoutes as TransportRoute[];
});

export const createRoute = createAsyncThunk(
  "transport/createRoute",
  async (input: object, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_TRANSPORT_ROUTE,
        variables: { input },
      });
      return data.createTransportRoute as TransportRoute;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to create route");
    }
  }
);

export const updateRoute = createAsyncThunk(
  "transport/updateRoute",
  async ({ id, input }: { id: string; input: object }, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_TRANSPORT_ROUTE,
        variables: { id, input },
      });
      return data.updateTransportRoute as TransportRoute;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to update route");
    }
  }
);

export const deleteRoute = createAsyncThunk(
  "transport/deleteRoute",
  async (id: string, { rejectWithValue }) => {
    try {
      await apolloClient.mutate({ mutation: DELETE_TRANSPORT_ROUTE, variables: { id } });
      return id;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to delete route");
    }
  }
);

// ── Vehicles ────────────────────────────────────────────────────
export const fetchVehicles = createAsyncThunk(
  "transport/fetchVehicles",
  async (params?: { routeId?: string }) => {
    const { data } = await apolloClient.query({
      query: GET_TRANSPORT_VEHICLES,
      variables: { routeId: params?.routeId },
      fetchPolicy: "network-only",
    });
    return data.transportVehicles as TransportVehicle[];
  }
);

export const createVehicle = createAsyncThunk(
  "transport/createVehicle",
  async (input: object, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_TRANSPORT_VEHICLE,
        variables: { input },
      });
      return data.createTransportVehicle as TransportVehicle;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to create vehicle");
    }
  }
);

export const updateVehicle = createAsyncThunk(
  "transport/updateVehicle",
  async ({ id, input }: { id: string; input: object }, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_TRANSPORT_VEHICLE,
        variables: { id, input },
      });
      return data.updateTransportVehicle as TransportVehicle;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to update vehicle");
    }
  }
);

export const deleteVehicle = createAsyncThunk(
  "transport/deleteVehicle",
  async (id: string, { rejectWithValue }) => {
    try {
      await apolloClient.mutate({ mutation: DELETE_TRANSPORT_VEHICLE, variables: { id } });
      return id;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to delete vehicle");
    }
  }
);

// ── Allocations ─────────────────────────────────────────────────
export const fetchAllocations = createAsyncThunk(
  "transport/fetchAllocations",
  async () => {
    const { data } = await apolloClient.query({
      query: GET_TRANSPORT_ALLOCATIONS,
      fetchPolicy: "network-only",
    });
    return data.transportAllocations as TransportAllocation[];
  }
);

export const allocateVehicle = createAsyncThunk(
  "transport/allocateVehicle",
  async (input: object, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: ALLOCATE_TRANSPORT_VEHICLE,
        variables: { input },
      });
      return data.allocateTransportVehicle as TransportAllocation;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to allocate vehicle");
    }
  }
);

export const removeAllocation = createAsyncThunk(
  "transport/removeAllocation",
  async ({ id, input }: { id: string; input: { endDate: string } }, { rejectWithValue }) => {
    try {
      await apolloClient.mutate({
        mutation: REMOVE_TRANSPORT_ALLOCATION,
        variables: { id, input },
      });
      return id;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to remove allocation");
    }
  }
);

// ── Bulk delete ─────────────────────────────────────────────────
// Each thunk returns the deleted ids so the reducer can prune state.
export const bulkDeleteRoutes = createAsyncThunk(
  "transport/bulkDeleteRoutes",
  async (ids: string[], { rejectWithValue }) => {
    try {
      await apolloClient.mutate({ mutation: BULK_DELETE_TRANSPORT_ROUTES, variables: { ids } });
      return ids;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to delete routes");
    }
  }
);

export const bulkDeleteVehicles = createAsyncThunk(
  "transport/bulkDeleteVehicles",
  async (ids: string[], { rejectWithValue }) => {
    try {
      await apolloClient.mutate({ mutation: BULK_DELETE_TRANSPORT_VEHICLES, variables: { ids } });
      return ids;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to delete vehicles");
    }
  }
);

export const bulkDeleteAllocations = createAsyncThunk(
  "transport/bulkDeleteAllocations",
  async (ids: string[], { rejectWithValue }) => {
    try {
      await apolloClient.mutate({ mutation: BULK_DELETE_TRANSPORT_ALLOCATIONS, variables: { ids } });
      return ids;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to delete allocations");
    }
  }
);

const transportSlice = createSlice({
  name: "transport",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoutes.pending, (state) => { state.loading = true; })
      .addCase(fetchRoutes.fulfilled, (state, action) => {
        state.loading = false;
        state.routes = action.payload;
      })
      .addCase(fetchRoutes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Error";
      })
      .addCase(createRoute.fulfilled, (state, action) => {
        state.routes.push(action.payload);
      })
      .addCase(updateRoute.fulfilled, (state, action) => {
        const idx = state.routes.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.routes[idx] = action.payload;
      })
      .addCase(deleteRoute.fulfilled, (state, action) => {
        state.routes = state.routes.filter((r) => r.id !== action.payload);
      })
      .addCase(fetchVehicles.pending, (state) => { state.loading = true; })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.loading = false;
        state.vehicles = action.payload;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Error";
      })
      .addCase(createVehicle.fulfilled, (state, action) => {
        state.vehicles.push(action.payload);
      })
      .addCase(updateVehicle.fulfilled, (state, action) => {
        const idx = state.vehicles.findIndex((v) => v.id === action.payload.id);
        if (idx !== -1) state.vehicles[idx] = action.payload;
      })
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.vehicles = state.vehicles.filter((v) => v.id !== action.payload);
      })
      .addCase(fetchAllocations.pending, (state) => { state.loading = true; })
      .addCase(fetchAllocations.fulfilled, (state, action) => {
        state.loading = false;
        state.allocations = action.payload;
      })
      .addCase(fetchAllocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Error";
      })
      .addCase(allocateVehicle.fulfilled, (state, action) => {
        state.allocations.push(action.payload);
      })
      .addCase(removeAllocation.fulfilled, (state, action) => {
        state.allocations = state.allocations.filter((a) => a.id !== action.payload);
      })
      .addCase(bulkDeleteRoutes.fulfilled, (state, action) => {
        state.routes = state.routes.filter((r) => !action.payload.includes(r.id));
      })
      .addCase(bulkDeleteVehicles.fulfilled, (state, action) => {
        state.vehicles = state.vehicles.filter((v) => !action.payload.includes(v.id));
      })
      .addCase(bulkDeleteAllocations.fulfilled, (state, action) => {
        state.allocations = state.allocations.filter((a) => !action.payload.includes(a.id));
      });
  },
});

export default transportSlice.reducer;
