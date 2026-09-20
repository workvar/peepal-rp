import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apolloClient } from "@/lib/apollo";
import { GET_ACCESS_MATRIX, GET_MY_ACCESS } from "@/graphql/queries/access";
import { UPDATE_ROLE_ACCESS, RESET_ROLE_ACCESS } from "@/graphql/mutations/access";
import type { AccessMatrix, ModuleAccess, RoleAccess } from "@/types";

// Composite key identifying a role column in the matrix.
export const subjectKeyOf = (subjectType: string, subjectKey: string) =>
  `${subjectType}:${subjectKey}`;

// ── Thunks ─────────────────────────────────────────────────────

export const fetchAccessMatrix = createAsyncThunk(
  "access/fetchMatrix",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.query({
        query: GET_ACCESS_MATRIX,
        fetchPolicy: "network-only",
      });
      return data.accessMatrix as AccessMatrix;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to load access matrix");
    }
  }
);

export const fetchMyAccess = createAsyncThunk(
  "access/fetchMine",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.query({
        query: GET_MY_ACCESS,
        fetchPolicy: "network-only",
      });
      return data.myAccess as ModuleAccess[];
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to load access");
    }
  }
);

export const saveRoleAccess = createAsyncThunk(
  "access/saveRole",
  async (
    input: {
      subjectType: string;
      subjectKey: string;
      modules: ModuleAccess[];
    },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_ROLE_ACCESS,
        variables: { input },
      });
      return data.updateRoleAccess as RoleAccess;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to save access");
    }
  }
);

export const resetRoleAccess = createAsyncThunk(
  "access/resetRole",
  async (
    { subjectType, subjectKey }: { subjectType: string; subjectKey: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: RESET_ROLE_ACCESS,
        variables: { subjectType, subjectKey },
      });
      return data.resetRoleAccess as RoleAccess;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to reset access");
    }
  }
);

// ── State ──────────────────────────────────────────────────────

export interface AccessState {
  matrix: AccessMatrix | null;
  // Current user's effective access, keyed by module id for O(1) nav lookups.
  myAccess: Record<string, ModuleAccess>;
  myAccessLoaded: boolean;
  // Set when the myAccess fetch failed. Route guards treat "settled" as
  // loaded || failed so a network error doesn't leave them waiting forever.
  myAccessFailed: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: AccessState = {
  matrix: null,
  myAccess: {},
  myAccessLoaded: false,
  myAccessFailed: false,
  loading: false,
  saving: false,
  error: null,
};

// Replace one role column inside the cached matrix after a save/reset.
function replaceRole(state: AccessState, role: RoleAccess) {
  if (!state.matrix) return;
  const idx = state.matrix.roles.findIndex(
    (r) => r.subjectType === role.subjectType && r.subjectKey === role.subjectKey
  );
  if (idx !== -1) state.matrix.roles[idx] = role;
}

const accessSlice = createSlice({
  name: "access",
  initialState,
  reducers: {
    clearAccessError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccessMatrix.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccessMatrix.fulfilled, (state, action) => {
        state.loading = false;
        state.matrix = action.payload;
      })
      .addCase(fetchAccessMatrix.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchMyAccess.fulfilled, (state, action) => {
        state.myAccess = Object.fromEntries(
          action.payload.map((m) => [m.module, m])
        );
        state.myAccessLoaded = true;
        state.myAccessFailed = false;
      })
      .addCase(fetchMyAccess.rejected, (state) => {
        state.myAccessFailed = true;
      })
      .addCase(saveRoleAccess.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveRoleAccess.fulfilled, (state, action) => {
        state.saving = false;
        replaceRole(state, action.payload);
      })
      .addCase(saveRoleAccess.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      .addCase(resetRoleAccess.fulfilled, (state, action) => {
        replaceRole(state, action.payload);
      })
      .addCase(resetRoleAccess.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearAccessError } = accessSlice.actions;
export default accessSlice.reducer;
