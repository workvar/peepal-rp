import type { DayOfWeek } from "@/store/slices/timetableSlice";

// ── Types ──────────────────────────────────────────────────────────────────

export interface TimetableSlot {
  id: string;
  academicYearId: string;
  courseId: string;
  subjectId: string;
  employeeId: string;
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  startTime: string;
  endTime: string;
  semester: number;
  section: string;
  room: string;
  course?: { id: string; name: string; code: string };
  subject?: { id: string; name: string; code: string };
}

export interface SubjectOption { id: string; name: string; code: string; }
export interface CourseOption  { id: string; name: string; code: string; }

// ── Helpers ────────────────────────────────────────────────────────────────

export const DAY_COLORS: Record<DayOfWeek, string> = {
  Monday:    "rgba(31,93,54,0.12)",
  Tuesday:   "rgba(6,182,212,0.12)",
  Wednesday: "rgba(16,185,129,0.12)",
  Thursday:  "rgba(245,158,11,0.12)",
  Friday:    "rgba(239,68,68,0.12)",
  Saturday:  "rgba(156,163,175,0.12)",
};

export const DAY_TEXT: Record<DayOfWeek, string> = {
  Monday:    "#1f5d36", Tuesday:   "#0891b2", Wednesday: "#059669",
  Thursday:  "#d97706", Friday:    "#dc2626", Saturday:  "#6b7280",
};

export function formatTime(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// ── Slot form ──────────────────────────────────────────────────────────────

export interface SlotForm {
  dayOfWeek: DayOfWeek;
  periodNumber: string;
  startTime: string;
  endTime: string;
  subjectId: string;
  room: string;
}

export const EMPTY_FORM: SlotForm = {
  dayOfWeek: "Monday",
  periodNumber: "1",
  startTime: "09:00",
  endTime: "10:00",
  subjectId: "",
  room: "",
};
