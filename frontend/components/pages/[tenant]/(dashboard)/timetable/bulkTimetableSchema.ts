// Client-side bulk schema for the weekly timetable. One file can cover many
// programmes / semesters / sections: each row is one period slot. Stays
// GraphQL-pure — rows are submitted one-by-one through CREATE_TIMETABLE_SLOT
// (additive; it never wipes existing slots).
import type { BulkRowError, BulkSchema } from "@/api/services/bulk";
import { DAYS } from "@/store/slices/timetableSlice";

// Resolved course details, keyed by lower-cased course code.
export interface CourseRef {
  id: string;
  total: number; // total semesters, 0 if unknown
  label: string; // "Name (CODE)" for messages
}

// The CREATE_TIMETABLE_SLOT input. References are sent as UUIDs resolved from
// the human codes typed in the CSV.
export interface TimetableInput {
  courseId: string;
  subjectId: string;
  employeeId?: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  semester: number;
  section?: string;
  room?: string;
}

// HH:MM 24-hour, hours 0–23, minutes 00–59. Single-digit hour allowed on input.
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

// One row = one period. Course/subject required; teacher/section/room optional.
export function buildBulkTimetableSchema(sampleCourseCode = "", sampleSubjectCode = ""): BulkSchema {
  return {
    resource: "timetable",
    title: "Timetable",
    description:
      "Add weekly class periods. Each row is one period for one programme, " +
      "semester, section, day and time. A single file can cover multiple " +
      "programmes. Slots are added to the existing timetable (nothing is removed).",
    fields: [
      { name: "course_code", label: "Programme Code", type: "string", required: true, example: sampleCourseCode || "BTECH-CSE" },
      { name: "semester", label: "Semester", type: "int", required: true, min: 1, example: "1" },
      { name: "section", label: "Section", type: "string", required: false, example: "A" },
      { name: "day", label: "Day", type: "enum", required: true, allowed_values: [...DAYS], example: "Monday" },
      { name: "period", label: "Period", type: "int", required: true, min: 1, example: "1" },
      { name: "start_time", label: "Start (HH:MM)", type: "string", required: true, example: "09:00" },
      { name: "end_time", label: "End (HH:MM)", type: "string", required: true, example: "10:00" },
      { name: "subject_code", label: "Subject Code", type: "string", required: true, example: sampleSubjectCode || "CS201" },
      { name: "teacher", label: "Teacher (ID/email)", type: "string", required: false, example: "EMP001" },
      { name: "room", label: "Room", type: "string", required: false, example: "LH-3" },
    ],
  };
}

// Example rows for the downloadable template, keyed by column name.
export function timetableExampleRows(sampleCourseCode: string, sampleSubjectCodes: string[]): Record<string, string>[] {
  const cc = sampleCourseCode || "BTECH-CSE";
  return [
    { course_code: cc, semester: "1", section: "A", day: "Monday", period: "1", start_time: "09:00", end_time: "10:00", subject_code: sampleSubjectCodes[0] ?? "CS101", teacher: "", room: "LH-1" },
    { course_code: cc, semester: "1", section: "A", day: "Monday", period: "2", start_time: "10:00", end_time: "11:00", subject_code: sampleSubjectCodes[1] ?? "MA101", teacher: "", room: "LH-1" },
    { course_code: cc, semester: "1", section: "A", day: "Tuesday", period: "1", start_time: "09:00", end_time: "10:00", subject_code: sampleSubjectCodes[2] ?? "CS102", teacher: "", room: "Lab-2" },
  ];
}

// Build the CSV template text (header + example rows) for download.
export function buildTimetableCsvTemplate(schema: BulkSchema, sampleCourseCode: string, sampleSubjectCodes: string[]): string {
  const header = schema.fields.map((f) => f.name);
  const rows = timetableExampleRows(sampleCourseCode, sampleSubjectCodes).map((ex) => header.map((h) => ex[h] ?? ""));
  return [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Minutes-since-midnight for an HH:MM string, or null if malformed.
function toMinutes(v: string): number | null {
  if (!TIME_RE.test(v)) return null;
  const [h, m] = v.split(":").map(Number);
  return h * 60 + m;
}

// Normalise a day / time / etc. to the canonical stored form.
export function canonicalDay(v: string): string {
  const hit = DAYS.find((d) => d.toLowerCase() === v.trim().toLowerCase());
  return hit ?? v.trim();
}
export function normalizeTime(v: string): string {
  const [h, m] = v.trim().split(":");
  return `${String(parseInt(h, 10)).padStart(2, "0")}:${m}`;
}

// Cross-field checks the per-cell validator can't express.
export function extraTimetableErrors(
  index: number,
  row: Record<string, string>,
  courseByCode: Map<string, CourseRef>,
  subjectCodeToId: Map<string, string>,
  teacherToId: Map<string, string>,
): BulkRowError[] {
  const errs: BulkRowError[] = [];
  const get = (k: string) => (row[k] ?? "").trim();

  const course = get("course_code") ? courseByCode.get(get("course_code").toLowerCase()) : undefined;
  if (get("course_code") && !course) errs.push({ index, field: "course_code", error: "unknown programme code" });

  if (get("subject_code") && !subjectCodeToId.has(get("subject_code").toLowerCase())) {
    errs.push({ index, field: "subject_code", error: "unknown subject code" });
  }

  const semRaw = get("semester");
  if (course && course.total > 0 && /^\d+$/.test(semRaw) && parseInt(semRaw, 10) > course.total) {
    errs.push({ index, field: "semester", error: `max semester ${course.total} for ${course.label}` });
  }

  const start = get("start_time");
  const end = get("end_time");
  if (start && !TIME_RE.test(start)) errs.push({ index, field: "start_time", error: "expected HH:MM" });
  if (end && !TIME_RE.test(end)) errs.push({ index, field: "end_time", error: "expected HH:MM" });
  const sm = toMinutes(start);
  const em = toMinutes(end);
  if (sm !== null && em !== null && em <= sm) {
    errs.push({ index, field: "end_time", error: "end must be after start" });
  }

  if (get("teacher") && !teacherToId.has(get("teacher").toLowerCase())) {
    errs.push({ index, field: "teacher", error: "unknown teacher (use Employee ID or email)" });
  }

  return errs;
}

// Flag rows that double-book the same course/semester/section/day/period within
// the uploaded file (the most common timetable mistake). The error lands on the
// `period` cell of every row that shares a key.
export function collisionErrors(rows: Record<string, string>[]): BulkRowError[] {
  const seen = new Map<string, number[]>();
  rows.forEach((r, i) => {
    const key = ["course_code", "semester", "section", "day", "period"]
      .map((k) => (r[k] ?? "").trim().toLowerCase())
      .join("|");
    // Only consider rows that actually have the key parts filled.
    if ((r.course_code ?? "").trim() && (r.day ?? "").trim() && (r.period ?? "").trim()) {
      seen.set(key, [...(seen.get(key) ?? []), i]);
    }
  });
  const errs: BulkRowError[] = [];
  for (const idxs of seen.values()) {
    if (idxs.length > 1) {
      for (const i of idxs) errs.push({ index: i, field: "period", error: "duplicate slot (same course/sem/section/day/period)" });
    }
  }
  return errs;
}

// Map an edited CSV row to a CREATE_TIMETABLE_SLOT input.
export function rowToTimetableInput(
  row: Record<string, string>,
  courseByCode: Map<string, CourseRef>,
  subjectCodeToId: Map<string, string>,
  teacherToId: Map<string, string>,
): TimetableInput {
  const get = (k: string) => (row[k] ?? "").trim();
  return {
    courseId: courseByCode.get(get("course_code").toLowerCase())?.id ?? "",
    subjectId: subjectCodeToId.get(get("subject_code").toLowerCase()) ?? "",
    employeeId: get("teacher") ? teacherToId.get(get("teacher").toLowerCase()) : undefined,
    dayOfWeek: canonicalDay(get("day")),
    periodNumber: parseInt(get("period"), 10),
    startTime: normalizeTime(get("start_time")),
    endTime: normalizeTime(get("end_time")),
    semester: parseInt(get("semester"), 10),
    section: get("section") || undefined,
    room: get("room") || undefined,
  };
}
