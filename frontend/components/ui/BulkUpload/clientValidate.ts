import type { BulkField, BulkRowError, BulkSchema } from "@/api/services/bulk";
import type { DynamicFieldEntry } from "./EditableTable";

// Client-side validator that mirrors backend/handlers/bulk/validate.go.
// It exists to give the user instant feedback in the table editor — the
// server always re-runs validation at /submit so a patched client can't
// sneak bad data in.

export function validateRow(
  schema: BulkSchema,
  index: number,
  row: Record<string, string>,
  dynamicOptions?: Record<string, DynamicFieldEntry>
): BulkRowError[] {
  const errors: BulkRowError[] = [];
  for (const f of schema.fields) {
    const v = (row[f.name] ?? "").trim();
    if (v === "") {
      if (f.required) {
        errors.push({ index, field: f.name, error: "required" });
      }
      continue;
    }
    const msg = validateCell(f, v);
    if (msg) {
      errors.push({ index, field: f.name, error: msg });
      continue;
    }
    const strictMsg = validateStrictOption(f, v, row, dynamicOptions?.[f.name]);
    if (strictMsg) errors.push({ index, field: f.name, error: strictMsg });
  }
  return errors;
}

// For a strict dynamic-option field (e.g. fee structure), the value must
// resolve to one of the loaded options. Matched values were already normalized
// to the option's value on import, so a value that still isn't in the list is
// genuinely unknown and gets flagged. While the option list is empty (still
// loading) nothing is flagged, to avoid false reds.
function validateStrictOption(
  f: BulkField,
  v: string,
  row: Record<string, string>,
  entry: DynamicFieldEntry | undefined
): string | null {
  if (!entry || Array.isArray(entry) || !entry.strict) return null;
  const opts = typeof entry.options === "function" ? entry.options(row) : entry.options;
  if (opts.length === 0) return null;
  if (opts.some((o) => o.value === v)) return null;
  return `not an existing ${f.label.toLowerCase()}`;
}

function validateCell(f: BulkField, v: string): string | null {
  switch (f.type) {
    case "string": {
      if (f.allowed_values && f.allowed_values.length > 0) {
        if (!includesI(f.allowed_values, v)) return `invalid value (allowed: ${f.allowed_values.join(", ")})`;
      }
      return null;
    }
    case "email": {
      // Deliberately loose — Go's net/mail is permissive too.
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "not a valid email";
      return null;
    }
    case "int": {
      if (!/^-?\d+$/.test(v)) return "expected an integer";
      const n = parseInt(v, 10);
      if (f.min !== undefined && n < f.min) return `must be >= ${f.min}`;
      if (f.max !== undefined && n > f.max) return `must be <= ${f.max}`;
      return null;
    }
    case "float": {
      const n = parseFloat(v);
      if (Number.isNaN(n)) return "expected a number";
      if (f.min !== undefined && n < f.min) return `must be >= ${f.min}`;
      if (f.max !== undefined && n > f.max) return `must be <= ${f.max}`;
      return null;
    }
    case "bool": {
      if (!/^(true|false|yes|no|y|n|1|0)$/i.test(v)) return "expected true/false / yes/no / 1/0";
      return null;
    }
    case "date": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "expected YYYY-MM-DD";
      const d = new Date(v + "T00:00:00Z");
      if (Number.isNaN(d.getTime())) return "invalid date";
      return null;
    }
    case "daterange": {
      return validateDateRange(v);
    }
    case "enum": {
      if (!includesI(f.allowed_values ?? [], v)) {
        return `invalid value (allowed: ${(f.allowed_values ?? []).join(", ")})`;
      }
      return null;
    }
  }
  return null;
}

function includesI(pool: string[], v: string): boolean {
  const vl = v.toLowerCase();
  return pool.some((p) => p.toLowerCase() === vl);
}

// Mirrors backend ExpandDateRange: a cell is either one YYYY-MM-DD or a
// start..end / start to end / comma-separated pair. Returns an error string
// or null. The server re-validates and does the actual day-by-day expansion.
const DATE_RANGE_SEP = /\s*(?:\.\.+|~|,|->|–|—|\bto\b)\s*/i;

function validateDateRange(v: string): string | null {
  const parts = v.trim().split(DATE_RANGE_SEP).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return "expected a date";
  if (parts.length > 2) return "use a single date or one start..end range";
  for (const p of parts) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p)) return "expected YYYY-MM-DD";
    if (Number.isNaN(new Date(p + "T00:00:00Z").getTime())) return "invalid date";
  }
  if (parts.length === 2 && parts[1] < parts[0]) return "range end is before its start";
  return null;
}

// Bucket errors by row index for fast lookup in the table renderer.
export function groupErrorsByRow(
  errors: BulkRowError[]
): Record<number, Record<string, string>> {
  const out: Record<number, Record<string, string>> = {};
  for (const e of errors) {
    if (!out[e.index]) out[e.index] = {};
    out[e.index][e.field] = e.error;
  }
  return out;
}
