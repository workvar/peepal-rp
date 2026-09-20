"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { AssignmentForm, GqlAssignment, PickerCourse } from "./types";
import { emptyAssignmentForm } from "./types";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function AssignmentModal({
  isOpen,
  editing,
  courses,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  editing: GqlAssignment | null;
  courses: PickerCourse[];
  onClose: () => void;
  onSave: (editing: GqlAssignment | null, form: AssignmentForm) => Promise<void>;
}) {
  const [form, setForm] = useState<AssignmentForm>(emptyAssignmentForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      editing
        ? {
            title: editing.title,
            description: editing.description ?? "",
            course_id: editing.courseId ?? "",
            semester: editing.semester ? String(editing.semester) : "",
            section: editing.section ?? "",
            subject_id: editing.subjectId ?? "",
            max_marks: String(editing.maxMarks ?? 0),
            due_date: editing.dueDate ?? "",
            attachment_url: editing.attachmentUrl ?? "",
          }
        : emptyAssignmentForm,
    );
  }, [isOpen, editing]);

  const set = (patch: Partial<AssignmentForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(editing, form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? "Edit Assignment" : "New Assignment"} isOpen={isOpen} onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Title</label>
          <input className="input-field" required value={form.title}
            placeholder="Unit 2 problem set"
            onChange={(e) => set({ title: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Instructions</label>
          <textarea className="input-field" rows={3} value={form.description}
            onChange={(e) => set({ description: e.target.value })} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Course</label>
            <SearchableSelect
              value={form.course_id}
              onChange={(v) => set({ course_id: v })}
              options={courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
              placeholder="Select…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Semester</label>
            <input type="number" min={1} className="input-field" value={form.semester}
              onChange={(e) => set({ semester: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Section</label>
            <input className="input-field" placeholder="All sections" value={form.section}
              onChange={(e) => set({ section: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Max Marks</label>
            <input type="number" min={0} step="0.5" className="input-field" value={form.max_marks}
              onChange={(e) => set({ max_marks: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Due Date</label>
            <input type="date" className="input-field" value={form.due_date}
              onChange={(e) => set({ due_date: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Handout URL (optional)</label>
          <input className="input-field" placeholder="https://…" value={form.attachment_url}
            onChange={(e) => set({ attachment_url: e.target.value })} />
        </div>

        <p className="text-xs text-muted-foreground/70">
          New assignments start as a draft. Students only see them once you publish.
        </p>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : editing ? "Update" : "Create Draft"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
