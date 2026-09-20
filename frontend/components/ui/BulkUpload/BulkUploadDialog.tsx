"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Upload, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import {
  bulkAPI,
  saveBlob,
  formatBytes,
  DEFAULT_MAX_FILE_SIZE_BYTES,
  type BulkSchema,
  type BulkRowResult,
} from "@/api/services/bulk";
import { parseCsv, rowsToObjects } from "./csvParser";
import { groupErrorsByRow, validateRow } from "./clientValidate";
import PickStage from "./PickStage";
import ReviewStage from "./ReviewStage";
import UploadingStage from "./UploadingStage";
import ResultsStage from "./ResultsStage";
import type { DynamicFieldEntry } from "./EditableTable";

// Normalize common date formats to YYYY-MM-DD.
// Handles: YYYY-MM-DD (pass-through), DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, DD.MM.YYYY.
function normalizeDate(raw: string): string {
  const s = raw.trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    // Disambiguate: if day > 12 it must be DD/MM; if month > 12 it must be MM/DD.
    // Default to DD/MM/YYYY (international convention for ERP data).
    const day = parseInt(d, 10);
    const mon = parseInt(m, 10);
    if (day > 12 && mon <= 12) return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
    if (mon > 12 && day <= 12) return `${y}-${d.padStart(2,"0")}-${m.padStart(2,"0")}`;
    // Default: treat as DD/MM/YYYY
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  return s; // unknown format, pass through
}

// Stages form a simple linear wizard: pick → review → uploading → results.
// Using an explicit union makes it easy to reason about which UI chrome to
// show without a mountain of booleans.
type Stage = "pick" | "review" | "uploading" | "results";

interface Props {
  resource: string;
  open: boolean;
  onClose: () => void;
  onFinished?: (summary: { successful: number; failed: number; total: number }) => void;
  /** Dynamic dropdown options keyed by field name (e.g. salary_template_id). */
  dynamicOptions?: Record<string, DynamicFieldEntry>;
}

export default function BulkUploadDialog({ resource, open, onClose, onFinished, dynamicOptions }: Props) {
  const [schema, setSchema] = useState<BulkSchema | null>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [cellErrors, setCellErrors] = useState<Record<number, Record<string, string>>>({});
  const [progress, setProgress] = useState<{ done: number; total: number; ok: number; failed: number }>({
    done: 0, total: 0, ok: 0, failed: 0,
  });
  const [results, setResults] = useState<BulkRowResult[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cancelledRef = useRef(false);

  // Load the schema once per resource. We re-fetch when the dialog opens
  // so schema edits are picked up without a hard reload.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    bulkAPI.getSchema(resource)
      .then((s) => { if (!cancelled) setSchema(s); })
      .catch(() => toast.error("Could not load upload schema"));
    return () => { cancelled = true; };
  }, [open, resource]);

  // Reset state whenever the dialog is re-opened.
  useEffect(() => {
    if (open) {
      cancelledRef.current = false;
      setStage("pick");
      setRows([]);
      setCellErrors({});
      setResults([]);
      setSelectedRows(new Set());
      setProgress({ done: 0, total: 0, ok: 0, failed: 0 });
    }
  }, [open]);

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    // Results will show whatever was collected before cancel.
  }, []);

  // Keep client-side errors in sync with row edits.
  useEffect(() => {
    if (!schema || rows.length === 0) {
      setCellErrors({});
      return;
    }
    const errs = rows.flatMap((r, i) => validateRow(schema, i, r, dynamicOptions));
    setCellErrors(groupErrorsByRow(errs));
  }, [rows, schema, dynamicOptions]);

  const hasErrors = Object.keys(cellErrors).length > 0;

  // ── Actions ────────────────────────────────────────────────────
  async function handleTemplate() {
    try {
      const blob = await bulkAPI.downloadTemplate(resource);
      saveBlob(blob, `${resource}_template.csv`);
    } catch {
      toast.error("Failed to download template");
    }
  }

  async function handleDocs() {
    try {
      const blob = await bulkAPI.downloadDocs(resource);
      saveBlob(blob, `${resource}_bulk_upload_guide.pdf`);
    } catch {
      toast.error("Failed to download guide");
    }
  }

  async function handleStarterKit() {
    try {
      const blob = await bulkAPI.downloadStarterKit(resource);
      saveBlob(blob, `${resource}_bulk_upload_starter.zip`);
    } catch {
      toast.error("Failed to download starter kit");
    }
  }

  function handleFileChosen(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file || !schema) return;
    // Clamp to whatever the server advertises; fall back to the shared
    // default if the field is absent (older server builds).
    const maxBytes = schema.max_file_size_bytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;
    if (file.size > maxBytes) {
      toast.error(
        `File is ${formatBytes(file.size)} — max allowed is ${formatBytes(maxBytes)}. ` +
        `Split the CSV into smaller batches and try again.`
      );
      ev.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseCsv(text);
      if (parsed.header.length === 0) {
        toast.error("CSV looks empty");
        return;
      }
      const objs = rowsToObjects(parsed.header, parsed.rows);
      // Start with ALL CSV columns so extra fields (e.g. batches) are
      // preserved even if the schema was fetched before a backend restart.
      // Then apply schema-based normalization (dynamic option label→UUID swap)
      // on top. The review table renders only schema fields, but the full row
      // is submitted so the backend can act on any extra columns it knows about.
      const normalized = objs.map((r) => {
        const out: Record<string, string> = { ...r };
        schema.fields.forEach((f) => {
          // Use `out` (not `r`) so earlier resolutions (e.g. course_id → UUID)
          // are visible when processing dependent fields (e.g. batch).
          let val = out[f.name] ?? "";

          // Normalize date fields to YYYY-MM-DD regardless of input format.
          if (f.type === "date" && val) {
            val = normalizeDate(val);
          }

          const entry = dynamicOptions?.[f.name];
          if (entry && val) {
            // Pass `out` to function-based resolvers so they see already-resolved values.
            const opts = Array.isArray(entry)
              ? entry
              : typeof entry.options === "function"
              ? entry.options(out)
              : entry.options;
            const byValue = opts.find((o) => o.value === val);
            if (!byValue) {
              const v = val.toLowerCase();
              // 1. Exact label match
              // 2. Code-in-parens match: "BTCSE" matches "Bachelor of Technology (BTCSE)"
              // 3. Prefix match: "BTCSE " prefix
              const match =
                opts.find((o) => o.label.toLowerCase() === v) ??
                opts.find((o) => o.label.toLowerCase().endsWith(`(${v})`)) ??
                opts.find((o) => o.label.toLowerCase().startsWith(`${v} `));
              if (match) val = match.value;
            }
          }
          out[f.name] = val;
        });
        return out;
      });
      setRows(normalized);
      setStage("review");
    };
    reader.readAsText(file);
    // Allow the same file to be re-selected later.
    ev.target.value = "";
  }

  function handleCellChange(rowIdx: number, field: string, value: string) {
    setRows((prev) => {
      const copy = prev.slice();
      copy[rowIdx] = { ...copy[rowIdx], [field]: value };
      return copy;
    });
  }

  function handleMultiCellChange(rowIdx: number, updates: Record<string, string>) {
    setRows((prev) => {
      const copy = prev.slice();
      copy[rowIdx] = { ...copy[rowIdx], ...updates };
      return copy;
    });
  }

  function handleDeleteRow(rowIdx: number) {
    setRows((prev) => prev.filter((_, i) => i !== rowIdx));
    setSelectedRows((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => { if (i < rowIdx) next.add(i); else if (i > rowIdx) next.add(i - 1); });
      return next;
    });
  }

  function handleDeleteSelected() {
    const sorted = [...selectedRows].sort((a, b) => b - a);
    setRows((prev) => prev.filter((_, i) => !selectedRows.has(i)));
    setSelectedRows(new Set());
    toast.success(`Deleted ${sorted.length} row${sorted.length === 1 ? "" : "s"}`);
  }

  function handleToggleRow(idx: number) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function handleToggleAll() {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.map((_, i) => i)));
    }
  }

  function handleAddRow() {
    if (!schema) return;
    const empty: Record<string, string> = {};
    schema.fields.forEach((f) => { empty[f.name] = ""; });
    setRows((prev) => [...prev, empty]);
  }

  // Upload in small chunks so we can drive a live progress bar even over
  // one logical submission. The server still validates each row and returns
  // per-row results — we stitch them together.
  //
  // Each chunk gets a 30-second timeout. If a chunk times out or errors, its
  // rows are marked failed and the loop continues — the upload never hangs.
  async function handleSubmit() {
    if (!schema || rows.length === 0) return;
    if (hasErrors) {
      toast.error("Fix the highlighted cells before uploading");
      return;
    }
    cancelledRef.current = false;
    setStage("uploading");
    setResults([]);
    setProgress({ done: 0, total: rows.length, ok: 0, failed: 0 });

    const CHUNK = 100;
    const CHUNK_TIMEOUT_MS = 30_000;
    const acc: BulkRowResult[] = [];
    let ok = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i += CHUNK) {
      if (cancelledRef.current) break;

      const chunk = rows.slice(i, i + CHUNK);
      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out after 30s")), CHUNK_TIMEOUT_MS)
        );
        const resp = await Promise.race([bulkAPI.submit(resource, chunk), timeout]);
        for (const r of resp.results) {
          acc.push({ ...r, index: r.index + i });
          if (r.success) ok++;
          else failed++;
        }
      } catch (err) {
        // Mark every row in this chunk as failed so the loop can keep going.
        const msg = err instanceof Error ? err.message : "Network error";
        for (let j = 0; j < chunk.length; j++) {
          acc.push({ index: i + j, success: false, error: msg });
          failed++;
        }
        toast.error(`Rows ${i + 1}–${i + chunk.length} failed: ${msg}`);
      }

      setProgress({ done: acc.length, total: rows.length, ok, failed });
    }

    setResults(acc);
    setStage("results");
    onFinished?.({ successful: ok, failed, total: rows.length });
  }

  function handleRetry() {
    // Build a fresh row list from the failed entries so the user can edit
    // and retry just those.
    const failedIdx = new Set(results.filter((r) => !r.success).map((r) => r.index));
    const retryRows = rows.filter((_, i) => failedIdx.has(i));
    setRows(retryRows);
    setResults([]);
    setStage("review");
  }

  // ── Rendering ──────────────────────────────────────────────────
  if (!open) return null;
  const title =
    stage === "pick" ? `Bulk Upload — ${schema?.title ?? resource}`
    : stage === "review" ? `Review & Edit — ${schema?.title ?? resource}`
    : stage === "uploading" ? "Uploading…"
    : "Upload Results";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent size="xl" onClose={onClose} accent="cyan">
        <DialogHeader icon={<Upload size={18} />}>
          <DialogTitle>{title}</DialogTitle>
          {schema && (
            <p className="text-xs text-muted-foreground mt-1">{schema.description}</p>
          )}
        </DialogHeader>

        <DialogBody className="min-h-[200px]">
          {stage === "pick" && (
            <PickStage
              schema={schema}
              maxBytes={schema?.max_file_size_bytes ?? DEFAULT_MAX_FILE_SIZE_BYTES}
              onTemplate={handleTemplate}
              onDocs={handleDocs}
              onStarterKit={handleStarterKit}
              onChooseFile={() => fileRef.current?.click()}
              fileInputRef={fileRef}
              onFileChosen={handleFileChosen}
            />
          )}

          {stage === "review" && schema && (
            <ReviewStage
              schema={schema}
              rows={rows}
              cellErrors={cellErrors}
              onChangeCell={handleCellChange}
              onChangeCells={handleMultiCellChange}
              onDeleteRow={handleDeleteRow}
              onDeleteSelected={handleDeleteSelected}
              onAddRow={handleAddRow}
              dynamicOptions={dynamicOptions}
              selectedRows={selectedRows}
              onToggleRow={handleToggleRow}
              onToggleAll={handleToggleAll}
            />
          )}

          {stage === "uploading" && (
            <UploadingStage progress={progress} onCancel={handleCancel} />
          )}

          {stage === "results" && schema && (
            <ResultsStage results={results} rows={rows} schema={schema} total={rows.length} />
          )}
        </DialogBody>

        <DialogFooter>
          {stage === "pick" && (
            <button className="btn-secondary" onClick={onClose}>Close</button>
          )}
          {stage === "review" && (
            <>
              <button className="btn-ghost" onClick={() => setStage("pick")}>Back</button>
              <div className="text-xs text-muted-foreground flex-1 ml-2">
                {hasErrors
                  ? <span className="text-red-600 font-medium">Fix {Object.keys(cellErrors).length} row(s) with errors</span>
                  : <span>{rows.length} row(s) ready to upload</span>}
              </div>
              <button
                className="btn-primary"
                disabled={rows.length === 0 || hasErrors}
                onClick={handleSubmit}
              >
                Upload {rows.length}
              </button>
            </>
          )}
          {stage === "uploading" && (
            <button className="btn-ghost" disabled>Uploading…</button>
          )}
          {stage === "results" && (
            <>
              {results.some((r) => !r.success) && (
                <button className="btn-ghost" onClick={handleRetry}>
                  <RotateCcw size={14} /> Retry failed rows
                </button>
              )}
              <button className="btn-primary" onClick={onClose}>Done</button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
