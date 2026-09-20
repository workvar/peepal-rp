"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, FileDown, FileText, Archive } from "lucide-react";
import toast from "react-hot-toast";
import { LIST_COURSES, LIST_SUBJECTS } from "@/graphql/queries/academic";
import { LIST_EMPLOYEES } from "@/graphql/queries/employees";
import { CREATE_TIMETABLE_SLOT } from "@/graphql/mutations/timetable";
import { parseCsv, rowsToObjects } from "@/components/ui/BulkUpload/csvParser";
import { validateRow, groupErrorsByRow } from "@/components/ui/BulkUpload/clientValidate";
import EditableTable from "@/components/ui/BulkUpload/EditableTable";
import {
  buildBulkTimetableSchema,
  buildTimetableCsvTemplate,
  extraTimetableErrors,
  collisionErrors,
  rowToTimetableInput,
  type CourseRef,
} from "./bulkTimetableSchema";
import { buildFieldGuidePdf, buildStarterKitZip, downloadBlob } from "./bulkTimetableArtifacts";
import BulkTimetableResults, { type RowResult } from "./BulkTimetableResults";

type Stage = "pick" | "review" | "uploading" | "results";
type Row = Record<string, string>;
type Course = { id: string; name: string; code: string; durationYears?: number | null; totalSemesters?: number | null };
type Subj = { id: string; code: string; name: string };
type Employee = { id: string; employeeId?: string | null; user?: { name?: string | null; email?: string | null } | null };

export default function BulkTimetableModal({
  open,
  onClose,
  onFinished,
}: {
  open: boolean;
  onClose: () => void;
  onFinished?: () => void;
}) {
  const [createSlot] = useMutation(CREATE_TIMETABLE_SLOT);
  const { data: coursesData } = useQuery(LIST_COURSES);
  const { data: subjData } = useQuery(LIST_SUBJECTS);
  const { data: empData } = useQuery(LIST_EMPLOYEES);
  const courses: Course[] = coursesData?.courses ?? [];
  const subjects: Subj[] = subjData?.subjects ?? [];
  const employees: Employee[] = empData?.employees ?? [];

  const [stage, setStage] = useState<Stage>("pick");
  const [rows, setRows] = useState<Row[]>([]);
  const [results, setResults] = useState<RowResult[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement | null>(null);

  const courseByCode = useMemo(() => {
    const m = new Map<string, CourseRef>();
    for (const c of courses) {
      const total = c.totalSemesters || (c.durationYears ? c.durationYears * 2 : 0);
      m.set(c.code.toLowerCase(), { id: c.id, total, label: `${c.name} (${c.code})` });
    }
    return m;
  }, [courses]);
  const subjectCodeToId = useMemo(
    () => new Map(subjects.map((s) => [s.code.toLowerCase(), s.id])),
    [subjects],
  );
  // Teachers resolve by Employee ID, email, or name (and id as a last resort so
  // any picker selection always resolves).
  const teacherToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) {
      if (e.user?.name) m.set(e.user.name.toLowerCase(), e.id);
      if (e.user?.email) m.set(e.user.email.toLowerCase(), e.id);
      if (e.employeeId) m.set(e.employeeId.toLowerCase(), e.id);
      m.set(e.id.toLowerCase(), e.id);
    }
    return m;
  }, [employees]);

  const courseOptions = useMemo(
    () => courses.map((c) => ({ value: c.code, label: `${c.name} (${c.code})` })),
    [courses],
  );
  const subjectOptions = useMemo(
    () => subjects.map((s) => ({ value: s.code, label: `${s.name} (${s.code})` })),
    [subjects],
  );
  const teacherOptions = useMemo(
    () =>
      employees.map((e) => {
        const value = e.employeeId || e.user?.email || e.user?.name || e.id;
        const tag = e.employeeId ? ` (${e.employeeId})` : e.user?.email ? ` (${e.user.email})` : "";
        return { value, label: `${e.user?.name ?? "—"}${tag}` };
      }),
    [employees],
  );

  const sampleCourseCode = courses[0]?.code ?? "";
  const sampleSubjectCodes = useMemo(() => subjects.slice(0, 3).map((s) => s.code), [subjects]);

  const schema = useMemo(
    () => buildBulkTimetableSchema(sampleCourseCode, sampleSubjectCodes[0] ?? ""),
    [sampleCourseCode, sampleSubjectCodes],
  );

  const blankRow = (): Row => {
    const r: Row = {};
    schema.fields.forEach((f) => (r[f.name] = ""));
    return r;
  };

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
      ...extraTimetableErrors(i, r, courseByCode, subjectCodeToId, teacherToId),
    ]);
    errs.push(...collisionErrors(rows));
    return groupErrorsByRow(errs);
  }, [rows, schema, courseByCode, subjectCodeToId, teacherToId]);
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
      () => new Blob([buildTimetableCsvTemplate(schema, sampleCourseCode, sampleSubjectCodes)], { type: "text/csv;charset=utf-8" }),
      "timetable_template.csv",
    );
  const handleGuide = () => download(() => buildFieldGuidePdf(schema), "timetable_bulk_upload_guide.pdf");
  const handleStarterKit = () =>
    download(() => buildStarterKitZip(schema, sampleCourseCode, sampleSubjectCodes), "timetable_bulk_upload_starter.zip");

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
        return out;
      });
      setRows(normalized.length ? normalized : [blankRow()]);
      setStage("review");
    };
    reader.readAsText(file);
  }

  function startBlank() {
    setRows([blankRow()]);
    setStage("review");
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
        await createSlot({
          variables: { input: rowToTimetableInput(rows[i], courseByCode, subjectCodeToId, teacherToId) },
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
    toast.success(`Added ${ok} of ${rows.length} slots`);
    onFinished?.();
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent size="xl" onClose={onClose} accent="green">
        <DialogHeader icon={<Upload size={18} />}>
          <DialogTitle>Bulk Add Timetable Slots</DialogTitle>
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
                    <div className="text-xs text-muted-foreground mt-0.5">Column meanings, how it works.</div>
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
                  and type slots in.
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
                  course_code: { options: courseOptions, searchable: true },
                  subject_code: { options: subjectOptions, searchable: true },
                  teacher: { options: teacherOptions, searchable: true },
                }}
              />
            </div>
          )}

          {stage === "uploading" && (
            <div className="py-10 space-y-4">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">Adding {progress.done} of {progress.total} slots</span>
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

          {stage === "results" && <BulkTimetableResults results={results} rows={rows} />}
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
              <button className="btn-primary" disabled={rows.length === 0 || errorCount > 0} onClick={handleSubmit}>
                Add {rows.length}
              </button>
            </>
          )}
          {stage === "uploading" && <button className="btn-ghost" disabled>Adding…</button>}
          {stage === "results" && <button className="btn-primary" onClick={onClose}>Done</button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
