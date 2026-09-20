import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apolloClient } from "@/lib/apollo";
import {
  GET_ORG_PROFILE,
  GET_ORG_SETUP_STATUS,
  GET_SEMESTERS,
  GET_CUSTOM_ROLES,
} from "@/graphql/queries/org";
import {
  UPDATE_ORG_PROFILE,
  UPDATE_ORG_IDENTITY,
  UPDATE_DEPARTMENT,
  DELETE_DEPARTMENT,
  CREATE_ACADEMIC_YEAR,
  UPDATE_ACADEMIC_YEAR,
  SET_CURRENT_ACADEMIC_YEAR,
  CREATE_SEMESTER,
  CREATE_CUSTOM_ROLE,
  UPDATE_CUSTOM_ROLE,
  DELETE_CUSTOM_ROLE,
  ASSIGN_USER_CUSTOM_ROLE,
} from "@/graphql/mutations/org";
import { DELETE_SEMESTER, DELETE_ACADEMIC_YEAR } from "@/graphql/mutations/academic";
import { orgAdminAPI } from "@/lib/api";
import type { Department, AcademicYear, Semester, CustomRole, OrgProfile, SetupStatus } from "@/types";

// ── GraphQL ↔ TS mapping ──────────────────────────────────────
// gqlgen speaks camelCase; our OrgProfile type and the profile form are
// snake_case, and nothing transforms between them. So we map at the slice
// boundary: camelCase → snake_case on read, snake_case → camelCase on write.
// Sending snake_case keys to UpdateOrgProfileInput makes gqlgen reject the
// unknown fields with HTTP 422 (and reading camelCase as snake_case silently
// yields undefined — blank logo/colors).
interface GqlOrgProfile {
  id: string;
  name: string;
  logoUrl: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  accreditation: string;
}

function fromGqlProfile(g: GqlOrgProfile): OrgProfile {
  return {
    id: g.id,
    tenant_id: "",
    name: g.name,
    logo_url: g.logoUrl,
    tagline: g.tagline,
    primary_color: g.primaryColor,
    accent_color: g.accentColor,
    accreditation: g.accreditation,
  };
}

// Snake_case profile-form keys → camelCase UpdateOrgProfileInput. Only known
// branding fields are forwarded; unknown keys are dropped so a stray field
// can't trigger a 422. Identity flags are saved separately via updateOrgIdentity.
const PROFILE_INPUT_KEY_MAP: Record<string, string> = {
  name: "name",
  tagline: "tagline",
  accreditation: "accreditation",
  logo_url: "logoUrl",
  primary_color: "primaryColor",
  accent_color: "accentColor",
};

function toGqlProfileInput(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const gqlKey = PROFILE_INPUT_KEY_MAP[key];
    if (gqlKey !== undefined) out[gqlKey] = value;
  }
  return out;
}

// Semesters come from gqlgen in camelCase, but the Semester type and the
// academic-years page read snake_case (e.g. it filters on academic_year_id).
// Without this map every semester's academic_year_id is undefined, so no
// semester ever matches its year and the page shows "No semesters added yet".
interface GqlSemester {
  id: string;
  academicYearId: string;
  number: number;
  name: string;
  startDate: string;
  endDate: string;
}

function fromGqlSemester(g: GqlSemester): Semester {
  return {
    id: g.id,
    tenant_id: "",
    academic_year_id: g.academicYearId,
    number: g.number,
    name: g.name,
    start_date: g.startDate,
    end_date: g.endDate,
  };
}

// ── Async Thunks ──────────────────────────────────────────────

export const fetchDepartments = createAsyncThunk(
  "org/fetchDepartments",
  async (_, { rejectWithValue }) => {
    try {
      const res = await orgAdminAPI.listDepartments();
      return res.data.data as Department[];
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error || "Failed to fetch departments");
    }
  }
);

export const createDepartment = createAsyncThunk(
  "org/createDepartment",
  async (data: object, { rejectWithValue }) => {
    try {
      const res = await orgAdminAPI.createDepartment(data);
      return res.data.data as Department;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error || "Failed to create department");
    }
  }
);

export const updateDepartment = createAsyncThunk(
  "org/updateDepartment",
  async ({ id, input }: { id: string; input: object }, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_DEPARTMENT,
        variables: { id, input },
      });
      return data.updateDepartment as Department;
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to update department");
    }
  }
);

export const deleteDepartment = createAsyncThunk(
  "org/deleteDepartment",
  async (id: string, { rejectWithValue }) => {
    try {
      await apolloClient.mutate({ mutation: DELETE_DEPARTMENT, variables: { id } });
      return id;
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to delete department");
    }
  }
);

export const fetchAcademicYears = createAsyncThunk(
  "org/fetchAcademicYears",
  async (_, { rejectWithValue }) => {
    try {
      const res = await orgAdminAPI.listAcademicYears();
      return res.data.data as AcademicYear[];
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error || "Failed to fetch academic years");
    }
  }
);

export const createAcademicYear = createAsyncThunk(
  "org/createAcademicYear",
  async (input: object, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_ACADEMIC_YEAR,
        variables: { input },
      });
      return data.createAcademicYear as AcademicYear;
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to create academic year");
    }
  }
);

export const updateAcademicYear = createAsyncThunk(
  "org/updateAcademicYear",
  async ({ id, input }: { id: string; input: object }, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_ACADEMIC_YEAR,
        variables: { id, input },
      });
      return data.updateAcademicYear as AcademicYear;
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to update academic year");
    }
  }
);

export const setCurrentAcademicYear = createAsyncThunk(
  "org/setCurrentAcademicYear",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: SET_CURRENT_ACADEMIC_YEAR,
        variables: { id },
      });
      return data.setCurrentAcademicYear as AcademicYear;
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to set current academic year");
    }
  }
);

export const fetchSemesters = createAsyncThunk(
  "org/fetchSemesters",
  async (academicYearId: string | undefined, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.query({
        query: GET_SEMESTERS,
        variables: { academicYearId },
        fetchPolicy: "network-only",
      });
      return (data.semesters as GqlSemester[]).map(fromGqlSemester);
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to fetch semesters");
    }
  }
);

export const createSemester = createAsyncThunk(
  "org/createSemester",
  async (input: object, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_SEMESTER,
        variables: { input },
      });
      return fromGqlSemester(data.createSemester as GqlSemester);
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to create semester");
    }
  }
);

export const deleteSemester = createAsyncThunk(
  "org/deleteSemester",
  async (id: string, { rejectWithValue }) => {
    try {
      await apolloClient.mutate({ mutation: DELETE_SEMESTER, variables: { id } });
      return id;
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to delete semester");
    }
  }
);

export const deleteAcademicYear = createAsyncThunk(
  "org/deleteAcademicYear",
  async (id: string, { rejectWithValue }) => {
    try {
      await apolloClient.mutate({ mutation: DELETE_ACADEMIC_YEAR, variables: { id } });
      return id;
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to delete academic year");
    }
  }
);

export const fetchRoles = createAsyncThunk(
  "org/fetchRoles",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.query({
        query: GET_CUSTOM_ROLES,
        fetchPolicy: "network-only",
      });
      return data.customRoles as CustomRole[];
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to fetch roles");
    }
  }
);

export const createRole = createAsyncThunk(
  "org/createRole",
  async (input: object, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_CUSTOM_ROLE,
        variables: { input },
      });
      return data.createCustomRole as CustomRole;
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to create role");
    }
  }
);

export const updateRole = createAsyncThunk(
  "org/updateRole",
  async ({ id, input }: { id: string; input: object }, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_CUSTOM_ROLE,
        variables: { id, input },
      });
      return data.updateCustomRole as CustomRole;
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to update role");
    }
  }
);

export const deleteRole = createAsyncThunk(
  "org/deleteRole",
  async (id: string, { rejectWithValue }) => {
    try {
      await apolloClient.mutate({ mutation: DELETE_CUSTOM_ROLE, variables: { id } });
      return id;
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to delete role");
    }
  }
);

// ── User ↔ CustomRole linking ─────────────────────────────────

export const fetchUsersCustomRoles = createAsyncThunk(
  "org/fetchUsersCustomRoles",
  async (_, { rejectWithValue }) => {
    try {
      // Still uses REST — returns a flat list with userId→roleId mapping
      const res = await orgAdminAPI.listUsersCustomRoles();
      const rows = (res.data.data ?? []) as Array<{ id: string; custom_role_id: string | null }>;
      const map: Record<string, string | null> = {};
      for (const r of rows) map[r.id] = r.custom_role_id ?? null;
      return map;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error || "Failed to fetch user roles");
    }
  }
);

export const assignUserCustomRole = createAsyncThunk(
  "org/assignUserCustomRole",
  async (
    { userId, customRoleId }: { userId: string; customRoleId: string | null },
    { rejectWithValue }
  ) => {
    try {
      await apolloClient.mutate({
        mutation: ASSIGN_USER_CUSTOM_ROLE,
        variables: { userId, customRoleId },
      });
      return { userId, customRoleId };
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to assign role");
    }
  }
);

export const fetchSetupStatus = createAsyncThunk(
  "org/fetchSetupStatus",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.query({
        query: GET_ORG_SETUP_STATUS,
        fetchPolicy: "network-only",
      });
      return data.orgSetupStatus as SetupStatus;
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to fetch setup status");
    }
  }
);

export const fetchOrgProfile = createAsyncThunk(
  "org/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.query({
        query: GET_ORG_PROFILE,
        fetchPolicy: "network-only",
      });
      return fromGqlProfile(data.orgProfile as GqlOrgProfile);
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to fetch org profile");
    }
  }
);

export const updateOrgProfile = createAsyncThunk(
  "org/updateProfile",
  async (input: object, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_ORG_PROFILE,
        variables: { input: toGqlProfileInput(input as Record<string, unknown>) },
      });
      return fromGqlProfile(data.updateOrgProfile as GqlOrgProfile);
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to update org profile");
    }
  }
);

// Update the tenant's identity policy (whether staff / students log in by email
// or by Employee ID / Roll Number). Separate from updateOrgProfile so the rest
// of the org profile form is unaffected.
export const updateOrgIdentity = createAsyncThunk(
  "org/updateIdentity",
  async (
    input: { staffEmailRequired?: boolean; studentEmailRequired?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_ORG_IDENTITY,
        variables: { input },
      });
      return data.updateOrgProfile as {
        staffEmailRequired: boolean;
        studentEmailRequired: boolean;
      };
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || "Failed to update login settings");
    }
  }
);

// ── State Type ─────────────────────────────────────────────────

export interface OrgState {
  departments: Department[];
  academicYears: AcademicYear[];
  semesters: Semester[];
  roles: CustomRole[];
  usersCustomRoles: Record<string, string | null>;
  profile: OrgProfile | null;
  setupStatus: SetupStatus | null;
  loading: boolean;
  error: string | null;
}

// ── Initial State ──────────────────────────────────────────────

const initialState: OrgState = {
  departments: [],
  academicYears: [],
  semesters: [],
  roles: [],
  usersCustomRoles: {},
  profile: null,
  setupStatus: null,
  loading: false,
  error: null,
};

// ── Slice ──────────────────────────────────────────────────────

const orgSlice = createSlice({
  name: "org",
  initialState,
  reducers: {
    clearOrgError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDepartments.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchDepartments.fulfilled, (state, action) => { state.loading = false; state.departments = action.payload; })
      .addCase(fetchDepartments.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createDepartment.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createDepartment.fulfilled, (state, action) => { state.loading = false; state.departments.push(action.payload); })
      .addCase(createDepartment.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateDepartment.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateDepartment.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.departments.findIndex((d) => d.id === action.payload.id);
        if (idx !== -1) state.departments[idx] = action.payload;
      })
      .addCase(updateDepartment.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(deleteDepartment.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteDepartment.fulfilled, (state, action) => { state.loading = false; state.departments = state.departments.filter((d) => d.id !== action.payload); })
      .addCase(deleteDepartment.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchAcademicYears.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAcademicYears.fulfilled, (state, action) => { state.loading = false; state.academicYears = action.payload; })
      .addCase(fetchAcademicYears.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createAcademicYear.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createAcademicYear.fulfilled, (state, action) => { state.loading = false; state.academicYears.push(action.payload); })
      .addCase(createAcademicYear.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateAcademicYear.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateAcademicYear.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.academicYears.findIndex((ay) => ay.id === action.payload.id);
        if (idx !== -1) state.academicYears[idx] = action.payload;
      })
      .addCase(updateAcademicYear.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(setCurrentAcademicYear.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(setCurrentAcademicYear.fulfilled, (state, action) => {
        state.loading = false;
        state.academicYears = state.academicYears.map((ay) =>
          ay.id === action.payload.id ? action.payload : { ...ay, is_current: false }
        );
      })
      .addCase(setCurrentAcademicYear.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchSemesters.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSemesters.fulfilled, (state, action) => { state.loading = false; state.semesters = action.payload; })
      .addCase(fetchSemesters.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createSemester.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createSemester.fulfilled, (state, action) => { state.loading = false; state.semesters.push(action.payload); })
      .addCase(createSemester.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(deleteSemester.fulfilled, (state, action) => { state.semesters = state.semesters.filter((s) => s.id !== action.payload); })
      .addCase(deleteSemester.rejected, (state, action) => { state.error = action.payload as string; })
      .addCase(deleteAcademicYear.fulfilled, (state, action) => {
        state.academicYears = state.academicYears.filter((ay) => ay.id !== action.payload);
        state.semesters = state.semesters.filter((s) => s.academic_year_id !== action.payload);
      })
      .addCase(deleteAcademicYear.rejected, (state, action) => { state.error = action.payload as string; })
      .addCase(fetchRoles.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchRoles.fulfilled, (state, action) => { state.loading = false; state.roles = action.payload; })
      .addCase(fetchRoles.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createRole.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createRole.fulfilled, (state, action) => { state.loading = false; state.roles.push(action.payload); })
      .addCase(createRole.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateRole.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateRole.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.roles.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.roles[idx] = action.payload;
      })
      .addCase(updateRole.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(deleteRole.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteRole.fulfilled, (state, action) => { state.loading = false; state.roles = state.roles.filter((r) => r.id !== action.payload); })
      .addCase(deleteRole.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchUsersCustomRoles.fulfilled, (state, action) => { state.usersCustomRoles = action.payload; })
      .addCase(fetchUsersCustomRoles.rejected, (state, action) => { state.error = action.payload as string; })
      .addCase(assignUserCustomRole.fulfilled, (state, action) => {
        state.usersCustomRoles[action.payload.userId] = action.payload.customRoleId;
      })
      .addCase(assignUserCustomRole.rejected, (state, action) => { state.error = action.payload as string; })
      .addCase(fetchSetupStatus.pending, (state) => { state.loading = true; })
      .addCase(fetchSetupStatus.fulfilled, (state, action) => { state.loading = false; state.setupStatus = action.payload; })
      .addCase(fetchSetupStatus.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchOrgProfile.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchOrgProfile.fulfilled, (state, action) => { state.loading = false; state.profile = action.payload; })
      .addCase(fetchOrgProfile.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateOrgProfile.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateOrgProfile.fulfilled, (state, action) => { state.loading = false; state.profile = action.payload; })
      .addCase(updateOrgProfile.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });
  },
});

export const { clearOrgError } = orgSlice.actions;
export default orgSlice.reducer;
