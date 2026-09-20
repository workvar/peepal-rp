"use client";

// Bulk issue dialog. Issuing is idempotent per (student, schedule), so running
// it again after adding students only picks up the new ones.

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { GqlCourseRef, GqlExamScheduleRef, IssueForm } from "./types";
import { emptyIssueForm } from "./types";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function IssueModal({
  isOpen,
  onClose,
  courses,
  schedule,
  onIssue,
}: {
  isOpen: boolean;
  onClose: () => void;
  courses: GqlCourseRef[];
  schedule: GqlExamScheduleRef | null;
  onIssue: (form: IssueForm) => Promise<void>;
}) {
  const [form, setForm] = useState<IssueForm>(emptyIssueForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setForm(emptyIssueForm);
  }, [isOpen]);

  const set = (patch: Partial<IssueForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onIssue(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Issue Hall Tickets" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {schedule && (
          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <p className="font-medium text-foreground">{schedule.name}</p>
            <p className="text-muted-foreground">
              {schedule.examType}
              {schedule.semesterNumber ? ` · Semester ${schedule.semesterNumber}` : ""}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">
              Course <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <SearchableSelect
              value={form.course_id}
              onChange={(v) => set({ course_id: v })}
              options={courses.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
              placeholder="All courses in this semester"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">
              Semester <span className="text-muted-foreground/60">(override)</span>
            </label>
            <input
              type="number"
              min="1"
              className="input-field"
              placeholder={
                schedule?.semesterNumber ? String(schedule.semesterNumber) : "From schedule"
              }
              value={form.semester_number}
              onChange={(e) => set({ semester_number: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">Exam Centre</label>
            <input
              className="input-field"
              placeholder="e.g. Main Campus, Block C"
              value={form.exam_center}
              onChange={(e) => set({ exam_center: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">
              Seat Prefix <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              className="input-field"
              placeholder="e.g. A → A-001"
              value={form.seat_prefix}
              onChange={(e) => set({ seat_prefix: e.target.value })}
            />
          </div>
        </div>

        <fieldset className="rounded-lg border border-border/60 p-3">
          <legend className="px-1 text-sm font-medium text-foreground/80">
            Eligibility checks
          </legend>

          <label className="flex items-center gap-2 text-sm text-foreground/80">
            <input
              type="checkbox"
              checked={form.check_fee_dues}
              onChange={(e) => set({ check_fee_dues: e.target.checked })}
            />
            Hold students with outstanding fee dues
          </label>

          <div className="mt-3">
            <label className="mb-1 block text-sm text-foreground/80">
              Minimum attendance % <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              className="input-field"
              placeholder="Leave blank to skip this check"
              value={form.min_attendance}
              onChange={(e) => set({ min_attendance: e.target.value })}
            />
          </div>

          <p className="mt-2 text-xs text-muted-foreground/70">
            Students who fail a check still get a ticket, marked <strong>held</strong> with the
            reason — so nobody silently disappears from the list. You can release a hold later.
          </p>
        </fieldset>

        <p className="text-xs text-muted-foreground/70">
          Safe to run more than once: students who already have a ticket for this exam are skipped.
        </p>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Issuing…" : "Issue Tickets"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
