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
import { Upload, FileDown, FileText, Archive, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { CREATE_EXAM_SCHEDULE } from "@/graphql/mutations/academic";
import { parseCsv, rowsToObjects } from "@/components/ui/BulkUpload/csvParser";
import { validateRow, groupErrorsByRow } from "@/components/ui/BulkUpload/clientValidate";
import EditableTable from "@/components/ui/BulkUpload/EditableTable";
import {
  buildBulkExamScheduleSchema,
  buildExamSchedulesCsvTemplate,
  extraExamScheduleRowErrors,
  rowToExamScheduleInput,
  normalizeAcademicYear,
} from "./bulkExamScheduleSchema";
import { buildFieldGuidePdf, buildStarterKitZip, downloadBlob } from "./bulkExamScheduleArtifacts";

export type AcademicYearRef = { id: string; name: string; isCurrent?: boolean };
export type ExamTypeRef = { id: string; name: string };

type Stage = "pick" | "review" | "uploading" | "results";
type Row = Record<string, string>;
type RowResult = { index: number; success: boolean; error?: string };

function blankRow(examTypeNames: string[]): Row {
  const r: Row = {};
  buildBulkExamScheduleSchema(examTypeNames).fields.forEach((f) => (r[f.name] = ""));
  return r;
}

export default function BulkExamScheduleModal({
  open,
  onClose,
  academicYears,
  examTypes,
  onFinished,
}: {
  open: boolean;
  onClose: () => void;
  academicYears: AcademicYearRef[];
  examTypes: ExamTypeRef[];
  onFinished?: () => void;
}) {
  const examTypeNames = useMemo(() => examTypes.map((t) => t.name), [examTypes]);
  const schema = useMemo(() => buildBulkExamScheduleSchema(examTypeNames), [examTypeNames]);
  const [createExamSchedule] = useMutation(CREATE_EXAM_SCHEDULE);
  const [stage, setStage] = useState<Stage>("pick");
  const [rows, setRows] = useState<Row[]>([]);
  const [results, setResults] = useState<RowResult[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Case-insensitive academic-year-name → id map for submit.
  const acYearIdByName = useMemo(() => {
    const m = new Map<string, string>();
    academicYears.forEach((y) => m.set(y.name.toLowerCase(), y.id));
    return m;
  }, [academicYears]);

  const currentYearId = useMemo(
    () => academicYears.find((y) => y.isCurrent)?.id,
    [academicYears],
  );

  // Dropdown options for the academic_year column — value = year name, not id.
  const acYearOptions = useMemo(
    () => academicYears.map((y) => ({ label: y.name, value: y.name })),
    [academicYears],
  );

  useEffect(() => {
    if (open) {
      setStage("pick");
      setRows([]);
      setResults([]);
      setProgress({ done: 0, total: 0 });
    }
  }, [open]);

  const cellErrors = useMemo(() => {
    const errs = rows.flatMap((r, i) => [
      ...validateRow(schema, i, r),
      ...extraExamScheduleRowErrors(i, r),
    ]);
    return groupErrorsByRow(errs);
  }, [rows, schema]);
  const errorCount = Object.keys(cellErrors).length;

  async function download(make: () => Blob | Promise<Blob>, filename: string) {
    try {
      downloadBlob(await make(), filename);
    } catch {
      toast.error("Could not generate the file");
    }
  }
  const handleTemplate = () =>
    download(
      () => new Blob([buildExamSchedulesCsvTemplate(examTypeNames)], { type: "text/csv;charset=utf-8" }),
      "exam_schedules_template.csv",
    );
  const handleGuide = () => download(() => buildFieldGuidePdf(examTypeNames), "exam_schedules_bulk_upload_guide.pdf");
  const handleStarterKit = () => download(() => buildStarterKitZip(examTypeNames), "exam_schedules_bulk_upload_starter.zip");

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
        schema.fields.forEach((f) => (out[f.name] = r[f.name] ?? ""));
        // Resolve academic_year: exact match, then normalized match ("2024-2025" == "2024-25").
        const csvYear = (out.academic_year ?? "").trim();
        if (csvYear) {
          const exactMatch = acYearOptions.find(
            (o) => o.value.toLowerCase() === csvYear.toLowerCase(),
          );
          if (exactMatch) {
            out.academic_year = exactMatch.value;
          } else {
            const normCsv = normalizeAcademicYear(csvYear);
            const normMatch = acYearOptions.find(
              (o) => normalizeAcademicYear(o.value) === normCsv,
            );
            out.academic_year = normMatch ? normMatch.value : "";
          }
        }
        return out;
      });
      setRows(normalized.length ? normalized : [blankRow(examTypeNames)]);
      setStage("review");
    };
    reader.readAsText(file);
  }

  function startBlank() {
    setRows([blankRow(examTypeNames)]);
    setStage("review");
  }

  const setCell = (i: number, field: string, value: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const deleteRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const addRow = () => setRows((prev) => [...prev, blankRow(examTypeNames)]);

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
        await createExamSchedule({
          variables: { input: rowToExamScheduleInput(rows[i], acYearIdByName, currentYearId) },
        });
        acc.push({ index: i, success: true });
      } catch (e: unknown) {
        acc.push({ index: i, success: false, error: e instanceof Error ? e.message : "Failed" });
      }
      setProgress({ done: i + 1, total: rows.length });
    }
    setResults(acc);
    setStage("results");
    const ok = acc.filter((r) => r.success).length;
    toast.success(`Created ${ok} of ${rows.length} exam schedules`);
    onFinished?.();
  }

  if (!open) return null;

  const okCount = results.filter((r) => r.success).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent size="xl" onClose={onClose} accent="green">
        <DialogHeader icon={<Upload size={18} />}>
          <DialogTitle>Bulk Add Exam Schedules</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">{schema.description}</p>
        </DialogHeader>

        <DialogBody className="min-h-[200px]">
          {stage === "pick" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={handleTemplate}
                  className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/30 transition-colors text-left"
                >
                  <FileDown size={20} className="shrink-0 mt-0.5 text-primary" />
                  <div>
                    <div className="font-medium">CSV template</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Headers and example rows.</div>
                  </div>
                </button>
                <button
                  onClick={handleGuide}
                  className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/30 transition-colors text-left"
                >
                  <FileText size={20} className="shrink-0 mt-0.5 text-primary" />
                  <div>
                    <div className="font-medium">Field guide (PDF)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Column meanings, allowed values.</div>
                  </div>
                </button>
                <button
                  onClick={handleStarterKit}
                  className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/30 transition-colors text-left"
                >
                  <Archive size={20} className="shrink-0 mt-0.5 text-primary" />
                  <div>
                    <div className="font-medium">Starter kit (ZIP)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">CSV + instructions.txt.</div>
                  </div>
                </button>
              </div>

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
                  <button onClick={startBlank} className="text-primary hover:underline font-medium">
                    start with a blank row
                  </button>{" "}
                  and type schedules in.
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
                schema={schema}
                rows={rows}
                cellErrors={cellErrors}
                onChangeCell={setCell}
                onDeleteRow={deleteRow}
                onAddRow={addRow}
                dynamicOptions={{
                  academic_year: { options: acYearOptions, searchable: true },
                  exam_type: examTypeNames.map((n) => ({ label: n, value: n })),
                }}
              />
            </div>
          )}

          {stage === "uploading" && (
            <div className="py-10 space-y-4">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">Creating {progress.done} of {progress.total} exam schedules</span>
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
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {okCount} of {results.length} exam schedules created.
              </p>
              <div className="max-h-64 overflow-auto rounded-lg border border-border divide-y divide-border/60">
                {results.map((r) => (
                  <div key={r.index} className="flex items-start gap-2 px-3 py-2 text-sm">
                    {r.success ? (
                      <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                    )}
                    <span className="font-medium">{rows[r.index]?.name || `Row ${r.index + 1}`}</span>
                    {!r.success && <span className="text-red-600">— {r.error}</span>}
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
