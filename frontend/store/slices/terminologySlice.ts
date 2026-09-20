import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apolloClient } from "@/lib/apollo";
import { GET_TERMINOLOGY } from "@/graphql/queries/terminology";
import { getTerminology, type Terminology } from "@/constants/terminology";
import type { TenantType } from "@/types";

// Fetches the label map for the current tenant (resolves server-side
// from the authenticated tenant's type). Safe to call repeatedly;
// falls back to education defaults if the request fails.
export const fetchTerminology = createAsyncThunk(
  "terminology/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.query({
        query: GET_TERMINOLOGY,
        fetchPolicy: "network-only",
      });
      const { terminology } = data;
      return { type: terminology.type as TenantType, labels: terminology.labels as Terminology };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to fetch terminology");
    }
  }
);

interface TerminologyState {
  type: TenantType | null;
  labels: Terminology;
  loaded: boolean;
}

// Default to education labels so the UI is never empty before the
// fetch completes (or for public pages that never fetch).
const initialState: TerminologyState = {
  type: null,
  labels: getTerminology("education"),
  loaded: false,
};

const terminologySlice = createSlice({
  name: "terminology",
  initialState,
  reducers: {
    // Used by auth flow to preload labels once the tenant type is known,
    // avoiding a flash of the wrong copy before the API resolves.
    setTenantType(state, action: { payload: TenantType }) {
      state.type = action.payload;
      state.labels = getTerminology(action.payload);
    },
    reset(state) {
      state.type = null;
      state.labels = getTerminology("education");
      state.loaded = false;
    },
  },
  extraReducers: (builder) => {
    // Mark the fetch settled even on failure so route guards waiting on
    // `loaded` don't hang forever; `type` stays null, which callers treat as
    // "industry unknown, don't filter".
    builder.addCase(fetchTerminology.rejected, (state) => {
      state.loaded = true;
    });
    builder.addCase(fetchTerminology.fulfilled, (state, action) => {
      state.type = action.payload.type;
      // Prefer server labels so super-admin-driven overrides win; fall
      // back to the bundled defaults for any missing field.
      state.labels = { ...getTerminology(action.payload.type), ...action.payload.labels };
      state.loaded = true;
    });
  },
});

export const { setTenantType, reset: resetTerminology } = terminologySlice.actions;
export default terminologySlice.reducer;
