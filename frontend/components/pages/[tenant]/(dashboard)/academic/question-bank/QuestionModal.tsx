"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { GqlQuestion, QuestionForm } from "./types";
import { emptyQuestionForm, DIFFICULTIES, QUESTION_TYPES } from "./types";

export default function QuestionModal({
  isOpen,
  onClose,
  editing,
  units,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: GqlQuestion | null;
  units: string[];
  onSave: (form: QuestionForm) => Promise<void>;
}) {
  const [form, setForm] = useState<QuestionForm>(emptyQuestionForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      editing
        ? {
            unit: editing.unit ?? "",
            question_text: editing.questionText,
            question_type: editing.questionType,
            difficulty: editing.difficulty,
            marks: String(editing.marks ?? 1),
            options: editing.options.join("\n"),
            answer: editing.answer ?? "",
            course_outcome: editing.courseOutcome ?? "",
            active: editing.active,
          }
        : emptyQuestionForm,
    );
  }, [isOpen, editing]);

  const set = (patch: Partial<QuestionForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const isMcq = form.question_type === "mcq";

  return (
    <Modal title={editing ? "Edit Question" : "Add Question"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground/80">Question</label>
          <textarea
            className="input-field"
            rows={3}
            placeholder="Type the question exactly as it should be printed"
            value={form.question_text}
            onChange={(e) => set({ question_text: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">Type</label>
            <select
              className="input-field"
              value={form.question_type}
              onChange={(e) => set({ question_type: e.target.value })}
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">Difficulty</label>
            <select
              className="input-field"
              value={form.difficulty}
              onChange={(e) => set({ difficulty: e.target.value })}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">Marks</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              className="input-field"
              value={form.marks}
              onChange={(e) => set({ marks: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">
              Unit <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              className="input-field"
              list="question-units"
              placeholder="e.g. Unit 2 - Linked Lists"
              value={form.unit}
              onChange={(e) => set({ unit: e.target.value })}
            />
            <datalist id="question-units">
              {units.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>
        </div>

        {isMcq && (
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">Options</label>
            <textarea
              className="input-field"
              rows={4}
              placeholder={"One option per line\nStack\nQueue\nTree"}
              value={form.options}
              onChange={(e) => set({ options: e.target.value })}
            />
            <p className="mt-1 text-xs text-muted-foreground/70">
              One option per line. They print as a) b) c) in that order.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">
              Answer <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              className="input-field"
              placeholder="Model answer or correct option"
              value={form.answer}
              onChange={(e) => set({ answer: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">
              Course Outcome <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              className="input-field"
              placeholder="e.g. CO2"
              value={form.course_outcome}
              onChange={(e) => set({ course_outcome: e.target.value })}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground/70">
          Answers are stored for your reference and never appear on a generated paper.
        </p>

        <label className="flex items-center gap-2 text-sm text-foreground/80">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set({ active: e.target.checked })}
          />
          Active (available to the paper generator)
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
