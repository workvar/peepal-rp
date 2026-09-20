// Builds the three downloadable helpers for the Subjects bulk dialog entirely in
// the browser (no REST, no extra deps), mirroring what the server-side bulk
// framework generates for other resources: a CSV template, a field-guide PDF,
// and a starter-kit ZIP (instructions.txt + sample CSV).
import type { BulkField, BulkSchema } from "@/api/services/bulk";
import { requestGuidePdf, type GuideSchema } from "@/functions/bulk/guidePdf";
import { buildZip } from "@/lib/clientZip";
import { buildSubjectsCsvTemplate } from "./bulkSubjectSchema";

// Matches backend/handlers/bulk/registry.go TypeLabel.
function typeLabel(f: BulkField): string {
  if (f.type === "enum") return `enum (${(f.allowed_values ?? []).join(" | ")})`;
  if (f.type === "date") return "date (YYYY-MM-DD)";
  return f.type;
}

// The backend renders the field-guide PDF from the schema we POST to it.
export async function buildFieldGuidePdf(schema: BulkSchema): Promise<Blob> {
  const guideSchema: GuideSchema = {
    title: schema.title,
    description: schema.description,
    fields: schema.fields,
  };
  return requestGuidePdf(guideSchema);
}

function buildInstructionsTxt(schema: BulkSchema): string {
  const asOf = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push(`CollERP Bulk Upload - ${schema.title}`);
  lines.push(`As of ${asOf}`);
  lines.push("=".repeat(60), "");
  lines.push(schema.description, "");
  lines.push("HOW TO USE", "----------");
  lines.push("1. Open sample_subjects.csv in your spreadsheet app.");
  lines.push("2. Fill in rows below the header. Delete the example rows when done.");
  lines.push("3. Save as CSV (UTF-8).");
  lines.push("4. In the ERP, open Subjects -> Bulk Add and upload the file.", "");
  lines.push("FIELD REFERENCE", "---------------");
  for (const f of schema.fields) {
    lines.push(`\n[${f.name}] - ${f.label} (${f.required ? "REQUIRED" : "optional"})`);
    lines.push(`  Type   : ${typeLabel(f)}`);
    if (f.allowed_values?.length) lines.push(`  Values : ${f.allowed_values.join(", ")}`);
    if (f.example) lines.push(`  Example: ${f.example}`);
  }
  lines.push("", "NOTES", "-----");
  lines.push("- Department must match an existing department name exactly.");
  lines.push("- Numbers (credits, hours, semester) must be whole numbers.");
  lines.push("- Leave optional fields blank; do NOT delete the column.");
  lines.push("- Rows with errors are skipped; successful rows are still saved.");
  lines.push("");
  lines.push("COURSE OUTCOMES & COURSE PLAN", "-----------------------------");
  lines.push("- Course outcomes go in Outcome-1 ... Outcome-5 (one each).");
  lines.push("  Add Outcome-6, Outcome-7, ... for more. Blank columns are skipped.");
  lines.push("- The course plan uses Unit-1-title / Unit-1-content, then");
  lines.push("  Unit-2-title / Unit-2-content, and so on. A unit is saved only");
  lines.push("  when its title or content is filled in.");
  lines.push("- Optional unit detail: add Unit-1-lab, Unit-1-field, Unit-1-others");
  lines.push("  columns (same pattern for any unit number).");
  return lines.join("\n") + "\n";
}

export function buildStarterKitZip(schema: BulkSchema, sampleDept = ""): Blob {
  return buildZip([
    { name: "instructions.txt", data: buildInstructionsTxt(schema) },
    { name: "sample_subjects.csv", data: buildSubjectsCsvTemplate(schema, sampleDept) },
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
