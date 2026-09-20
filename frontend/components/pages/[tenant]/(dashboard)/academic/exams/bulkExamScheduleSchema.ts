// Client-side bulk-add schema for Exam Schedules. Mirrors the shared BulkUpload
// building blocks but stays GraphQL-pure: rows are submitted one by one through
// CREATE_EXAM_SCHEDULE, so no REST endpoint or backend codegen is involved.
// Academic year is given by NAME and resolved to an id client-side.
import type { BulkRowError, BulkSchema } from "@/api/services/bulk";

// Matches the CreateExamScheduleInput GraphQL input.
export interface ExamScheduleInput {
  name: string;
  examType: string;
  semesterNumber: number;
  academicYearId?: string | null;
  startDate?: string;
  endDate?: string;
  instructions?: string;
}

// Build the bulk schema with dynamic exam type names from the ExamTypes module.
export function buildBulkExamScheduleSchema(examTypeNames: string[]): BulkSchema {
  return {
  resource: "exam-schedules",
  title: "Exam Schedules",
  description:
    "Bulk-create exam schedules. One row per exam window. Schedules are created " +
    "unpublished -- publish them to students afterwards. Leave Academic Year blank " +
    "to skip the link.",
  fields: [
    { name: "name", label: "Name", type: "string", required: true, example: "Mid-Semester Exam 2024" },
    {
      name: "exam_type",
      label: "Exam Type",
      type: "enum",
      required: true,
      allowed_values: examTypeNames,
      example: examTypeNames[0] ?? "internal",
    },
    { name: "semester", label: "Semester", type: "int", required: false, min: 1, max: 8, example: "3" },
    {
      name: "academic_year",
      label: "Academic Year",
      type: "string",
      required: false,
      example: "2024-2025",
      description: "Academic year name exactly as it appears in your org. Blank = no link.",
    },
    { name: "start_date", label: "Start Date", type: "date", required: false, example: "2024-11-10" },
    { name: "end_date", label: "End Date", type: "date", required: false, example: "2024-11-20" },
    {
      name: "instructions",
      label: "Instructions",
      type: "string",
      required: false,
      example: "Bring hall ticket and college ID.",
    },
  ],
  };
}

// Example rows for the downloadable template (column order matches fields).
// examType is a placeholder; callers substitute the first real exam type name.
const exampleRows = (firstType: string): string[][] => [
  [`${firstType} Assessment 1`, firstType, "3", "2024-2025", "2024-09-02", "2024-09-06", "Syllabus: units 1-2."],
  ["Mid-Semester Exam", firstType, "3", "2024-2025", "2024-11-10", "2024-11-20", "Bring hall ticket and college ID."],
];

// Normalize academic year names to "YYYY-YY" for comparison.
// Handles "2024-2025", "2024-25", "2024/25", "AY 2024-25", etc.
export function normalizeAcademicYear(name: string): string {
  const m = name.match(/(\d{4})[^0-9]+(\d{2,4})/);
  if (!m) return name.toLowerCase().trim();
  const startYear = m[1];
  const endYear = m[2].length === 4 ? m[2].slice(2) : m[2];
  return `${startYear}-${endYear}`;
}

// Map an edited CSV row to a CREATE_EXAM_SCHEDULE input. Academic year cell
// holds the year name (from the dropdown); it's resolved to an id here.
export function rowToExamScheduleInput(
  row: Record<string, string>,
  acYearIdByName: Map<string, string>,
  currentYearId?: string,
): ExamScheduleInput {
  const get = (k: string) => (row[k] ?? "").trim();
  const acName = get("academic_year").toLowerCase();
  const semester = get("semester");

  let resolvedYearId: string | null = null;
  if (acName) {
    // 1. Exact match (lowercased).
    resolvedYearId = acYearIdByName.get(acName) ?? null;
    // 2. Normalized match: "2024-2025" == "2024-25".
    if (!resolvedYearId) {
      const normInput = normalizeAcademicYear(acName);
      for (const [name, id] of acYearIdByName.entries()) {
        if (normalizeAcademicYear(name) === normInput) {
          resolvedYearId = id;
          break;
        }
      }
    }
    // 3. Final fallback: current year.
    if (!resolvedYearId) resolvedYearId = currentYearId ?? null;
  } else {
    resolvedYearId = currentYearId ?? null;
  }
  return {
    name: get("name"),
    examType: get("exam_type").toLowerCase(),
    semesterNumber: semester ? parseInt(semester, 10) || 1 : 1,
    academicYearId: resolvedYearId,
    startDate: get("start_date") || undefined,
    endDate: get("end_date") || undefined,
    instructions: get("instructions") || undefined,
  };
}

// Cross-field check: end date must not precede start date.
// Academic year is now a dropdown so name-existence checking is no longer needed.
export function extraExamScheduleRowErrors(
  index: number,
  row: Record<string, string>,
): BulkRowError[] {
  const errors: BulkRowError[] = [];
  const start = (row.start_date ?? "").trim();
  const end = (row.end_date ?? "").trim();
  if (start && end && end < start) {
    errors.push({ index, field: "end_date", error: "end date is before the start date" });
  }
  return errors;
}

// Build the CSV template text (header + example rows) for download.
export function buildExamSchedulesCsvTemplate(examTypeNames: string[] = []): string {
  const schema = buildBulkExamScheduleSchema(examTypeNames);
  const header = schema.fields.map((f) => f.name);
  const rows = exampleRows(examTypeNames[0] ?? "internal");
  return [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
