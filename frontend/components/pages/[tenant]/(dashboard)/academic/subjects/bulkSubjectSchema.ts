// Client-side bulk-add schema for Subjects. Mirrors the shape used by the shared
// BulkUpload building blocks (CSV parser, validator, EditableTable) but stays
// GraphQL-pure: rows are submitted one-by-one through the existing CREATE_SUBJECT
// mutation, so no REST endpoint or backend codegen is involved.
import type { BulkField, BulkRowError, BulkSchema } from "@/api/services/bulk";

// Default number of Outcome-N / Unit-N columns shown in the template + editor.
// The parser is not limited to these: a user can add Outcome-6, Unit-7-title,
// etc. to their own CSV and they are still imported (just not shown in the
// preview grid). Blank numbered columns are ignored.
export const DEFAULT_OUTCOME_COLS = 5;
export const DEFAULT_UNIT_COLS = 5;

// A unit in the course plan. Mirrors the single-create form (SubjectPlanFields).
export interface UnitInput {
  title: string;
  content: string;
  labActivities?: string;
  fieldVisits?: string;
  others?: string;
}

// The mutation input (CreateSubjectInput). Department is sent as a UUID, which
// we resolve from the department NAME the user typed in the CSV.
export interface SubjectInput {
  name: string;
  code: string;
  departmentId?: string;
  credits: number;
  teachingHours: number;
  labHours: number;
  semesterNumber: number;
  description?: string;
  syllabusUrl?: string;
  courseOutcomes: string[];
  units: UnitInput[];
}

// Defaults match the single-create form, so a blank cell behaves like leaving
// that field untouched in the normal "Add Subject" dialog.
const DEFAULTS = { credits: 3, teachingHours: 3, labHours: 0, semesterNumber: 1 };

// Department is an enum whose allowed values are the tenant's department names.
// They're injected at runtime, so the schema is built per-render rather than
// exported as a constant.
export function buildBulkSubjectSchema(
  departmentNames: string[],
  outcomeCols = DEFAULT_OUTCOME_COLS,
  unitCols = DEFAULT_UNIT_COLS,
): BulkSchema {
  const outcomeFields: BulkField[] = Array.from({ length: outcomeCols }, (_, i) => ({
    name: `Outcome-${i + 1}`,
    label: `Outcome ${i + 1}`,
    type: "string",
    required: false,
    example: i === 0 ? "Apply core concepts to real problems" : "",
  }));

  const unitFields: BulkField[] = Array.from({ length: unitCols }, (_, i) => [
    {
      name: `Unit-${i + 1}-title`,
      label: `Unit ${i + 1} Title`,
      type: "string" as const,
      required: false,
      example: i === 0 ? "Introduction" : "",
    },
    {
      name: `Unit-${i + 1}-content`,
      label: `Unit ${i + 1} Content`,
      type: "string" as const,
      required: false,
      example: i === 0 ? "Topics covered in this unit" : "",
    },
  ]).flat();

  return {
    resource: "subjects",
    title: "Subjects",
    description:
      "Bulk-create curriculum subjects. Each row is one subject. Name and code " +
      "are required; everything else is optional. Department must match an " +
      "existing department name exactly (leave blank for none). Course outcomes " +
      "and a unit-by-unit course plan can be filled in the numbered columns.",
    fields: [
      { name: "name", label: "Name", type: "string", required: true, example: "Data Structures" },
      { name: "code", label: "Code", type: "string", required: true, example: "CS201" },
      {
        name: "department",
        label: "Department",
        type: "enum",
        required: false,
        allowed_values: departmentNames,
        example: departmentNames[0] ?? "",
      },
      { name: "semester_number", label: "Semester", type: "int", required: false, min: 1, max: 12, example: "3" },
      { name: "credits", label: "Credits", type: "int", required: false, min: 0, max: 10, example: "4" },
      { name: "teaching_hours", label: "Teaching Hours/wk", type: "int", required: false, min: 0, example: "3" },
      { name: "lab_hours", label: "Lab Hours/wk", type: "int", required: false, min: 0, example: "2" },
      { name: "description", label: "Description", type: "string", required: false, example: "Core CS subject" },
      { name: "syllabus_url", label: "Syllabus URL", type: "string", required: false, example: "https://…" },
      ...outcomeFields,
      ...unitFields,
    ],
  };
}

// Two example rows for the downloadable template, keyed by column name so they
// stay aligned no matter how many Outcome/Unit columns the schema has.
export function subjectExampleRows(sampleDept = ""): Record<string, string>[] {
  return [
    {
      name: "Data Structures", code: "CS201", department: sampleDept,
      semester_number: "3", credits: "4", teaching_hours: "3", lab_hours: "2",
      description: "Core data structures course", syllabus_url: "",
      "Outcome-1": "Apply linear and non-linear data structures to real problems",
      "Outcome-2": "Analyze time and space complexity of algorithms",
      "Unit-1-title": "Arrays & Linked Lists",
      "Unit-1-content": "Arrays, singly/doubly linked lists, stacks, queues",
      "Unit-2-title": "Trees",
      "Unit-2-content": "Binary trees, BSTs, traversals, balancing",
    },
    {
      name: "Microeconomics", code: "EC101", department: sampleDept,
      semester_number: "1", credits: "3", teaching_hours: "3", lab_hours: "0",
      description: "Introduction to microeconomics", syllabus_url: "",
      "Outcome-1": "Explain supply, demand and market equilibrium",
      "Unit-1-title": "Foundations",
      "Unit-1-content": "Scarcity, choice and opportunity cost",
    },
  ];
}

// Parse an int cell, falling back to the form default when blank/invalid.
function intOr(value: string, fallback: number): number {
  const n = parseInt((value ?? "").trim(), 10);
  return Number.isNaN(n) ? fallback : n;
}

// Collect Outcome-N columns (any N, in numeric order), dropping blanks. Tolerant
// of Outcome-1, Outcome_1 and "Outcome 1" header spellings.
export function parseOutcomes(row: Record<string, string>): string[] {
  const found: { n: number; v: string }[] = [];
  for (const [key, val] of Object.entries(row)) {
    const m = key.match(/^outcome[-_ ]?(\d+)$/i);
    if (m) found.push({ n: parseInt(m[1], 10), v: (val ?? "").trim() });
  }
  return found.sort((a, b) => a.n - b.n).map((x) => x.v).filter(Boolean);
}

// Collect Unit-N-<field> columns into ordered units. A unit is kept only if it
// has a title or content. Optional lab / field-visit / others sub-fields are
// supported even though they aren't in the default template.
export function parseUnits(row: Record<string, string>): UnitInput[] {
  const drafts = new Map<number, Partial<UnitInput>>();
  for (const [key, val] of Object.entries(row)) {
    const m = key.match(/^unit[-_ ]?(\d+)[-_ ](title|content|lab|labactivities|lab_activities|field|fieldvisits|field_visits|others)$/i);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    const field = m[2].toLowerCase();
    const v = (val ?? "").trim();
    const cur = drafts.get(n) ?? {};
    if (field === "title") cur.title = v;
    else if (field === "content") cur.content = v;
    else if (field.startsWith("lab")) cur.labActivities = v;
    else if (field.startsWith("field")) cur.fieldVisits = v;
    else if (field === "others") cur.others = v;
    drafts.set(n, cur);
  }
  return [...drafts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, u]) => u)
    .filter((u) => (u.title ?? "").length > 0 || (u.content ?? "").length > 0)
    .map((u) => ({
      title: u.title ?? "",
      content: u.content ?? "",
      labActivities: u.labActivities || undefined,
      fieldVisits: u.fieldVisits || undefined,
      others: u.others || undefined,
    }));
}

// Map an edited CSV row to a CREATE_SUBJECT input. `deptByName` maps a
// lower-cased department name to its UUID so the user never types an id.
export function rowToSubjectInput(
  row: Record<string, string>,
  deptByName: Map<string, string>,
): SubjectInput {
  const get = (k: string) => (row[k] ?? "").trim();
  const deptName = get("department").toLowerCase();
  return {
    name: get("name"),
    code: get("code"),
    departmentId: deptName ? deptByName.get(deptName) : undefined,
    credits: intOr(get("credits"), DEFAULTS.credits),
    teachingHours: intOr(get("teaching_hours"), DEFAULTS.teachingHours),
    labHours: intOr(get("lab_hours"), DEFAULTS.labHours),
    semesterNumber: intOr(get("semester_number"), DEFAULTS.semesterNumber),
    description: get("description") || undefined,
    syllabusUrl: get("syllabus_url") || undefined,
    courseOutcomes: parseOutcomes(row),
    units: parseUnits(row),
  };
}

// Cross-field checks the per-cell validator can't express. The enum validator
// already rejects an unknown department, but it's case-insensitive, so this is
// a belt-and-suspenders guard that the name truly resolves to an id.
export function extraRowErrors(
  index: number,
  row: Record<string, string>,
  deptByName: Map<string, string>,
): BulkRowError[] {
  const dept = (row["department"] ?? "").trim();
  if (dept && !deptByName.has(dept.toLowerCase())) {
    return [{ index, field: "department", error: "unknown department" }];
  }
  return [];
}

// Build the CSV template text (header + example rows) for download. Example
// values are pulled by column name so the row always matches the header width.
export function buildSubjectsCsvTemplate(schema: BulkSchema, sampleDept = ""): string {
  const header = schema.fields.map((f) => f.name);
  const examples = subjectExampleRows(sampleDept);
  const rows = examples.map((ex) => header.map((h) => ex[h] ?? ""));
  return [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
