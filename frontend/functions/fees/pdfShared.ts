// Identity metadata for the student fee pages. PDF generation itself now lives
// on the backend (see api/services/finance.ts); this file only retains the
// lightweight bits the UI still needs.

// Identity block shown for a student's fees.
export interface FeePdfMeta {
  studentName: string;
  rollNumber: string;
  courseName: string;
  institute?: string;
}

// Title-cases a tenant slug ("green-valley" -> "Green Valley") for branding.
export function prettyInstitute(slug?: string | null): string {
  if (!slug) return "";
  return slug
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
