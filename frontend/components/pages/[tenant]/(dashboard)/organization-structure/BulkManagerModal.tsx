"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, FileDown, FileText, Archive, Users } from "lucide-react";
import toast from "react-hot-toast";
import { ASSIGN_USER_MANAGER } from "@/graphql/mutations/org";
import { GET_ORG_USERS } from "@/graphql/queries/org";
import { LIST_EMPLOYEES } from "@/graphql/queries/employees";
import { parseCsv, rowsToObjects } from "@/components/ui/BulkUpload/csvParser";
import { descendantIds } from "./relationships";
import {
  applyCsvManagers,
  buildAssignRows,
  buildIndexes,
  buildManagerCsv,
  createsCycle,
  resolveManager,
  validateRow,
  type AssignRow,
  type EmployeeLite,
  type OrgUserLite,
} from "./bulkManager";
import { buildFieldGuidePdf, buildStarterKitZip, downloadBlob } from "./bulkManagerArtifacts";
import BulkManagerReview from "./BulkManagerReview";
import BulkManagerResults, { type RowResult } from "./BulkManagerResults";

type Stage = "pick" | "review" | "uploading" | "results";

export default function BulkManagerModal({
  open,
  onClose,
  onFinished,
}: {
  open: boolean;
  onClose: () => void;
  onFinished?: () => void | Promise<void>;
}) {
  const { data: empData, loading: empLoading } = useQuery(LIST_EMPLOYEES, { skip: !open });
  const { data: orgData, loading: orgLoading } = useQuery(GET_ORG_USERS, { skip: !open });
  const [assignManager] = useMutation(ASSIGN_USER_MANAGER);

  const [stage, setStage] = useState<Stage>("pick");
  const [rows, setRows] = useState<AssignRow[]>([]);
  const [results, setResults] = useState<RowResult[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement | null>(null);

  const employees: EmployeeLite[] = useMemo(() => empData?.employees ?? [], [empData]);
  const orgUsers: OrgUserLite[] = useMemo(() => orgData?.orgUsers ?? [], [orgData]);
  const idx = useMemo(() => buildIndexes(employees, orgUsers), [employees, orgUsers]);
  const baseRows = useMemo(() => buildAssignRows(employees, idx), [employees, idx]);
  const loading = empLoading || orgLoading;

  const descendantsOf = useCallback((id: string) => descendantIds(orgUsers, id), [orgUsers]);

  // Reset when the dialog opens; seed rows once the data is in.
  useEffect(() => {
    if (open) {
      setStage("pick");
      setResults([]);
      setProgress({ done: 0, total: 0 });
    }
  }, [open]);
  useEffect(() => {
    if (open) setRows(baseRows);
  }, [open, baseRows]);

  const errors = useMemo(() => {
    const out: Record<number, string> = {};
    rows.forEach((r, i) => {
      const e = validateRow(r, idx, descendantsOf);
      if (e) out[i] = e;
    });
    return out;
  }, [rows, idx, descendantsOf]);
  const errorCount = Object.keys(errors).length;
  const filledCount = rows.filter((r) => r.manager.trim()).length;

  // Resolved manager name shown under each valid entry (the "auto-populate").
  const hints = useMemo(() => {
    const out: Record<number, string> = {};
    rows.forEach((r, i) => {
      if (!r.manager.trim() || errors[i]) return;
      const { managerId } = resolveManager(r.manager, idx);
      if (managerId) out[i] = idx.nameByUserId.get(managerId) ?? "";
    });
    return out;
  }, [rows, errors, idx]);

  function downloadCsv() {
    const blob = new Blob([buildManagerCsv(baseRows)], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, "assign_managers_template.csv");
  }
  async function download(make: () => Blob | Promise<Blob>, filename: string) {
    try {
      downloadBlob(await make(), filename);
    } catch {
      toast.error("Could not generate the file");
    }
  }
  const handleGuide = () => download(buildFieldGuidePdf, "assign_managers_guide.pdf");
  const handleStarterKit = () => download(buildStarterKitZip, "assign_managers_starter.zip");

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
      setRows(applyCsvManagers(baseRows, objs));
      setStage("review");
    };
    reader.readAsText(file);
  }

  const setManagerCell = (i: number, value: string) =>
    setRows((prev) => prev.map((r, idx2) => (idx2 === i ? { ...r, manager: value } : r)));

  async function handleSubmit() {
    if (errorCount > 0) {
      toast.error("Fix the highlighted rows first");
      return;
    }
    if (filledCount === 0) {
      toast.error("Enter a manager for at least one employee");
      return;
    }
    setStage("uploading");
    setProgress({ done: 0, total: filledCount });

    // Live manager map so cycles formed across rows in this batch are caught.
    const working = new Map<string, string | null>(orgUsers.map((u) => [u.id, u.managerId ?? null]));
    const acc: RowResult[] = [];
    let done = 0;

    for (const row of rows) {
      const v = row.manager.trim();
      if (!v) {
        acc.push({ name: row.name, manager: "", status: "skipped" });
        continue;
      }
      const { managerId, error } = resolveManager(v, idx);
      if (error || !managerId) {
        acc.push({ name: row.name, manager: v, status: "failed", error: error ?? "manager not found" });
        done++; setProgress({ done, total: filledCount });
        continue;
      }
      if (managerId === row.userId) {
        acc.push({ name: row.name, manager: v, status: "failed", error: "can't be their own manager" });
        done++; setProgress({ done, total: filledCount });
        continue;
      }
      if (createsCycle(working, row.userId, managerId)) {
        acc.push({ name: row.name, manager: v, status: "failed", error: "would create a reporting loop" });
        done++; setProgress({ done, total: filledCount });
        continue;
      }
      try {
        await assignManager({ variables: { userId: row.userId, managerId } });
        working.set(row.userId, managerId);
        acc.push({ name: row.name, manager: idx.nameByUserId.get(managerId) ?? v, status: "assigned" });
      } catch (e: unknown) {
        acc.push({ name: row.name, manager: v, status: "failed", error: e instanceof Error ? e.message : "failed" });
      }
      done++; setProgress({ done, total: filledCount });
    }

    setResults(acc);
    setStage("results");
    const ok = acc.filter((r) => r.status === "assigned").length;
    toast.success(`Assigned ${ok} manager${ok === 1 ? "" : "s"}`);
    await onFinished?.();
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent size="xl" onClose={onClose} accent="violet">
        <DialogHeader icon={<Users size={18} />}>
          <DialogTitle>Bulk Assign Managers</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Every employee is listed below. Set each person&apos;s reporting manager by their
            email or employee ID. Blank rows are left unchanged.
          </p>
        </DialogHeader>

        <DialogBody className="min-h-[220px]">
          {loading ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Loading employees…</p>
          ) : stage === "pick" ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={downloadCsv}
                  className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/30 transition-colors text-left"
                >
                  <FileDown size={20} className="shrink-0 mt-0.5 text-primary" />
                  <div>
                    <div className="font-medium">Pre-filled CSV</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Every employee listed; just add each manager.
                    </div>
                  </div>
                </button>
                <button
                  onClick={handleGuide}
                  className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/30 transition-colors text-left"
                >
                  <FileText size={20} className="shrink-0 mt-0.5 text-primary" />
                  <div>
                    <div className="font-medium">Field guide (PDF)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Column meanings and rules.</div>
                  </div>
                </button>
                <button
                  onClick={handleStarterKit}
                  className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/30 transition-colors text-left"
                >
                  <Archive size={20} className="shrink-0 mt-0.5 text-primary" />
                  <div>
                    <div className="font-medium">Starter kit (ZIP)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Sample CSV + instructions.txt.</div>
                  </div>
                </button>
              </div>

              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                <Upload size={32} className="mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Upload the filled-in CSV</p>
                <p className="text-xs text-muted-foreground mb-4">
                  We&apos;ll show an editable preview before anything is saved.
                </p>
                <button onClick={() => fileRef.current?.click()} className="btn-primary">
                  Choose file…
                </button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={handleFile} />
                <p className="text-[11px] text-muted-foreground/70 mt-3">
                  Or{" "}
                  <button onClick={() => setStage("review")} className="text-primary hover:underline font-medium">
                    edit here without a CSV
                  </button>
                  .
                </p>
              </div>
            </div>
          ) : stage === "review" ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Fill the Manager column with an email or employee ID. Leave it blank to keep the
                current manager. Invalid entries are highlighted.
              </p>
              <BulkManagerReview rows={rows} errors={errors} hints={hints} onChange={setManagerCell} />
            </div>
          ) : stage === "uploading" ? (
            <div className="py-10 space-y-4">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">
                  Assigning {progress.done} of {progress.total}
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
          ) : (
            <BulkManagerResults results={results} />
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
                  <span>{filledCount} manager(s) to assign</span>
                )}
              </div>
              <button
                className="btn-primary"
                disabled={errorCount > 0 || filledCount === 0}
                onClick={handleSubmit}
              >
                Assign {filledCount}
              </button>
            </>
          )}
          {stage === "uploading" && <button className="btn-ghost" disabled>Assigning…</button>}
          {stage === "results" && <button className="btn-primary" onClick={onClose}>Done</button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
