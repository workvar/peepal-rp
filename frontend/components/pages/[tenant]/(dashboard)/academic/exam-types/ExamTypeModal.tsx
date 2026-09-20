"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { GqlExamType, GqlDeptRef, ExamTypeForm } from "./types";
import { emptyExamTypeForm } from "./types";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function ExamTypeModal({
  isOpen,
  onClose,
  editing,
  departments,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: GqlExamType | null;
  departments: GqlDeptRef[];
  onSave: (form: ExamTypeForm) => Promise<void>;
}) {
  const [form, setForm] = useState<ExamTypeForm>(emptyExamTypeForm);
  const [saving, setSaving] = useState(false);

  // Seed the form whenever the dialog opens (for add) or the target changes.
  useEffect(() => {
    if (!isOpen) return;
    setForm(
      editing
        ? {
            name: editing.name,
            department_id: editing.departmentId ?? "",
            max_marks: String(editing.maxMarks ?? 100),
            weightage: editing.weightage != null ? String(editing.weightage) : "",
            active: editing.active,
          }
        : emptyExamTypeForm,
    );
  }, [isOpen, editing]);

  const set = (patch: Partial<ExamTypeForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? "Edit Exam" : "Add Exam"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Exam Name</label>
          <input
            className="input-field"
            placeholder="e.g. Mid Semester, Internal 1, Assignment"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Department</label>
          <SearchableSelect
            value={form.department_id}
            onChange={(v) => set({ department_id: v })}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            placeholder="All departments (org-wide)"
          />
          <p className="text-xs text-muted-foreground/70 mt-1">
            Leave as “All departments” to offer this exam everywhere (e.g. a shared “Assignment”).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Max Marks</label>
            <input
              type="number"
              min="1"
              step="0.5"
              className="input-field"
              value={form.max_marks}
              onChange={(e) => set({ max_marks: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Weightage % <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              className="input-field"
              placeholder="e.g. 30"
              value={form.weightage}
              onChange={(e) => set({ weightage: e.target.value })}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground/80">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set({ active: e.target.checked })}
          />
          Active (shown in the marks dropdown)
        </label>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : editing ? "Update" : "Save"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
