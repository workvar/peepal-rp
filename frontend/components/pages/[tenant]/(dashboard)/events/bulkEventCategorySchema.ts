// Client-side bulk-add schema for Event Categories. Mirrors the events bulk
// flow but stays GraphQL-pure: rows are submitted one-by-one through the
// CREATE_EVENT_CATEGORY mutation, so no REST endpoint is involved.
import type { BulkSchema } from "@/api/services/bulk";
import { presetColors } from "./eventForm";

export interface EventCategoryInput {
  name: string;
  color: string;
  description: string;
}

export const bulkCategorySchema: BulkSchema = {
  resource: "event_categories",
  title: "Event Categories",
  description:
    "Bulk-create event categories. Each row is one category. Name is required; " +
    "color is an optional hex value (defaults to a preset) and description is optional.",
  fields: [
    { name: "name", label: "Name", type: "string", required: true, example: "Workshop" },
    { name: "color", label: "Color (hex)", type: "string", required: false, example: "#BB8FCE" },
    { name: "description", label: "Description", type: "string", required: false, example: "Skill sessions" },
  ],
};

const exampleRows: string[][] = [
  ["Workshop", "#BB8FCE", "Hands-on skill sessions"],
  ["Guest Lecture", "#45B7D1", "External speaker talks"],
];

export function rowToCategoryInput(row: Record<string, string>): EventCategoryInput {
  const get = (k: string) => (row[k] ?? "").trim();
  return {
    name: get("name"),
    color: get("color") || presetColors[0],
    description: get("description"),
  };
}

export function buildCategoriesCsvTemplate(): string {
  const header = bulkCategorySchema.fields.map((f) => f.name);
  return [header, ...exampleRows].map((r) => r.map(csvEscape).join(",")).join("\n");
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
