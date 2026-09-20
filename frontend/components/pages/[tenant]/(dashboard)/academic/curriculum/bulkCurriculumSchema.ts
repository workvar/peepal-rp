// Client-side bulk schema for assigning subjects to programme semesters. One
// file can cover MANY programmes: each row names its course. Stays GraphQL-pure
// — rows are grouped per (course, semester) and submitted through the existing
// SET_CURRICULUM_SUBJECTS mutation (one call per group), so there's no REST
// endpoint or backend codegen involved.
import type { BulkRowError, BulkSchema } from "@/api/services/bulk";

// Resolved course details, keyed by lower-cased course code.
export interface CourseRef {
  id: string;
  total: number; // total semesters, 0 if unknown
  label: string; // "Name (CODE)" for messages
}

// One row = assign one existing subject (by code) to one semester of one
// programme (by code). All three columns are required.
export function buildBulkCurriculumSchema(sampleCourseCode = "", sampleSubjectCode = ""): BulkSchema {
  return {
    resource: "curriculum",
    title: "Curriculum",
    description:
      "Assign existing subjects to programme semesters. Each row maps one subject " +
      "to one semester of one programme (course); all three columns are required. " +
      "A single file can cover multiple programmes. Uploading adds subjects to a " +
      "semester — it never removes ones already assigned.",
    fields: [
      {
        name: "course_code",
        label: "Programme Code",
        type: "string",
        required: true,
        example: sampleCourseCode || "BTECH-CSE",
      },
      {
        name: "semester",
        label: "Semester",
        type: "int",
        required: true,
        min: 1,
        example: "1",
      },
      {
        name: "subject_code",
        label: "Subject Code",
        type: "string",
        required: true,
        example: sampleSubjectCode || "CS201",
      },
    ],
  };
}

// Example rows for the downloadable template, keyed by column name.
export function curriculumExampleRows(
  sampleCourseCode: string,
  sampleSubjectCodes: string[],
): Record<string, string>[] {
  const cc = sampleCourseCode || "BTECH-CSE";
  return [
    { course_code: cc, semester: "1", subject_code: sampleSubjectCodes[0] ?? "CS101" },
    { course_code: cc, semester: "1", subject_code: sampleSubjectCodes[1] ?? "MA101" },
    { course_code: cc, semester: "2", subject_code: sampleSubjectCodes[2] ?? "CS201" },
  ];
}

// Build the CSV template text (header + example rows) for download.
export function buildCurriculumCsvTemplate(
  schema: BulkSchema,
  sampleCourseCode: string,
  sampleSubjectCodes: string[],
): string {
  const header = schema.fields.map((f) => f.name);
  const rows = curriculumExampleRows(sampleCourseCode, sampleSubjectCodes).map((ex) =>
    header.map((h) => ex[h] ?? ""),
  );
  return [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Cross-field checks the per-cell validator can't express: the course code and
// subject code must resolve, and the semester must fall within that course's
// total semesters (a per-row max the schema can't encode). `courseByCode` and
// `subjectCodeToId` keys are lower-cased codes.
export function extraCurriculumErrors(
  index: number,
  row: Record<string, string>,
  courseByCode: Map<string, CourseRef>,
  subjectCodeToId: Map<string, string>,
): BulkRowError[] {
  const errs: BulkRowError[] = [];

  const courseCode = (row["course_code"] ?? "").trim();
  const course = courseCode ? courseByCode.get(courseCode.toLowerCase()) : undefined;
  if (courseCode && !course) {
    errs.push({ index, field: "course_code", error: "unknown programme code" });
  }

  const subjectCode = (row["subject_code"] ?? "").trim();
  if (subjectCode && !subjectCodeToId.has(subjectCode.toLowerCase())) {
    errs.push({ index, field: "subject_code", error: "unknown subject code" });
  }

  const semRaw = (row["semester"] ?? "").trim();
  if (course && course.total > 0 && /^\d+$/.test(semRaw)) {
    const sem = parseInt(semRaw, 10);
    if (sem > course.total) {
      errs.push({ index, field: "semester", error: `max semester ${course.total} for ${course.label}` });
    }
  }

  return errs;
}
