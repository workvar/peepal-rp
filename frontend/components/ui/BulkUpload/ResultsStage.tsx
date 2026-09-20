"use client";

import { CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { type BulkSchema, type BulkField, type BulkRowResult } from "@/api/services/bulk";

// Final wizard stage: per-row results with expandable detail panels.
export default function ResultsStage({
  results,
  rows,
  schema,
  total,
}: {
  results: BulkRowResult[];
  rows: Record<string, string>[];
  schema: BulkSchema;
  total: number;
}) {
  const ok = results.filter((r) => r.success).length;
  const failed = results.length - ok;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6 p-3 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-green-600" />
          <div>
            <div className="text-sm font-medium">{ok} successful</div>
            <div className="text-xs text-muted-foreground">rows inserted</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <XCircle size={18} className="text-red-600" />
          <div>
            <div className="text-sm font-medium">{failed} failed</div>
            <div className="text-xs text-muted-foreground">
              {failed === 0 ? "none" : "see details below"}
            </div>
          </div>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          Total submitted: {total}
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="max-h-[24rem] overflow-auto">
          {results.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No rows were processed.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {results.map((r) => (
                <ResultRow
                  key={r.index}
                  result={r}
                  row={rows[r.index] ?? {}}
                  schema={schema}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ResultRow renders one upload result with an accordion-style disclosure.
// Clicking anywhere on the summary row toggles a details panel that lists
// every submitted field/value. We lean on <details>/<summary> so keyboard
// accessibility and default styling come along for free.
function ResultRow({
  result,
  row,
  schema,
}: {
  result: BulkRowResult;
  row: Record<string, string>;
  schema: BulkSchema;
}) {
  const headline = buildRowHeadline(row, schema.fields);

  return (
    <li>
      <details className="group">
        <summary className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30 list-none">
          <ChevronRight
            size={14}
            className="text-muted-foreground transition-transform group-open:rotate-90"
          />
          <span className="font-mono text-xs text-muted-foreground w-10 shrink-0">
            #{result.index + 1}
          </span>
          <span className="w-20 shrink-0">
            {result.success ? (
              <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
                <CheckCircle2 size={12} /> OK
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red-700 text-xs font-medium">
                <XCircle size={12} /> Failed
              </span>
            )}
          </span>
          <span className="flex-1 truncate text-xs">
            {result.success ? (
              <span className="text-foreground/80">{headline}</span>
            ) : (
              <span className="text-red-700">{result.error}</span>
            )}
          </span>
        </summary>

        <div className="px-4 py-3 bg-muted/30 border-t border-border/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            {schema.fields.map((f) => {
              const raw = row[f.name] ?? "";
              const displayed = redactIfSensitive(f, raw);
              return (
                <div key={f.name} className="flex gap-2 min-w-0">
                  <span className="text-muted-foreground shrink-0 w-32 truncate" title={f.label}>
                    {f.label}
                  </span>
                  <span
                    className={
                      "truncate font-mono " +
                      (displayed === "" ? "text-muted-foreground/60 italic" : "text-foreground")
                    }
                    title={displayed}
                  >
                    {displayed === "" ? "—" : displayed}
                  </span>
                </div>
              );
            })}
          </div>
          {!result.success && result.error && (
            <div className="mt-3 pt-3 border-t border-border/60 text-xs">
              <span className="text-muted-foreground">Reason: </span>
              <span className="text-red-700">{result.error}</span>
            </div>
          )}
        </div>
      </details>
    </li>
  );
}

// buildRowHeadline picks a short, human-readable description of a row for
// the collapsed view. We prefer name/label-like fields so the user sees
// *who* or *what* each row represents without having to expand it.
function buildRowHeadline(row: Record<string, string>, fields: BulkField[]): string {
  const preferred = [
    "name", "full_name", "title", "label",
    "email", "user_email",
    "roll_number", "employee_id", "code",
  ];
  const picks: string[] = [];
  for (const key of preferred) {
    const f = fields.find((ff) => ff.name === key);
    if (!f) continue;
    const v = (row[key] ?? "").trim();
    if (v) picks.push(redactIfSensitive(f, v));
    if (picks.length >= 2) break;
  }
  if (picks.length > 0) return picks.join(" · ");
  // Fallback: first 2 non-empty, non-sensitive fields.
  for (const f of fields) {
    const v = (row[f.name] ?? "").trim();
    if (!v) continue;
    picks.push(redactIfSensitive(f, v));
    if (picks.length >= 2) break;
  }
  return picks.join(" · ") || "(empty row)";
}

// redactIfSensitive hides values we should never display back to the user,
// most importantly plaintext passwords from the submitted CSV.
function redactIfSensitive(f: BulkField, value: string): string {
  if (!value) return value;
  const n = f.name.toLowerCase();
  if (n === "password" || n === "user_password" || n.endsWith("_password")) {
    return "••••••••";
  }
  return value;
}
