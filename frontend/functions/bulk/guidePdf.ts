// Builds a bulk-upload field-guide PDF by POSTing the dialog's schema to the
// backend, which renders it (no client-side PDF generation). Shared by every
// GraphQL-loop bulk dialog (events, timetable, subjects, curriculum,
// exam-types, exam schedules, manager).

import type { BulkField } from "@/api/services/bulk";
import { bulkGuideAPI, type BulkGuideSpecReq } from "@/api/services/bulkGuide";

// Minimal schema shape the guide needs: a heading, intro, and field list.
export interface GuideSchema {
  title: string;
  description: string;
  fields: BulkField[];
}

// typeLabel mirrors backend/handlers/bulk/registry.go TypeLabel so the rendered
// guide reads the same whichever path produced it.
function typeLabel(f: BulkField): string {
  if (f.type === "enum") return `enum (${(f.allowed_values ?? []).join(" | ")})`;
  if (f.type === "date") return "date (YYYY-MM-DD)";
  if (f.type === "daterange") return "date or range (YYYY-MM-DD, or start..end / start to end)";
  return f.type;
}

export function schemaToGuideSpec(schema: GuideSchema): BulkGuideSpecReq {
  return {
    title: schema.title,
    description: schema.description,
    fields: schema.fields.map((f) => ({
      name: f.name,
      typeLabel: typeLabel(f),
      required: !!f.required,
      description: f.description,
      allowedValues: f.allowed_values,
      example: f.example,
    })),
  };
}

// Requests the rendered guide PDF from the backend and returns it as a Blob.
export async function requestGuidePdf(schema: GuideSchema): Promise<Blob> {
  const res = await bulkGuideAPI.downloadPDF(schemaToGuideSpec(schema));
  return res.data instanceof Blob ? res.data : new Blob([res.data], { type: "application/pdf" });
}
