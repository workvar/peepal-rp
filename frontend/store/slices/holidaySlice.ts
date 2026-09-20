import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apolloClient } from "@/lib/apollo";
import { GET_HOLIDAYS } from "@/graphql/queries/holidays";
import { GET_ATTENDANCE_SETTINGS } from "@/graphql/queries/calendar";
import { UPDATE_ATTENDANCE_SETTINGS } from "@/graphql/mutations/calendar";
import {
  CREATE_HOLIDAY,
  DELETE_HOLIDAY,
  BULK_DELETE_HOLIDAYS,
  COPY_HOLIDAYS_TO_ACADEMIC_YEAR,
} from "@/graphql/mutations/holidays";
import { attendanceSummaryAPI } from "@/lib/api";
import type { Holiday, AttendanceSettings, AttendanceSummaryRow, ShortageItem } from "@/types";

export const fetchHolidays = createAsyncThunk(
  "holiday/fetchHolidays",
  async (
    params: { year?: number; academic_year_id?: string } | number | undefined,
    { rejectWithValue }
  ) => {
    try {
      const p = typeof params === "number" ? { year: params }
               : typeof params === "undefined" ? {}
               : params;
      const { data } = await apolloClient.query({
        query: GET_HOLIDAYS,
        variables: {
          year: p.year != null ? String(p.year) : undefined,
          academicYearId: p.academic_year_id,
        },
        fetchPolicy: "network-only",
      });
      return data.holidays as Holiday[];
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to fetch holidays");
    }
  }
);

export const createHoliday = createAsyncThunk(
  "holiday/create",
  async (input: object, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_HOLIDAY,
        variables: { input },
      });
      // createHoliday returns [Holiday!]! (may create multiple for date ranges)
      return data.createHoliday as Holiday[];
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to create holiday");
    }
  }
);

export const deleteHoliday = createAsyncThunk(
  "holiday/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await apolloClient.mutate({ mutation: DELETE_HOLIDAY, variables: { id } });
      return id;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to delete holiday");
    }
  }
);

export const bulkDeleteHolidays = createAsyncThunk(
  "holiday/bulkDelete",
  async (ids: string[], { rejectWithValue }) => {
    try {
      await apolloClient.mutate({ mutation: BULK_DELETE_HOLIDAYS, variables: { ids } });
      return ids;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to delete holidays");
    }
  }
);

export const copyHolidaysToAcademicYear = createAsyncThunk(
  "holiday/copyToAcademicYear",
  async (args: { ids: string[]; targetAcademicYearId: string }, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: COPY_HOLIDAYS_TO_ACADEMIC_YEAR,
        variables: { ids: args.ids, targetAcademicYearId: args.targetAcademicYearId },
      });
      return data.copyHolidaysToAcademicYear as { copied: number };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to copy holidays");
    }
  }
);

export const fetchAttendanceSettings = createAsyncThunk(
  "holiday/fetchSettings",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.query({
        query: GET_ATTENDANCE_SETTINGS,
        fetchPolicy: "network-only",
      });
      return data.attendanceSettings as AttendanceSettings;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to fetch settings");
    }
  }
);

export const updateAttendanceSettings = createAsyncThunk(
  "holiday/updateSettings",
  async (input: object, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_ATTENDANCE_SETTINGS,
        variables: { input },
      });
      return data.updateAttendanceSettings as AttendanceSettings;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to update settings");
    }
  }
);

// Attendance summary and shortage still use REST (returns complex aggregated data).
export const fetchAttendanceSummary = createAsyncThunk(
  "holiday/fetchSummary",
  async (params: { entity_type?: string; subject_id?: string; from_date?: string; to_date?: string } | undefined, { rejectWithValue }) => {
    try {
      const res = await attendanceSummaryAPI.summary(params);
      return res.data.data as AttendanceSummaryRow[];
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(e.response?.data?.error || "Failed to fetch summary");
    }
  }
);

export const fetchShortageList = createAsyncThunk(
  "holiday/fetchShortage",
  async (_, { rejectWithValue }) => {
    try {
      const res = await attendanceSummaryAPI.shortage();
      return res.data.data as { threshold: number; students: ShortageItem[]; count: number };
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(e.response?.data?.error || "Failed to fetch shortage list");
    }
  }
);

interface HolidayState {
  holidays: Holiday[];
  settings: AttendanceSettings | null;
  summary: AttendanceSummaryRow[];
  shortage: ShortageItem[];
  shortageThreshold: number;
  loading: boolean;
  error: string | null;
}

const initialState: HolidayState = {
  holidays: [],
  settings: null,
  summary: [],
  shortage: [],
  shortageThreshold: 75,
  loading: false,
  error: null,
};

const holidaySlice = createSlice({
  name: "holiday",
  initialState,
  reducers: { clearHolidayError(state) { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHolidays.pending, (state) => { state.loading = true; })
      .addCase(fetchHolidays.fulfilled, (state, action) => { state.loading = false; state.holidays = action.payload ?? []; })
      .addCase(fetchHolidays.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createHoliday.fulfilled, (state, action) => {
        // createHoliday returns an array (may expand date ranges)
        state.holidays.push(...(action.payload ?? []));
      })
      .addCase(deleteHoliday.fulfilled, (state, action) => { state.holidays = state.holidays.filter((h) => h.id !== action.payload); })
      .addCase(bulkDeleteHolidays.fulfilled, (state, action) => {
        const removed = new Set(action.payload);
        state.holidays = state.holidays.filter((h) => !removed.has(h.id));
      })
      .addCase(fetchAttendanceSettings.fulfilled, (state, action) => { state.settings = action.payload; })
      .addCase(updateAttendanceSettings.fulfilled, (state, action) => { state.settings = action.payload; })
      .addCase(fetchAttendanceSummary.pending, (state) => { state.loading = true; })
      .addCase(fetchAttendanceSummary.fulfilled, (state, action) => { state.loading = false; state.summary = action.payload ?? []; })
      .addCase(fetchAttendanceSummary.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchShortageList.pending, (state) => { state.loading = true; })
      .addCase(fetchShortageList.fulfilled, (state, action) => {
        state.loading = false;
        state.shortage = action.payload.students ?? [];
        state.shortageThreshold = action.payload.threshold ?? 75;
      })
      .addCase(fetchShortageList.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });
  },
});

export const { clearHolidayError } = holidaySlice.actions;
export default holidaySlice.reducer;
