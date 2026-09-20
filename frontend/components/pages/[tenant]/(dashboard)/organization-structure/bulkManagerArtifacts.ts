// Browser-side helpers for the "Bulk Assign Managers" dialog: a field-guide PDF
// and a starter-kit ZIP (instructions.txt + sample CSV) to sit alongside the
// pre-filled CSV download. No REST, no extra deps — mirrors the Events/Exams
// dialogs and the server-side bulk framework. This flow has its own fixed CSV
// shape (see bulkManager.ts) rather than a BulkSchema, so the columns are
// described here directly.
import { requestGuidePdf, type GuideSchema } from "@/functions/bulk/guidePdf";
import { buildZip } from "@/lib/clientZip";
import { MANAGER_CSV_HEADER } from "./bulkManager";

const TITLE = "Assign Managers";
const DESCRIPTION =
  "Set each employee's reporting manager in bulk. One row per employee. The " +
  "identity columns are pre-filled by the Pre-filled CSV button; you only fill " +
  "the manager column. Leave it blank to keep an employee's current manager.";

type Col = { name: string; about: string; example: string };

const COLUMNS: Col[] = [
  { name: "employee_name", about: "The employee (reportee). Display-only; not used for matching.", example: "Asha Rao" },
  { name: "employee_id", about: "The employee's ID. Used to match the row back to a person (tried first).", example: "EMP1002" },
  { name: "employee_email", about: "The employee's email. Used to match the row when employee_id is blank.", example: "asha.rao@example.org" },
  { name: "manager", about: "The manager's email OR employee ID. Blank = keep the current manager.", example: "priya.menon@example.org" },
];

// The backend renders the field-guide PDF from the schema we POST to it. This
// flow has a fixed CSV shape rather than a BulkSchema, so we build the guide
// schema from the column descriptions above. The manager column is the one the
// user fills in; the rest are pre-filled identity columns.
export async function buildFieldGuidePdf(): Promise<Blob> {
  const guideSchema: GuideSchema = {
    title: TITLE,
    description: DESCRIPTION,
    fields: COLUMNS.map((c) => ({
      name: c.name,
      label: c.name,
      type: "string",
      required: c.name === "manager",
      description: c.about,
      example: c.example,
    })),
  };
  return requestGuidePdf(guideSchema);
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function buildSampleCsv(): string {
  const rows = [
    ["Asha Rao", "EMP1002", "asha.rao@example.org", "priya.menon@example.org"],
    ["Vikram Shah", "EMP1003", "vikram.shah@example.org", "EMP1001"],
    ["Neha Gupta", "EMP1004", "neha.gupta@example.org", ""],
  ];
  return [Array.from(MANAGER_CSV_HEADER), ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
}

function buildInstructionsTxt(): string {
  const asOf = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push(`CollERP Bulk Upload - ${TITLE}`);
  lines.push(`As of ${asOf}`);
  lines.push("=".repeat(60), "");
  lines.push(DESCRIPTION, "");
  lines.push("HOW TO USE", "----------");
  lines.push("1. In the ERP, open Org Structure -> Bulk Assign Managers.");
  lines.push('2. Click "Pre-filled CSV" to get every employee pre-listed,');
  lines.push("   OR start from sample_assign_managers.csv in this kit.");
  lines.push("3. Fill the manager column with each manager's email or employee ID.");
  lines.push("4. Save as CSV (UTF-8) and upload it back in the same dialog.", "");
  lines.push("FIELD REFERENCE", "---------------");
  for (const c of COLUMNS) {
    lines.push(`\n[${c.name}]${c.name === "manager" ? " (fill this in)" : " (pre-filled)"}`);
    lines.push(`  About  : ${c.about}`);
    lines.push(`  Example: ${c.example}`);
  }
  lines.push("", "NOTES", "-----");
  lines.push("- Rows are matched by employee_id first, then employee_email.");
  lines.push("- A blank manager keeps the current manager (no change).");
  lines.push("- The manager value is the manager's email OR employee ID.");
  lines.push("- Self-management and reporting loops are rejected.");
  lines.push("- Rows with errors are skipped; valid rows are still saved.");
  return lines.join("\n") + "\n";
}

export function buildStarterKitZip(): Blob {
  return buildZip([
    { name: "instructions.txt", data: buildInstructionsTxt() },
    { name: "sample_assign_managers.csv", data: buildSampleCsv() },
  ]);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
