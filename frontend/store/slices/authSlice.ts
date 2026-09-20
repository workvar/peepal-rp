import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authAPI } from "@/lib/api";
import type { AuthState, AuthUser } from "@/types";
import { resetTerminology } from "./terminologySlice";
import {
  clearSessionMarker,
  hasSessionMarker,
  setSessionMarker,
} from "@/lib/session";

// Auth model: the JWT lives in an httpOnly cookie set by the backend.
// JavaScript never sees it. The store only tracks the user object and a
// boolean session marker used for routing decisions.

// ── Async thunks ──────────────────────────────────────────────

export const login = createAsyncThunk(
  "auth/login",
  async (
    {
      identifier,
      password,
      tenantSubdomain,
    }: { identifier: string; password: string; tenantSubdomain?: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await authAPI.login(identifier, password, tenantSubdomain);
      const { user } = res.data.data;
      setSessionMarker();
      localStorage.setItem("tenantId", user.tenant_id || "");
      return { user } as { user: AuthUser };
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error || "Login failed");
    }
  }
);

// logoutUser — prefer this over the raw `logout` action so that the server
// cookie and all per-user state (auth + terminology labels) are cleared in
// one step.
//
// Local state is cleared FIRST (synchronously, before any await) so the
// session marker is gone the moment logout starts, even if a caller forgets
// to await. Callers must still `await dispatch(logoutUser())` before any
// `window.location` navigation, otherwise the full-page reload cancels the
// in-flight cookie-clear request and the cookie survives server-side.
export const logoutUser = createAsyncThunk("auth/logoutUser", async (_, { dispatch }) => {
  dispatch(resetTerminology());
  dispatch(authSliceActions.logout());
  try {
    await authAPI.logout(); // clears the httpOnly cookie server-side
  } catch {
    // Cookie clearing is best-effort; local state is already reset above.
  }
  return true;
});

export const fetchMe = createAsyncThunk("auth/me", async (_, { rejectWithValue }) => {
  try {
    const res = await authAPI.me();
    return res.data.data as AuthUser;
  } catch {
    return rejectWithValue("Session expired");
  }
});

// ── Slice ─────────────────────────────────────────────────────

const initialState: AuthState = {
  user: null,
  hasSession: typeof window !== "undefined" ? hasSessionMarker() : false,
  tenantSlug: typeof window !== "undefined" ? localStorage.getItem("tenantSlug") : null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.hasSession = false;
      state.tenantSlug = null;
      if (typeof window !== "undefined") {
        clearSessionMarker();
        localStorage.removeItem("tenantId");
        localStorage.removeItem("tenantSlug");
      }
    },
    clearError(state) {
      state.error = null;
    },
    // Records a session that was established by something other than the
    // password thunk above — today, a passkey sign-in. The cookies are already
    // set by the time this runs; this is only the client-side bookkeeping the
    // login thunk does in its fulfilled case, kept in one place so the two
    // paths cannot drift.
    sessionEstablished(state, action: { payload: AuthUser }) {
      state.user = action.payload;
      state.hasSession = true;
      state.loading = false;
      state.error = null;
      if (typeof window !== "undefined") {
        setSessionMarker();
        localStorage.setItem("tenantId", action.payload.tenant_id || "");
      }
    },
    setTenantSlug(state, action: { payload: string }) {
      state.tenantSlug = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("tenantSlug", action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // login
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.hasSession = true;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchMe
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.hasSession = true;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.hasSession = false;
        if (typeof window !== "undefined") clearSessionMarker();
      });
  },
});

// Re-exported for the logoutUser thunk above (thunks run before the slice
// object finishes initializing, so we capture the action creators here).
const authSliceActions = authSlice.actions;

export const { logout, clearError, setTenantSlug, sessionEstablished } =
  authSlice.actions;
export default authSlice.reducer;
