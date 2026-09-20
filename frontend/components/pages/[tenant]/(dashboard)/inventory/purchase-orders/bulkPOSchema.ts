// Client-side bulk-add schema for Purchase Orders. Stays GraphQL-pure: rows are
// grouped by `po_ref` and each group is submitted through the existing
// CREATE_PURCHASE_ORDER mutation (no REST endpoint, no backend codegen).
//
// Each CSV row is ONE line item. Rows sharing a `po_ref` become one purchase
// order with multiple lines; the header fields (vendor, dates, notes) are taken
// from the first row of the group.
import type { BulkRowError, BulkSchema } from "@/api/services/bulk";

export type VendorRef = { id: string; name: string; code?: string | null };
export type ItemRef = { id: string; code: string; name: string };

// Mirrors CreatePurchaseOrderInput / PurchaseOrderItemInput in the GraphQL schema.
export interface POLineInput {
  itemId: string | null;
  itemName: string;
  qty: number;
  unitCost: number;
  taxPct: number;
}
export interface POInput {
  vendorId: string;
  orderDate: string | null;
  expectedDate: string | null;
  notes: string | null;
  items: POLineInput[];
}

// One grouped purchase order ready to submit, plus the source row indexes so the
// results view can trace a group back to its CSV rows.
export interface POGroup {
  ref: string;
  vendorName: string;
  rowIndexes: number[];
  input: POInput;
}

export function buildBulkPOSchema(sampleVendor = "", sampleItemCode = ""): BulkSchema {
  return {
    resource: "purchase_orders",
    title: "Purchase Orders",
    description:
      "Bulk-create purchase orders. Each row is ONE line item; rows that share " +
      "the same PO Ref are combined into a single order (vendor, dates and notes " +
      "come from the first row of each group). Vendor must match an existing " +
      "vendor; Item Code is optional — leave it blank for a non-stock/one-off line.",
    fields: [
      { name: "po_ref", label: "PO Ref", type: "string", required: true, example: "PO-A", description: "Grouping key: rows with the same ref become one purchase order." },
      { name: "vendor", label: "Vendor", type: "string", required: true, example: sampleVendor || "Acme Supplies", description: "Existing vendor name or code." },
      { name: "order_date", label: "Order Date", type: "date", required: false, example: "2026-07-25" },
      { name: "expected_date", label: "Expected Date", type: "date", required: false, example: "2026-08-05" },
      { name: "item_code", label: "Item Code", type: "string", required: false, example: sampleItemCode, description: "Existing inventory item code, or blank for a non-stock line." },
      { name: "item_name", label: "Item Name", type: "string", required: true, example: "A4 Paper Ream" },
      { name: "qty", label: "Qty", type: "float", required: true, min: 0, example: "10" },
      { name: "unit_cost", label: "Unit Cost", type: "float", required: false, min: 0, example: "250" },
      { name: "tax_pct", label: "Tax %", type: "float", required: false, min: 0, example: "18" },
      { name: "notes", label: "Notes", type: "string", required: false, example: "Quarterly stationery" },
    ],
  };
}

export const bulkPOSchema: BulkSchema = buildBulkPOSchema();

// ── ref resolution maps ───────────────────────────────────────────────────────
export function vendorLookup(vendors: VendorRef[]): Map<string, VendorRef> {
  const m = new Map<string, VendorRef>();
  for (const v of vendors) {
    m.set(v.name.trim().toLowerCase(), v);
    if (v.code) m.set(v.code.trim().toLowerCase(), v);
  }
  return m;
}
export function itemLookup(items: ItemRef[]): Map<string, ItemRef> {
  const m = new Map<string, ItemRef>();
  for (const it of items) m.set(it.code.trim().toLowerCase(), it);
  return m;
}

const num = (s: string) => parseFloat((s ?? "").trim()) || 0;

// Group rows by po_ref (preserving first-seen order) into submittable POInputs.
export function groupRowsToPOInputs(
  rows: Record<string, string>[],
  vendors: Map<string, VendorRef>,
  items: Map<string, ItemRef>,
): POGroup[] {
  const order: string[] = [];
  const byRef = new Map<string, POGroup>();

  rows.forEach((row, i) => {
    const ref = (row.po_ref ?? "").trim();
    if (!ref) return;
    const vendor = vendors.get((row.vendor ?? "").trim().toLowerCase());
    const code = (row.item_code ?? "").trim().toLowerCase();
    const item = code ? items.get(code) : undefined;
    const line: POLineInput = {
      itemId: item?.id ?? null,
      itemName: (row.item_name ?? "").trim(),
      qty: num(row.qty),
      unitCost: num(row.unit_cost),
      taxPct: num(row.tax_pct),
    };

    let g = byRef.get(ref);
    if (!g) {
      g = {
        ref,
        vendorName: (row.vendor ?? "").trim(),
        rowIndexes: [],
        input: {
          vendorId: vendor?.id ?? "",
          orderDate: (row.order_date ?? "").trim() || null,
          expectedDate: (row.expected_date ?? "").trim() || null,
          notes: (row.notes ?? "").trim() || null,
          items: [],
        },
      };
      byRef.set(ref, g);
      order.push(ref);
    }
    g.rowIndexes.push(i);
    g.input.items.push(line);
  });

  return order.map((ref) => byRef.get(ref)!);
}

// Cross-field / cross-row checks the per-cell validator can't express:
// unknown vendor, unknown item code, and a vendor that disagrees within a group.
export function extraPORowErrors(
  rows: Record<string, string>[],
  vendors: Map<string, VendorRef>,
  items: Map<string, ItemRef>,
): BulkRowError[] {
  const errs: BulkRowError[] = [];
  // First vendor seen per ref, to flag later mismatches.
  const refVendor = new Map<string, string>();

  rows.forEach((row, i) => {
    const vRaw = (row.vendor ?? "").trim();
    if (vRaw && vendors.size > 0 && !vendors.has(vRaw.toLowerCase())) {
      errs.push({ index: i, field: "vendor", error: "no such vendor" });
    }
    const code = (row.item_code ?? "").trim();
    if (code && items.size > 0 && !items.has(code.toLowerCase())) {
      errs.push({ index: i, field: "item_code", error: "no such item code" });
    }
    const ref = (row.po_ref ?? "").trim();
    if (ref && vRaw) {
      const key = vRaw.toLowerCase();
      const seen = refVendor.get(ref);
      if (seen === undefined) refVendor.set(ref, key);
      else if (seen !== key) {
        errs.push({ index: i, field: "vendor", error: "vendor differs from others in this PO Ref" });
      }
    }
  });
  return errs;
}

// ── CSV template ──────────────────────────────────────────────────────────────
export function buildPOCsvTemplate(sampleVendor = "Acme Supplies", sampleItemCode = ""): string {
  const header = bulkPOSchema.fields.map((f) => f.name);
  const rows: string[][] = [
    ["PO-A", sampleVendor, "2026-07-25", "2026-08-05", sampleItemCode, "A4 Paper Ream", "10", "250", "18", "Quarterly stationery"],
    ["PO-A", sampleVendor, "2026-07-25", "2026-08-05", "", "Whiteboard Markers", "24", "35", "18", ""],
    ["PO-B", sampleVendor, "2026-07-26", "", "", "Printer Toner", "4", "3200", "18", "Urgent"],
  ];
  return [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
