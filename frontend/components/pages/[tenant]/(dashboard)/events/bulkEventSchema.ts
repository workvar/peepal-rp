// Client-side bulk-add schema for Events. Mirrors the shape used by the shared
// BulkUpload building blocks (CSV parser, validator, EditableTable) but stays
// GraphQL-pure: rows are submitted one-by-one through the existing CREATE_EVENT
// mutation, so no REST endpoint or backend codegen is involved.
import type { BulkRowError, BulkSchema } from "@/api/services/bulk";
import { EVENT_CATEGORIES, presetColors } from "./eventForm";

// The mutation input (CreateEventInput) minus recurrence-only fields.
export interface EventInput {
  title: string;
  description: string;
  eventDate: string;
  endDate: string;
  location: string;
  category: string;
  color: string;
  isPublic: boolean;
}

// Build the bulk schema for a given set of allowed category values. Passing the
// tenant's merged options (built-in defaults + org categories) lets the bulk
// uploader accept custom categories, not just the hardcoded ones.
export function buildBulkEventSchema(categoryValues: string[] = EVENT_CATEGORIES.map((c) => c.value)): BulkSchema {
  const values = categoryValues.length ? categoryValues : EVENT_CATEGORIES.map((c) => c.value);
  return {
    resource: "events",
    title: "Events",
    description:
      "Bulk-create calendar events. Each row is one event. Dates must be " +
      "YYYY-MM-DD; leave end_date blank for a single-day event. Category must be " +
      "one of: " + values.join(", ") + ".",
    fields: [
      { name: "title", label: "Title", type: "string", required: true, example: "Sports Day" },
      { name: "event_date", label: "Start Date", type: "date", required: true, example: "2026-06-10" },
      { name: "end_date", label: "End Date", type: "date", required: false, example: "2026-06-12" },
      {
        name: "category",
        label: "Category",
        type: "enum",
        required: true,
        allowed_values: values,
        example: values.includes("sports") ? "sports" : values[0],
      },
      { name: "location", label: "Location", type: "string", required: false, example: "Main Ground" },
      { name: "description", label: "Description", type: "string", required: false, example: "Annual meet" },
      { name: "color", label: "Color (hex)", type: "string", required: false, example: "#FF6B6B" },
      { name: "is_public", label: "Public", type: "bool", required: false, example: "true" },
    ],
  };
}

// Default schema (built-in categories only), kept for display-only callers such
// as the results view and the downloadable field guide.
export const bulkEventSchema: BulkSchema = buildBulkEventSchema();

// Example rows for the downloadable template (column order matches fields).
const exampleRows: string[][] = [
  ["Sports Day", "2026-06-10", "2026-06-12", "sports", "Main Ground", "Annual sports meet", "#FF6B6B", "true"],
  ["Convocation", "2026-07-01", "", "academic", "Auditorium", "Graduation ceremony", "#45B7D1", "true"],
];

const TRUE_WORDS = new Set(["true", "yes", "y", "1"]);

// Map an edited CSV row to a CREATE_EVENT input. Applies the same defaults the
// single-create form uses (endDate falls back to start, default color, public).
export function rowToEventInput(row: Record<string, string>): EventInput {
  const get = (k: string) => (row[k] ?? "").trim();
  const start = get("event_date");
  const isPublic = get("is_public").toLowerCase();
  return {
    title: get("title"),
    description: get("description"),
    eventDate: start,
    endDate: get("end_date") || start,
    location: get("location"),
    category: get("category").toLowerCase() || "other",
    color: get("color") || presetColors[0],
    isPublic: isPublic === "" ? true : TRUE_WORDS.has(isPublic),
  };
}

// Cross-field checks the per-cell validator can't express. Currently: end_date
// must not precede event_date.
export function extraRowErrors(index: number, row: Record<string, string>): BulkRowError[] {
  const start = (row["event_date"] ?? "").trim();
  const end = (row["end_date"] ?? "").trim();
  if (start && end && end < start) {
    return [{ index, field: "end_date", error: "end date is before start date" }];
  }
  return [];
}

// Build the CSV template text (header + example rows) for download.
export function buildEventsCsvTemplate(): string {
  const header = bulkEventSchema.fields.map((f) => f.name);
  return [header, ...exampleRows].map((r) => r.map(csvEscape).join(",")).join("\n");
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
