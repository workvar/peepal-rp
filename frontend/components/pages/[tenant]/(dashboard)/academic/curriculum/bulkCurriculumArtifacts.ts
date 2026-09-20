// Builds the three downloadable helpers for the Curriculum bulk dialog entirely
// in the browser (no REST, no extra deps): a CSV template, a field-guide PDF,
// and a starter-kit ZIP (instructions.txt + sample CSV). Mirrors the Subjects
// bulk helpers.
import type { BulkField, BulkSchema } from "@/api/services/bulk";
import { requestGuidePdf, type GuideSchema } from "@/functions/bulk/guidePdf";
import { buildZip } from "@/lib/clientZip";
import { buildCurriculumCsvTemplate } from "./bulkCurriculumSchema";

function typeLabel(f: BulkField): string {
  if (f.type === "enum") return `enum (${(f.allowed_values ?? []).join(" | ")})`;
  if (f.type === "int") return f.min ? `int (>= ${f.min})` : "int";
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
  lines.push("1. Open sample_curriculum.csv in your spreadsheet app.");
  lines.push("2. Fill in rows below the header. Delete the example rows when done.");
  lines.push("3. Save as CSV (UTF-8).");
  lines.push("4. In the ERP, open Curriculum, then Bulk Upload and choose the file.", "");
  lines.push("FIELD REFERENCE", "---------------");
  for (const f of schema.fields) {
    lines.push(`\n[${f.name}] - ${f.label} (REQUIRED)`);
    lines.push(`  Type   : ${typeLabel(f)}`);
    if (f.example) lines.push(`  Example: ${f.example}`);
  }
  lines.push("", "NOTES", "-----");
  lines.push("- Programme code must match an existing course exactly.");
  lines.push("- Subject code must match an existing subject exactly.");
  lines.push("- Semester must be a whole number within that programme.");
  lines.push("- One file can list rows for several programmes.");
  lines.push("- Uploading ADDS subjects to a semester; it never removes existing ones.");
  lines.push("- List a subject under a given semester only once.");
  lines.push("- Rows with errors are flagged in the preview before anything is saved.");
  return lines.join("\n") + "\n";
}

export function buildStarterKitZip(
  schema: BulkSchema,
  sampleCourseCode: string,
  sampleSubjectCodes: string[],
): Blob {
  return buildZip([
    { name: "instructions.txt", data: buildInstructionsTxt(schema) },
    { name: "sample_curriculum.csv", data: buildCurriculumCsvTemplate(schema, sampleCourseCode, sampleSubjectCodes) },
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
