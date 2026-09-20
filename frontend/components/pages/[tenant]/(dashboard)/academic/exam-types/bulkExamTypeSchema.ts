// Client-side bulk-add schema for Exams (assessment types). Mirrors the shared
// BulkUpload building blocks but stays GraphQL-pure: rows are submitted one by
// one through CREATE_EXAM_TYPE, so no REST endpoint or backend codegen is
// involved. Department is given by NAME and resolved to an id client-side.
import type { BulkRowError, BulkSchema } from "@/api/services/bulk";

// Matches the CreateExamTypeInput GraphQL input.
export interface ExamTypeInput {
  name: string;
  departmentId?: string | null;
  maxMarks: number;
  weightage?: number | null;
  active: boolean;
}

export const bulkExamTypeSchema: BulkSchema = {
  resource: "exam-types",
  title: "Exams",
  description:
    "Bulk-create exams (assessment types). One row per exam. Leave department " +
    "blank to make an exam available to every department. Max marks is required; " +
    "weightage % is optional.",
  fields: [
    { name: "name", label: "Exam Name", type: "string", required: true, example: "Mid Semester" },
    {
      name: "department",
      label: "Department",
      type: "string",
      required: false,
      example: "Computer Science",
      description: "Department name exactly as it appears in your org. Blank = org-wide.",
    },
    { name: "max_marks", label: "Max Marks", type: "float", required: true, min: 1, example: "100" },
    { name: "weightage", label: "Weightage %", type: "float", required: false, min: 0, max: 100, example: "30" },
    { name: "active", label: "Active", type: "bool", required: false, example: "true" },
  ],
};

// Example rows for the downloadable template (column order matches fields).
const exampleRows: string[][] = [
  ["Internal 1", "Computer Science", "20", "10", "true"],
  ["Mid Semester", "Computer Science", "50", "30", "true"],
  ["End Semester", "Computer Science", "100", "50", "true"],
  ["Assignment", "", "10", "10", "true"],
];

const TRUE_WORDS = new Set(["true", "yes", "y", "1"]);

// Map an edited CSV row to a CREATE_EXAM_TYPE input. Department name is looked up
// (case-insensitively) in the provided map; unknown names are caught earlier by
// extraExamTypeRowErrors so we never silently drop the scoping.
export function rowToExamTypeInput(
  row: Record<string, string>,
  deptIdByName: Map<string, string>,
): ExamTypeInput {
  const get = (k: string) => (row[k] ?? "").trim();
  const deptName = get("department").toLowerCase();
  const weightage = get("weightage");
  const active = get("active").toLowerCase();
  return {
    name: get("name"),
    departmentId: deptName ? deptIdByName.get(deptName) ?? null : null,
    maxMarks: parseFloat(get("max_marks")) || 100,
    weightage: weightage ? parseFloat(weightage) : null,
    active: active === "" ? true : TRUE_WORDS.has(active),
  };
}

// Cross-field check the per-cell validator can't express: the department name,
// when present, must match a real department.
export function extraExamTypeRowErrors(
  index: number,
  row: Record<string, string>,
  deptIdByName: Map<string, string>,
): BulkRowError[] {
  const deptName = (row["department"] ?? "").trim();
  if (deptName && !deptIdByName.has(deptName.toLowerCase())) {
    return [{ index, field: "department", error: `unknown department “${deptName}”` }];
  }
  return [];
}

// Build the CSV template text (header + example rows) for download.
export function buildExamTypesCsvTemplate(): string {
  const header = bulkExamTypeSchema.fields.map((f) => f.name);
  return [header, ...exampleRows].map((r) => r.map(csvEscape).join(",")).join("\n");
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
