"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import type { GqlCurriculumSubject, GqlPickSubject } from "./types";

export default function SemesterCard({
  semesterNumber,
  assigned,
  allSubjects,
  canEdit,
  onSave,
  saving,
}: {
  semesterNumber: number;
  assigned: GqlCurriculumSubject[];
  allSubjects: GqlPickSubject[];
  canEdit: boolean;
  onSave: (subjectIds: string[]) => Promise<void>;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const startEdit = () => {
    setSelected(new Set(assigned.map((a) => a.subject.id)));
    setSearch("");
    setEditing(true);
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const save = async () => {
    await onSave([...selected]);
    setEditing(false);
  };

  const filtered = search
    ? allSubjects.filter((s) =>
        [s.name, s.code].some((v) => v.toLowerCase().includes(search.toLowerCase())),
      )
    : allSubjects;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-foreground">Semester {semesterNumber}</h4>
        {canEdit && !editing && (
          <button onClick={startEdit} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Pencil size={13} /> Manage
          </button>
        )}
      </div>

      {!editing ? (
        assigned.length === 0 ? (
          <p className="text-sm text-muted-foreground/70">No subjects assigned yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {assigned.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">
                  {a.subject.name}{" "}
                  <span className="text-muted-foreground font-mono text-xs">({a.subject.code})</span>
                </span>
                <span className="text-xs text-muted-foreground/70 shrink-0">
                  {a.subject.courseOutcomes?.length ?? 0} COs · {a.subject.units?.length ?? 0} units
                </span>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-2">
          <input
            className="input-field"
            placeholder="Search subjects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-56 overflow-auto rounded-lg border border-border divide-y divide-border/60">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground/70 p-3">No subjects in this department.</p>
            )}
            {filtered.map((s) => (
              <label key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                <span className="flex-1">
                  {s.name} <span className="text-muted-foreground font-mono text-xs">({s.code})</span>
                </span>
                {s.semesterNumber ? (
                  <span className="text-[11px] text-muted-foreground/60">sem {s.semesterNumber}</span>
                ) : null}
              </label>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-1 text-sm">
              <Check size={14} /> {saving ? "Saving…" : `Save (${selected.size})`}
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary flex items-center gap-1 text-sm">
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
