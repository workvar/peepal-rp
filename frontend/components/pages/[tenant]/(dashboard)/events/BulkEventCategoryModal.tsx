"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@apollo/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, FileDown, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { CREATE_EVENT_CATEGORY } from "@/graphql/mutations/events";
import { parseCsv, rowsToObjects } from "@/components/ui/BulkUpload/csvParser";
import { validateRow, groupErrorsByRow } from "@/components/ui/BulkUpload/clientValidate";
import EditableTable from "@/components/ui/BulkUpload/EditableTable";
import {
  bulkCategorySchema,
  buildCategoriesCsvTemplate,
  rowToCategoryInput,
} from "./bulkEventCategorySchema";

type Stage = "pick" | "review" | "uploading" | "results";
type Row = Record<string, string>;
interface RowResult { index: number; success: boolean; error?: string }

const blankRow = (): Row => {
  const r: Row = {};
  bulkCategorySchema.fields.forEach((f) => (r[f.name] = ""));
  return r;
};

export default function BulkEventCategoryModal({
  open,
  onClose,
  onFinished,
}: {
  open: boolean;
  onClose: () => void;
  onFinished?: () => void;
}) {
  const [createCategory] = useMutation(CREATE_EVENT_CATEGORY);
  const [stage, setStage] = useState<Stage>("pick");
  const [rows, setRows] = useState<Row[]>([]);
  const [results, setResults] = useState<RowResult[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setStage("pick");
      setRows([]);
      setResults([]);
      setProgress({ done: 0, total: 0 });
    }
  }, [open]);

  const cellErrors = useMemo(() => {
    const errs = rows.flatMap((r, i) => validateRow(bulkCategorySchema, i, r));
    return groupErrorsByRow(errs);
  }, [rows]);
  const errorCount = Object.keys(cellErrors).length;

  function handleTemplate() {
    const blob = new Blob([buildCategoriesCsvTemplate()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "event_categories_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result || ""));
      if (parsed.header.length === 0) {
        toast.error("CSV looks empty");
        return;
      }
      const objs = rowsToObjects(parsed.header, parsed.rows);
      const normalized = objs.map((r) => {
        const out: Row = {};
        bulkCategorySchema.fields.forEach((f) => (out[f.name] = r[f.name] ?? ""));
        return out;
      });
      setRows(normalized.length ? normalized : [blankRow()]);
      setStage("review");
    };
    reader.readAsText(file);
  }

  const setCell = (i: number, field: string, value: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const deleteRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const addRow = () => setRows((prev) => [...prev, blankRow()]);

  async function handleSubmit() {
    if (rows.length === 0 || errorCount > 0) {
      toast.error("Fix the highlighted cells first");
      return;
    }
    setStage("uploading");
    setProgress({ done: 0, total: rows.length });
    const acc: RowResult[] = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        await createCategory({ variables: { input: rowToCategoryInput(rows[i]) } });
        acc.push({ index: i, success: true });
      } catch (e: unknown) {
        acc.push({ index: i, success: false, error: e instanceof Error ? e.message : "Failed" });
      }
      setProgress({ done: i + 1, total: rows.length });
    }
    setResults(acc);
    setStage("results");
    const ok = acc.filter((r) => r.success).length;
    toast.success(`Created ${ok} of ${rows.length} categories`);
    onFinished?.();
  }

  if (!open) return null;

  const okCount = results.filter((r) => r.success).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent size="lg" onClose={onClose} accent="green">
        <DialogHeader icon={<Upload size={18} />}>
          <DialogTitle>Bulk Add Categories</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">{bulkCategorySchema.description}</p>
        </DialogHeader>

        <DialogBody className="min-h-[180px]">
          {stage === "pick" && (
            <div className="space-y-5">
              <button
                onClick={handleTemplate}
                className="flex items-start gap-3 p-4 w-full rounded-lg border border-border hover:border-primary hover:bg-muted/30 transition-colors text-left"
              >
                <FileDown size={20} className="shrink-0 mt-0.5 text-primary" />
                <div>
                  <div className="font-medium">CSV template</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Headers and example rows (name, color, description).
                  </div>
                </div>
              </button>

              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                <Upload size={32} className="mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Upload a filled-in CSV</p>
                <p className="text-xs text-muted-foreground mb-4">
                  We&apos;ll show an editable preview before anything is saved.
                </p>
                <button onClick={() => fileRef.current?.click()} className="btn-primary">
                  Choose file…
                </button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={handleFile} />
                <p className="text-[11px] text-muted-foreground/70 mt-3">
                  Or{" "}
                  <button
                    onClick={() => { setRows([blankRow()]); setStage("review"); }}
                    className="text-primary hover:underline font-medium"
                  >
                    start with a blank row
                  </button>{" "}
                  and type categories in.
                </p>
              </div>
            </div>
          )}

          {stage === "review" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Edit any cell. Invalid cells are highlighted in red; hover to see why.
              </p>
              <EditableTable
                schema={bulkCategorySchema}
                rows={rows}
                cellErrors={cellErrors}
                onChangeCell={setCell}
                onDeleteRow={deleteRow}
                onAddRow={addRow}
              />
            </div>
          )}

          {stage === "uploading" && (
            <div className="py-10 space-y-4">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">
                  Creating {progress.done} of {progress.total} categories
                </span>
                <span className="text-muted-foreground">
                  {progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {stage === "results" && (
            <div className="space-y-4">
              <div className="flex items-center gap-6 p-3 rounded-lg bg-muted/50 border border-border text-sm">
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 size={18} /> {okCount} created
                </span>
                <span className="flex items-center gap-2 text-red-600">
                  <XCircle size={18} /> {results.length - okCount} failed
                </span>
              </div>
              <div className="rounded-lg border border-border divide-y divide-border/60 max-h-72 overflow-auto">
                {results.map((r) => (
                  <div key={r.index} className="flex items-center gap-3 px-3 py-2 text-xs">
                    <span className="font-mono text-muted-foreground w-8">#{r.index + 1}</span>
                    <span className="flex-1 truncate">
                      {r.success ? (
                        <span className="text-foreground/80">{(rows[r.index]?.name ?? "").trim() || "(unnamed)"}</span>
                      ) : (
                        <span className="text-red-700">{r.error}</span>
                      )}
                    </span>
                    {r.success
                      ? <CheckCircle2 size={14} className="text-green-600" />
                      : <XCircle size={14} className="text-red-600" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {stage === "pick" && <button className="btn-secondary" onClick={onClose}>Close</button>}
          {stage === "review" && (
            <>
              <button className="btn-ghost" onClick={() => setStage("pick")}>Back</button>
              <div className="flex-1 ml-2 text-xs text-muted-foreground">
                {errorCount > 0 ? (
                  <span className="text-red-600 font-medium">Fix {errorCount} row(s) with errors</span>
                ) : (
                  <span>{rows.length} row(s) ready</span>
                )}
              </div>
              <button
                className="btn-primary"
                disabled={rows.length === 0 || errorCount > 0}
                onClick={handleSubmit}
              >
                Create {rows.length}
              </button>
            </>
          )}
          {stage === "uploading" && <button className="btn-ghost" disabled>Creating…</button>}
          {stage === "results" && <button className="btn-primary" onClick={onClose}>Done</button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
