// Builds the three downloadable helpers for the Events bulk dialog entirely in
// the browser (no REST, no extra deps), mirroring what the server-side bulk
// framework generates for other resources: a CSV template, a field-guide PDF,
// and a starter-kit ZIP (instructions.txt + sample CSV).
import type { BulkField } from "@/api/services/bulk";
import { requestGuidePdf, type GuideSchema } from "@/functions/bulk/guidePdf";
import { buildZip } from "@/lib/clientZip";
import { bulkEventSchema, buildEventsCsvTemplate } from "./bulkEventSchema";

// Matches backend/handlers/bulk/registry.go TypeLabel.
function typeLabel(f: BulkField): string {
  if (f.type === "enum") return `enum (${(f.allowed_values ?? []).join(" | ")})`;
  if (f.type === "date") return "date (YYYY-MM-DD)";
  return f.type;
}

// The backend renders the field-guide PDF from the schema we POST to it.
export async function buildFieldGuidePdf(): Promise<Blob> {
  const guideSchema: GuideSchema = {
    title: bulkEventSchema.title,
    description: bulkEventSchema.description,
    fields: bulkEventSchema.fields,
  };
  return requestGuidePdf(guideSchema);
}

function buildInstructionsTxt(): string {
  const asOf = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push(`CollERP Bulk Upload - ${bulkEventSchema.title}`);
  lines.push(`As of ${asOf}`);
  lines.push("=".repeat(60), "");
  lines.push(bulkEventSchema.description, "");
  lines.push("HOW TO USE", "----------");
  lines.push("1. Open sample_events.csv in your spreadsheet app.");
  lines.push("2. Fill in rows below the header. Delete the example rows when done.");
  lines.push("3. Save as CSV (UTF-8).");
  lines.push("4. In the ERP, open Events -> Bulk Add and upload the file.", "");
  lines.push("FIELD REFERENCE", "---------------");
  for (const f of bulkEventSchema.fields) {
    lines.push(`\n[${f.name}] - ${f.label} (${f.required ? "REQUIRED" : "optional"})`);
    lines.push(`  Type   : ${typeLabel(f)}`);
    if (f.allowed_values?.length) lines.push(`  Values : ${f.allowed_values.join(", ")}`);
    if (f.example) lines.push(`  Example: ${f.example}`);
  }
  lines.push("", "NOTES", "-----");
  lines.push("- Dates must be in YYYY-MM-DD format.");
  lines.push("- Boolean fields accept: true, false, yes, no, 1, 0.");
  lines.push("- Leave optional fields blank; do NOT delete the column.");
  lines.push("- Rows with errors are skipped; successful rows are still saved.");
  return lines.join("\n") + "\n";
}

export function buildStarterKitZip(): Blob {
  return buildZip([
    { name: "instructions.txt", data: buildInstructionsTxt() },
    { name: "sample_events.csv", data: buildEventsCsvTemplate() },
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
