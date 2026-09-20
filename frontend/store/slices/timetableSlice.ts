import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface TimetableSlot {
  id: string;
  tenant_id: string;
  academic_year_id: string;
  course_id: string;
  subject_id: string;
  employee_id: string;
  day_of_week: DayOfWeek;
  period_number: number;
  start_time: string;
  end_time: string;
  semester: number;
  section: string;
  room: string;
  course?: { id: string; name: string; code: string };
  subject?: { id: string; name: string; code: string };
}

export interface TimetableFilter {
  course_id?: string;
  semester?: number;
  section?: string;
  academic_year_id?: string;
  employee_id?: string;
}

interface TimetableState {
  slots: TimetableSlot[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

// ── Thunks ─────────────────────────────────────────────────────────────────

export const fetchTimetable = createAsyncThunk(
  "timetable/fetch",
  async (params: TimetableFilter, { rejectWithValue }) => {
    try {
      const res = await api.get("/timetable", { params });
      return res.data.data as TimetableSlot[];
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(e.response?.data?.error ?? "Failed to load timetable");
    }
  }
);

export const createSlotThunk = createAsyncThunk(
  "timetable/createSlot",
  async (data: Partial<TimetableSlot>, { rejectWithValue }) => {
    try {
      const res = await api.post("/timetable", data);
      return res.data.data as TimetableSlot;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(e.response?.data?.error ?? "Failed to create slot");
    }
  }
);

export const updateSlotThunk = createAsyncThunk(
  "timetable/updateSlot",
  async ({ id, data }: { id: string; data: Partial<TimetableSlot> }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/timetable/${id}`, data);
      return res.data.data as TimetableSlot;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(e.response?.data?.error ?? "Failed to update slot");
    }
  }
);

export const deleteSlotThunk = createAsyncThunk(
  "timetable/deleteSlot",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/timetable/${id}`);
      return id;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(e.response?.data?.error ?? "Failed to delete slot");
    }
  }
);

export const bulkSaveTimetable = createAsyncThunk(
  "timetable/bulkSave",
  async (payload: {
    course_id: string;
    academic_year_id: string;
    semester: number;
    section: string;
    slots: Partial<TimetableSlot>[];
  }, { rejectWithValue }) => {
    try {
      const res = await api.post("/timetable/bulk", payload);
      return res.data.data as TimetableSlot[];
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(e.response?.data?.error ?? "Failed to save timetable");
    }
  }
);

// ── Slice ──────────────────────────────────────────────────────────────────

const timetableSlice = createSlice({
  name: "timetable",
  initialState: { slots: [], loading: false, saving: false, error: null } as TimetableState,
  reducers: {
    clearTimetableError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchTimetable.pending,  (s) => { s.loading = true; s.error = null; })
      .addCase(fetchTimetable.fulfilled,(s, a) => { s.loading = false; s.slots = a.payload; })
      .addCase(fetchTimetable.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; })
      // create
      .addCase(createSlotThunk.fulfilled, (s, a) => { s.slots.push(a.payload); })
      // update
      .addCase(updateSlotThunk.fulfilled, (s, a) => {
        const idx = s.slots.findIndex((x) => x.id === a.payload.id);
        if (idx >= 0) s.slots[idx] = a.payload;
      })
      // delete
      .addCase(deleteSlotThunk.fulfilled, (s, a) => {
        s.slots = s.slots.filter((x) => x.id !== a.payload);
      })
      // bulk save
      .addCase(bulkSaveTimetable.pending,   (s) => { s.saving = true; s.error = null; })
      .addCase(bulkSaveTimetable.fulfilled, (s, a) => { s.saving = false; s.slots = a.payload; })
      .addCase(bulkSaveTimetable.rejected,  (s, a) => { s.saving = false; s.error = a.payload as string; });
  },
});

export const { clearTimetableError } = timetableSlice.actions;
export default timetableSlice.reducer;
