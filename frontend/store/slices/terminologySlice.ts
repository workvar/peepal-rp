import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apolloClient } from "@/lib/apollo";
import { GET_TERMINOLOGY } from "@/graphql/queries/terminology";
import { getTerminology, type Terminology } from "@/constants/terminology";
import type { TenantType } from "@/types";

/** GraphQL TerminologyLabels is camelCase; the UI Terminology map is snake_case. */
type RawLabels = Partial<Terminology> & {
  organizationPlural?: string;
  memberPlural?: string;
  staffPlural?: string;
  departmentPlural?: string;
  coursePlural?: string;
};

function canonicalType(raw: string | null | undefined): TenantType | null {
  if (!raw) return null;
  if (raw === "college") return "education";
  if (raw === "enterprise") return "corporate";
  if (
    raw === "education" ||
    raw === "corporate" ||
    raw === "healthcare" ||
    raw === "nonprofit"
  ) {
    return raw;
  }
  return null;
}

function mergeLabels(type: TenantType, raw?: RawLabels | null): Terminology {
  const base = getTerminology(type);
  if (!raw) return base;
  return {
    ...base,
    organization: raw.organization ?? base.organization,
    organization_plural:
      raw.organization_plural ?? raw.organizationPlural ?? base.organization_plural,
    member: raw.member ?? base.member,
    member_plural: raw.member_plural ?? raw.memberPlural ?? base.member_plural,
    staff: raw.staff ?? base.staff,
    staff_plural: raw.staff_plural ?? raw.staffPlural ?? base.staff_plural,
    department: raw.department ?? base.department,
    department_plural:
      raw.department_plural ?? raw.departmentPlural ?? base.department_plural,
    course: raw.course ?? base.course,
    course_plural: raw.course_plural ?? raw.coursePlural ?? base.course_plural,
    attendance: raw.attendance ?? base.attendance,
    marks: raw.marks ?? base.marks,
    leave: raw.leave ?? base.leave,
  };
}

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
      return { type: terminology.type as string, labels: terminology.labels as RawLabels };
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
    setTenantType(state, action: { payload: TenantType | string }) {
      const type = canonicalType(action.payload);
      if (!type) return;
      state.type = type;
      state.labels = getTerminology(type);
    },
    reset(state) {
      state.type = null;
      state.labels = getTerminology("education");
      state.loaded = false;
    },
  },
  extraReducers: (builder) => {
    // Mark the fetch settled even on failure so route guards waiting on
    // `loaded` don't hang forever. Keep any type already hydrated from
    // login/me so a GraphQL miss doesn't fail-open back to Students.
    builder.addCase(fetchTerminology.rejected, (state) => {
      state.loaded = true;
    });
    builder.addCase(fetchTerminology.fulfilled, (state, action) => {
      const type = canonicalType(action.payload.type) ?? state.type ?? "education";
      state.type = type;
      state.labels = mergeLabels(type, action.payload.labels);
      state.loaded = true;
    });
  },
});

export const { setTenantType, reset: resetTerminology } = terminologySlice.actions;
export default terminologySlice.reducer;
