// Downloadable helpers for the Purchase Orders bulk dialog, built entirely in
// the browser: a CSV template, a field-guide PDF (rendered by the backend from
// the schema), and a starter-kit ZIP (instructions.txt + sample CSV).
import type { BulkField } from "@/api/services/bulk";
import { requestGuidePdf, type GuideSchema } from "@/functions/bulk/guidePdf";
import { buildZip } from "@/lib/clientZip";
import { bulkPOSchema, buildPOCsvTemplate } from "./bulkPOSchema";

function typeLabel(f: BulkField): string {
  if (f.type === "enum") return `enum (${(f.allowed_values ?? []).join(" | ")})`;
  if (f.type === "date") return "date (YYYY-MM-DD)";
  return f.type;
}

export async function buildFieldGuidePdf(): Promise<Blob> {
  const guideSchema: GuideSchema = {
    title: bulkPOSchema.title,
    description: bulkPOSchema.description,
    fields: bulkPOSchema.fields,
  };
  return requestGuidePdf(guideSchema);
}

function buildInstructionsTxt(sampleVendor: string, sampleItemCode: string): string {
  const asOf = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push(`CollERP Bulk Upload - ${bulkPOSchema.title}`);
  lines.push(`As of ${asOf}`);
  lines.push("=".repeat(60), "");
  lines.push(bulkPOSchema.description, "");
  lines.push("HOW TO USE", "----------");
  lines.push("1. Open sample_purchase_orders.csv in your spreadsheet app.");
  lines.push("2. One row = one line item. Give every line of the same order the");
  lines.push("   SAME value in the po_ref column so they combine into one PO.");
  lines.push("3. Fill in rows below the header. Delete the example rows when done.");
  lines.push("4. Save as CSV (UTF-8).");
  lines.push("5. In the ERP, open Purchase Orders -> Bulk Add and upload the file.", "");
  lines.push("FIELD REFERENCE", "---------------");
  for (const f of bulkPOSchema.fields) {
    lines.push(`\n[${f.name}] - ${f.label} (${f.required ? "REQUIRED" : "optional"})`);
    lines.push(`  Type   : ${typeLabel(f)}`);
    if (f.description) lines.push(`  Note   : ${f.description}`);
    if (f.example) lines.push(`  Example: ${f.example}`);
  }
  lines.push("", "NOTES", "-----");
  lines.push("- Vendor must match an existing vendor's name or code.");
  lines.push("- Item Code is optional; blank means a non-stock / one-off line.");
  lines.push("- Dates must be in YYYY-MM-DD format.");
  lines.push("- Every purchase order is created as a Draft.");
  lines.push("- Orders with errors are skipped; valid orders are still saved.");
  void sampleVendor; void sampleItemCode;
  return lines.join("\n") + "\n";
}

export function buildStarterKitZip(sampleVendor: string, sampleItemCode: string): Blob {
  return buildZip([
    { name: "instructions.txt", data: buildInstructionsTxt(sampleVendor, sampleItemCode) },
    { name: "sample_purchase_orders.csv", data: buildPOCsvTemplate(sampleVendor, sampleItemCode) },
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
