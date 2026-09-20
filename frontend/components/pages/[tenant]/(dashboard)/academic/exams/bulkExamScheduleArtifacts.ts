// Builds the downloadable helpers for the Exam Schedules bulk dialog entirely in
// the browser (no REST, no extra deps), mirroring the Exams (exam-types) dialog:
// a field-guide PDF and a starter-kit ZIP (instructions.txt + sample CSV) to go
// with the CSV template.
import type { BulkField } from "@/api/services/bulk";
import { requestGuidePdf, type GuideSchema } from "@/functions/bulk/guidePdf";
import { buildZip } from "@/lib/clientZip";
import { buildBulkExamScheduleSchema, buildExamSchedulesCsvTemplate } from "./bulkExamScheduleSchema";

// Matches backend/handlers/bulk/registry.go TypeLabel.
function typeLabel(f: BulkField): string {
  if (f.type === "enum") return `enum (${(f.allowed_values ?? []).join(" | ")})`;
  if (f.type === "date") return "date (YYYY-MM-DD)";
  return f.type;
}

function rangeLabel(f: BulkField): string | null {
  if (f.min !== undefined && f.max !== undefined) return `Range: ${f.min} to ${f.max}`;
  if (f.min !== undefined) return `Minimum: ${f.min}`;
  if (f.max !== undefined) return `Maximum: ${f.max}`;
  return null;
}

// The backend renders the field-guide PDF from the schema we POST to it.
export async function buildFieldGuidePdf(examTypeNames: string[] = []): Promise<Blob> {
  const schema = buildBulkExamScheduleSchema(examTypeNames);
  const guideSchema: GuideSchema = {
    title: schema.title,
    description: schema.description,
    fields: schema.fields,
  };
  return requestGuidePdf(guideSchema);
}

function buildInstructionsTxt(examTypeNames: string[]): string {
  const schema = buildBulkExamScheduleSchema(examTypeNames);
  const asOf = new Date().toISOString().slice(0, 10);
  const examTypeNote = examTypeNames.length
    ? `- Exam Type must be one of: ${examTypeNames.join(", ")}.`
    : "- No exam types configured yet. Add them in Exam Types before uploading.";

  const lines: string[] = [];
  lines.push(`CollERP Bulk Upload - ${schema.title}`);
  lines.push(`As of ${asOf}`);
  lines.push("=".repeat(60), "");
  lines.push(schema.description, "");
  lines.push("HOW TO USE", "----------");
  lines.push("1. Open sample_exam_schedules.csv in your spreadsheet app.");
  lines.push("2. Fill in rows below the header. Delete the example rows when done.");
  lines.push("3. Save as CSV (UTF-8).");
  lines.push("4. In the ERP, open Exam Schedules -> Bulk Upload and upload the file.", "");
  lines.push("FIELD REFERENCE", "---------------");
  for (const f of schema.fields) {
    lines.push(`\n[${f.name}] - ${f.label} (${f.required ? "REQUIRED" : "optional"})`);
    lines.push(`  Type   : ${typeLabel(f)}`);
    if (f.description) lines.push(`  About  : ${f.description}`);
    const range = rangeLabel(f);
    if (range) lines.push(`  ${range}`);
    if (f.example) lines.push(`  Example: ${f.example}`);
  }
  lines.push("", "NOTES", "-----");
  lines.push(examTypeNote);
  lines.push("- Leave Academic Year blank to skip the link; otherwise match a year name exactly.");
  lines.push("- End Date cannot fall before Start Date.");
  lines.push("- Schedules are created unpublished; publish them to students afterwards.");
  lines.push("- Rows with errors are skipped; successful rows are still saved.");
  return lines.join("\n") + "\n";
}

export function buildStarterKitZip(examTypeNames: string[] = []): Blob {
  return buildZip([
    { name: "instructions.txt", data: buildInstructionsTxt(examTypeNames) },
    { name: "sample_exam_schedules.csv", data: buildExamSchedulesCsvTemplate(examTypeNames) },
  ]);
}

// Trigger a browser download for any generated Blob.
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
