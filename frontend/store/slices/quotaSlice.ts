import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { quotaAPI } from "@/lib/api";
import type { QuotaStatus } from "@/types";

// Tracks the signed-in tenant's usage-vs-limits, used by the persistent
// over-quota banner. Kept separate from the (admin-only) subscription slice so
// every role can load it without touching billing details.

interface QuotaState {
  status: QuotaStatus | null;
  loaded: boolean;
}

const initialState: QuotaState = { status: null, loaded: false };

export const fetchMyQuota = createAsyncThunk("quota/fetchMy", async () => {
  const res = await quotaAPI.status();
  return res.data.data as QuotaStatus;
});

const quotaSlice = createSlice({
  name: "quota",
  initialState,
  reducers: {
    resetQuota(state) {
      state.status = null;
      state.loaded = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyQuota.fulfilled, (state, action) => {
        state.status = action.payload;
        state.loaded = true;
      })
      // A failed fetch shouldn't block the dashboard; just mark it resolved so
      // the banner stays hidden rather than retrying forever.
      .addCase(fetchMyQuota.rejected, (state) => {
        state.loaded = true;
      });
  },
});

export const { resetQuota } = quotaSlice.actions;
export default quotaSlice.reducer;
