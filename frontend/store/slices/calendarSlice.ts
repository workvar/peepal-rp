import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apolloClient } from "@/lib/apollo";
import { GET_CALENDAR_SETTINGS, GET_CALENDAR_MONTH } from "@/graphql/queries/calendar";
import {
  UPDATE_CALENDAR_SETTINGS,
  GENERATE_CALENDAR,
  UPSERT_CALENDAR_DAY,
} from "@/graphql/mutations/calendar";
import type { CalendarSettings, CalendarMonth } from "@/types";

// ── Casing bridge ───────────────────────────────────────────────
// GraphQL exposes camelCase (sundayOff/saturdayRule/saturdayWeeks/defaultWorking)
// while the rest of the app types CalendarSettings in snake_case. Map across the
// boundary so reads populate the form and writes match UpdateCalendarSettingsInput
// (sending snake_case keys as variables is what triggered the 422).
type GqlCalendarSettings = {
  id?: string;
  sundayOff?: boolean;
  saturdayRule?: CalendarSettings["saturday_rule"];
  saturdayWeeks?: string;
  defaultWorking?: number;
};

function fromGql(s: GqlCalendarSettings | null): CalendarSettings | null {
  if (!s) return null;
  return {
    id: s.id,
    sunday_off: !!s.sundayOff,
    saturday_rule: s.saturdayRule ?? "none",
    saturday_weeks: s.saturdayWeeks ?? "",
    default_working: s.defaultWorking ?? 0,
  };
}

function toGqlInput(s: Partial<CalendarSettings>): GqlCalendarSettings {
  const input: GqlCalendarSettings = {};
  if (s.sunday_off !== undefined) input.sundayOff = s.sunday_off;
  if (s.saturday_rule !== undefined) input.saturdayRule = s.saturday_rule;
  if (s.saturday_weeks !== undefined) input.saturdayWeeks = s.saturday_weeks;
  if (s.default_working !== undefined) input.defaultWorking = s.default_working;
  return input;
}

// ── Thunks ──────────────────────────────────────────────────────

export const fetchCalendarSettings = createAsyncThunk(
  "calendar/fetchSettings",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.query({
        query: GET_CALENDAR_SETTINGS,
        fetchPolicy: "network-only",
      });
      return fromGql(data.calendarSettings);
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to fetch calendar settings");
    }
  }
);

export const updateCalendarSettings = createAsyncThunk(
  "calendar/updateSettings",
  async (patch: Partial<CalendarSettings>, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_CALENDAR_SETTINGS,
        variables: { input: toGqlInput(patch) },
      });
      return fromGql(data.updateCalendarSettings);
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to update settings");
    }
  }
);

export const generateCalendar = createAsyncThunk(
  "calendar/generate",
  async (year: number, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: GENERATE_CALENDAR,
        variables: { year },
      });
      return data.generateCalendar as { year: number; created: number };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to generate calendar");
    }
  }
);

export const fetchCalendarMonth = createAsyncThunk(
  "calendar/fetchMonth",
  async (params: { year: number; month: number }, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.query({
        query: GET_CALENDAR_MONTH,
        variables: { year: params.year, month: params.month },
        fetchPolicy: "network-only",
      });
      return data.calendarMonth as CalendarMonth;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to fetch month");
    }
  }
);

export const upsertCalendarDay = createAsyncThunk(
  "calendar/upsertDay",
  async (
    input: { date: string; type: string; name?: string },
    { rejectWithValue }
  ) => {
    try {
      await apolloClient.mutate({
        mutation: UPSERT_CALENDAR_DAY,
        variables: { input },
      });
      return input;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to save day");
    }
  }
);

// ── State ───────────────────────────────────────────────────────

interface CalendarState {
  settings: CalendarSettings | null;
  month: CalendarMonth | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: CalendarState = {
  settings: null,
  month: null,
  loading: false,
  saving: false,
  error: null,
};

const calendarSlice = createSlice({
  name: "calendar",
  initialState,
  reducers: {
    clearCalendarError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCalendarSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
      })
      .addCase(updateCalendarSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
      })
      .addCase(fetchCalendarMonth.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCalendarMonth.fulfilled, (state, action) => {
        state.loading = false;
        state.month = action.payload;
      })
      .addCase(fetchCalendarMonth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(generateCalendar.pending, (state) => {
        state.saving = true;
      })
      .addCase(generateCalendar.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(generateCalendar.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      .addCase(upsertCalendarDay.pending, (state) => {
        state.saving = true;
      })
      .addCase(upsertCalendarDay.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(upsertCalendarDay.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCalendarError } = calendarSlice.actions;
export default calendarSlice.reducer;
