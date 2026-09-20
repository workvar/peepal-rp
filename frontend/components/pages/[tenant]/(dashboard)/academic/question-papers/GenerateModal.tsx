"use client";

// The rule builder. The generator fills each difficulty bucket to its marks
// target, spreading across the chosen units — so this form is mostly "how many
// marks from where".

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { GenerateForm, GqlExamTypeRef } from "./types";
import { emptyGenerateForm } from "./types";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function GenerateModal({
  isOpen,
  onClose,
  examTypes,
  units,
  onGenerate,
}: {
  isOpen: boolean;
  onClose: () => void;
  examTypes: GqlExamTypeRef[];
  units: string[];
  onGenerate: (form: GenerateForm) => Promise<void>;
}) {
  const [form, setForm] = useState<GenerateForm>(emptyGenerateForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setForm(emptyGenerateForm);
  }, [isOpen]);

  const set = (patch: Partial<GenerateForm>) => setForm((f) => ({ ...f, ...patch }));

  const toggleUnit = (unit: string) =>
    setForm((f) => ({
      ...f,
      units: f.units.includes(unit) ? f.units.filter((u) => u !== unit) : [...f.units, unit],
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onGenerate(form);
    } finally {
      setSaving(false);
    }
  };

  // Warn when the difficulty split doesn't add up — the generator tops up from
  // the wider pool, so this is guidance rather than a blocker.
  const bucketTotal =
    (parseFloat(form.easy_marks) || 0) +
    (parseFloat(form.medium_marks) || 0) +
    (parseFloat(form.hard_marks) || 0);
  const total = parseFloat(form.total_marks) || 0;
  const mismatch = bucketTotal > 0 && Math.abs(bucketTotal - total) > 0.01;

  return (
    <Modal title="Generate Question Paper" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground/80">Title</label>
          <input
            className="input-field"
            placeholder="e.g. Mid Sem - Data Structures"
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">
              Exam <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <SearchableSelect
              value={form.exam_type_id}
              onChange={(v) => {
                // Pre-fill total marks from the exam definition — that's the
                // number the assessment was set up with.
                const picked = examTypes.find((t) => t.id === v);
                set({
                  exam_type_id: v,
                  total_marks: picked ? String(picked.maxMarks) : form.total_marks,
                });
              }}
              options={examTypes.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Not linked"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">Total Marks</label>
            <input
              type="number"
              min="1"
              step="1"
              className="input-field"
              value={form.total_marks}
              onChange={(e) => set({ total_marks: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground/80">
            Duration (minutes)
          </label>
          <input
            type="number"
            min="0"
            step="5"
            className="input-field"
            value={form.duration_minutes}
            onChange={(e) => set({ duration_minutes: e.target.value })}
          />
        </div>

        <fieldset className="rounded-lg border border-border/60 p-3">
          <legend className="px-1 text-sm font-medium text-foreground/80">
            Marks per difficulty
          </legend>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["easy_marks", "Easy"],
                ["medium_marks", "Medium"],
                ["hard_marks", "Hard"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="input-field"
                  placeholder="0"
                  value={form[key]}
                  onChange={(e) => set({ [key]: e.target.value } as Partial<GenerateForm>)}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">
            Leave all three blank to let the generator fill freely to the total.
          </p>
          {mismatch && (
            <p className="mt-1 text-xs text-amber-600">
              The split adds up to {bucketTotal}, not {total}. The generator will top up the
              difference from the wider pool.
            </p>
          )}
        </fieldset>

        {units.length > 0 && (
          <fieldset className="rounded-lg border border-border/60 p-3">
            <legend className="px-1 text-sm font-medium text-foreground/80">Units</legend>
            <div className="flex flex-wrap gap-2">
              {units.map((u) => (
                <label
                  key={u}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                    form.units.includes(u)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.units.includes(u)}
                    onChange={() => toggleUnit(u)}
                  />
                  {u}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground/70">
              Select none to cover the whole syllabus. Questions are spread evenly across whichever
              units are in play.
            </p>
          </fieldset>
        )}

        <fieldset className="rounded-lg border border-border/60 p-3">
          <legend className="px-1 text-sm font-medium text-foreground/80">
            Question count by type <span className="text-muted-foreground/60">(optional caps)</span>
          </legend>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                ["mcq_count", "MCQ"],
                ["short_count", "Short"],
                ["long_count", "Long"],
                ["numeric_count", "Numeric"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="input-field"
                  placeholder="—"
                  value={form[key]}
                  onChange={(e) => set({ [key]: e.target.value } as Partial<GenerateForm>)}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">
            Setting any cap restricts the paper to those types only.
          </p>
        </fieldset>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground/80">Instructions</label>
          <textarea
            className="input-field"
            rows={2}
            placeholder="Printed above the questions. One instruction per line."
            value={form.instructions}
            onChange={(e) => set({ instructions: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground/80">
            Seed <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <input
            type="number"
            className="input-field"
            placeholder="Blank for a fresh random set"
            value={form.seed}
            onChange={(e) => set({ seed: e.target.value })}
          />
          <p className="mt-1 text-xs text-muted-foreground/70">
            The same seed always produces the same paper — handy for regenerating one exactly, or
            for making set B differ from set A.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Generating…" : "Generate"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
