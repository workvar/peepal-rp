"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { GqlMessAttendanceRow } from "./types";

/**
 * Roster-style meal marking. The whole roster is submitted at once (the
 * backend clears anyone dropped from the list), so the local checkbox state is
 * the source of truth until Save.
 */
export default function MessAttendanceGrid({
  rows,
  loading,
  canWrite,
  onSave,
}: {
  rows: GqlMessAttendanceRow[];
  loading: boolean;
  canWrite: boolean;
  onSave: (studentIds: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(new Set(rows.filter((r) => r.present).map((r) => r.studentId)));
  }, [rows]);

  const toggle = (studentId: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      await onSave([...selected]);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (rows.length === 0) {
    return (
      <div className="card text-center py-12 text-muted-foreground/70">
        No students match this filter.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground/80">
          {selected.size} of {rows.length} marked
        </p>
        {canWrite && (
          <div className="flex gap-2">
            <button className="btn-secondary"
              onClick={() => setSelected(new Set(rows.map((r) => r.studentId)))}>
              Select all
            </button>
            <button className="btn-secondary" onClick={() => setSelected(new Set())}>
              Clear
            </button>
            <button className="btn-primary" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/40">
            <tr>
              <th className="table-th w-12"></th>
              <th className="table-th">Roll No</th>
              <th className="table-th">Student</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => (
              <tr key={r.studentId} className="hover:bg-muted/40">
                <td className="table-td">
                  <input type="checkbox" disabled={!canWrite}
                    checked={selected.has(r.studentId)}
                    onChange={() => toggle(r.studentId)}
                    aria-label={`Mark ${r.studentName}`} />
                </td>
                <td className="table-td font-mono">{r.rollNumber || "—"}</td>
                <td className="table-td font-medium">{r.studentName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
