"use client";

import { Plus, Trash2, X } from "lucide-react";
import { QuestionKind } from "@/types/pages/learning/page";
import { KIND_LABEL, KIND_ICON, type QuizBuilderState } from "./useQuizBuilder";

// Question editor modal (rendered as a fixed-position overlay, NOT a nested
// <form>, so submit stays local to the quiz builder).
export default function QuestionEditor({ quiz }: { quiz: QuizBuilderState }) {
  const {
    editingId, form, setForm, saving,
    resetForm, changeKind, addOption, removeOption, setOption,
    toggleCorrect, handleSave,
  } = quiz;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => {
        // click outside card cancels
        if (e.target === e.currentTarget) resetForm();
      }}
    >
      <div
        className="bg-card rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        // stopPropagation so clicks inside don't bubble to the overlay
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/20">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {editingId ? "Edit Question" : "New Question"}
            </h3>
            <p className="text-xs text-muted-foreground/80 mt-0.5">
              Auto-graded. Learners see these exactly as you enter them.
            </p>
          </div>
          <button
            type="button"
            onClick={() => resetForm()}
            className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Kind picker (big, tappable cards) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Question type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["mcq", "multi", "true_false"] as QuestionKind[]).map((k) => {
                const Icon = KIND_ICON[k];
                const active = form.kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => changeKind(k)}
                    className={[
                      "flex items-start gap-2 rounded-md border p-3 text-left transition",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                        : "border-border hover:bg-muted/40",
                    ].join(" ")}
                  >
                    <Icon
                      size={18}
                      className={active ? "text-primary" : "text-muted-foreground/70"}
                    />
                    <div>
                      <div className="text-sm font-medium">{KIND_LABEL[k]}</div>
                      <div className="text-xs text-muted-foreground/80">
                        {k === "mcq"
                          ? "One correct answer"
                          : k === "multi"
                            ? "Two or more correct answers"
                            : "True or false"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Prompt
            </label>
            <textarea
              className="input-field w-full text-sm"
              rows={3}
              placeholder="e.g. Which of the following are valid HTTP methods?"
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
            />
          </div>

          {/* Options */}
          {form.kind !== "true_false" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Options{" "}
                  <span className="text-muted-foreground/70 normal-case">
                    (tick the correct{" "}
                    {form.kind === "multi" ? "answers" : "answer"})
                  </span>
                </label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                  onClick={addOption}
                >
                  <Plus size={12} /> Add option
                </button>
              </div>
              <ul className="space-y-2">
                {form.options.map((opt, i) => {
                  const isCorrect = form.correctAnswers.includes(String(i));
                  return (
                    <li
                      key={i}
                      className={[
                        "flex items-center gap-3 rounded-md border p-2 transition",
                        isCorrect
                          ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-900/10"
                          : "border-border/60 bg-background",
                      ].join(" ")}
                    >
                      <input
                        type={form.kind === "multi" ? "checkbox" : "radio"}
                        name="correct"
                        checked={isCorrect}
                        onChange={() => toggleCorrect(String(i))}
                        className="h-4 w-4 accent-emerald-600 shrink-0"
                      />
                      <input
                        className="input-field text-sm flex-1"
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => setOption(i, e.target.value)}
                      />
                      {form.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="text-red-500 hover:text-red-700 shrink-0"
                          aria-label={`Remove option ${i + 1}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground/70">
                The green highlight marks the correct answer
                {form.kind === "multi" ? "s" : ""}.
              </p>
            </div>
          )}

          {form.kind === "true_false" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Correct answer
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["true", "false"].map((v) => {
                  const active = form.correctAnswers[0] === v;
                  return (
                    <button
                      type="button"
                      key={v}
                      onClick={() => toggleCorrect(v)}
                      className={[
                        "rounded-md border p-3 text-sm font-medium capitalize transition",
                        active
                          ? "border-emerald-400 bg-emerald-50/60 text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-300"
                          : "border-border hover:bg-muted/40 text-foreground/80",
                      ].join(" ")}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Points */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Points
            </label>
            <input
              type="number"
              min={0}
              step="0.5"
              className="input-field w-32 text-sm"
              value={form.points}
              onChange={(e) =>
                setForm({ ...form, points: parseFloat(e.target.value || "0") })
              }
            />
            <p className="mt-1 text-xs text-muted-foreground/70">
              All-or-nothing: full points if selection matches exactly, 0 otherwise.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-muted/10">
          <button
            type="button"
            onClick={() => resetForm()}
            className="btn-secondary text-sm"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary text-sm inline-flex items-center gap-1.5"
            disabled={saving}
          >
            {saving
              ? "Saving…"
              : editingId
                ? "Save changes"
                : "Add question"}
          </button>
        </div>
      </div>
    </div>
  );
}
