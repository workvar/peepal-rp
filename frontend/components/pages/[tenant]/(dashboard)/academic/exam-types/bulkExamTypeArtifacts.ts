// Builds the downloadable helpers for the Exams bulk dialog entirely in the
// browser (no REST, no extra deps), mirroring what the server-side bulk
// framework and the Events dialog generate: a field-guide PDF and a starter-kit
// ZIP (instructions.txt + sample CSV) to go with the CSV template.
import type { BulkField } from "@/api/services/bulk";
import { requestGuidePdf, type GuideSchema } from "@/functions/bulk/guidePdf";
import { buildZip } from "@/lib/clientZip";
import { bulkExamTypeSchema, buildExamTypesCsvTemplate } from "./bulkExamTypeSchema";

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
export async function buildFieldGuidePdf(): Promise<Blob> {
  const guideSchema: GuideSchema = {
    title: bulkExamTypeSchema.title,
    description: bulkExamTypeSchema.description,
    fields: bulkExamTypeSchema.fields,
  };
  return requestGuidePdf(guideSchema);
}

function buildInstructionsTxt(): string {
  const asOf = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push(`CollERP Bulk Upload - ${bulkExamTypeSchema.title}`);
  lines.push(`As of ${asOf}`);
  lines.push("=".repeat(60), "");
  lines.push(bulkExamTypeSchema.description, "");
  lines.push("HOW TO USE", "----------");
  lines.push("1. Open sample_exams.csv in your spreadsheet app.");
  lines.push("2. Fill in rows below the header. Delete the example rows when done.");
  lines.push("3. Save as CSV (UTF-8).");
  lines.push("4. In the ERP, open Exams -> Bulk Upload and upload the file.", "");
  lines.push("FIELD REFERENCE", "---------------");
  for (const f of bulkExamTypeSchema.fields) {
    lines.push(`\n[${f.name}] - ${f.label} (${f.required ? "REQUIRED" : "optional"})`);
    lines.push(`  Type   : ${typeLabel(f)}`);
    if (f.description) lines.push(`  About  : ${f.description}`);
    const range = rangeLabel(f);
    if (range) lines.push(`  ${range}`);
    if (f.example) lines.push(`  Example: ${f.example}`);
  }
  lines.push("", "NOTES", "-----");
  lines.push("- Leave Department blank to make an exam org-wide (every department).");
  lines.push("- A Department value must match a department name exactly.");
  lines.push("- Max Marks is required; Weightage % is optional.");
  lines.push("- Boolean (Active) accepts: true, false, yes, no, 1, 0. Blank = active.");
  lines.push("- Rows with errors are skipped; successful rows are still saved.");
  return lines.join("\n") + "\n";
}

export function buildStarterKitZip(): Blob {
  return buildZip([
    { name: "instructions.txt", data: buildInstructionsTxt() },
    { name: "sample_exams.csv", data: buildExamTypesCsvTemplate() },
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
