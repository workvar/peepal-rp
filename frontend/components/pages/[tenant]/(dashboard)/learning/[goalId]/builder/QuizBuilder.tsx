"use client";

import { Plus, Pencil, Trash2, Check } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { useQuizBuilder, KIND_LABEL, KIND_ICON } from "./useQuizBuilder";
import QuestionEditor from "./QuestionEditor";

// QuizBuilder renders and edits the list of questions for a single assignment.
//
// IMPORTANT: this component is rendered INSIDE the Assignment modal, which
// already has its own <form>. Nesting <form> tags is invalid HTML and causes
// the outer form's submit to fire on any inner submit — which in turn reloads
// the page. So the question editor is a plain <div> and submission is wired
// through an onClick handler rather than form-submit.

interface Props {
  assignmentId: string;
  goalId: string; // used to refresh the parent goal after writes
}

export default function QuizBuilder({ assignmentId, goalId }: Props) {
  const quiz = useQuizBuilder(assignmentId, goalId);
  const { questions, loading, isEditorOpen, startAdd, startEdit, handleDelete } = quiz;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground/80">
          Quiz questions ({questions.length})
        </h4>
        <button
          type="button"
          className="btn-secondary text-xs inline-flex items-center gap-1"
          onClick={startAdd}
        >
          <Plus size={13} /> Add question
        </button>
      </div>

      {loading && questions.length === 0 ? (
        <LoadingSpinner />
      ) : questions.length === 0 ? (
        <div className="text-center text-xs italic text-muted-foreground/70 py-6 border border-dashed border-border/60 rounded-md">
          No questions yet. Click <strong>Add question</strong> to create the first one.
        </div>
      ) : (
        <ul className="space-y-2">
          {questions.map((q, idx) => {
            const Icon = KIND_ICON[q.kind];
            return (
              <li
                key={q.id}
                className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs text-muted-foreground/70">Q{idx + 1}</span>
                      <Badge label={KIND_LABEL[q.kind]} variant="blue" />
                      <span className="text-xs text-muted-foreground/70">
                        {q.points} pt{q.points === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="font-medium break-words">{q.prompt}</div>
                    {q.kind !== "true_false" && q.options.length > 0 && (
                      <ul className="mt-1 text-xs text-muted-foreground/80 space-y-0.5">
                        {q.options.map((opt, i) => (
                          <li key={i} className="flex items-center gap-1">
                            {q.correctAnswers.includes(String(i)) ? (
                              <Check size={12} className="text-green-600" />
                            ) : (
                              <span className="w-3" />
                            )}
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.kind === "true_false" && (
                      <div className="mt-1 text-xs text-muted-foreground/80">
                        Correct:{" "}
                        <span className="font-medium capitalize">
                          {q.correctAnswers[0] ?? "—"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Icon size={14} className="text-muted-foreground/50" />
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => startEdit(q)}
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(q)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isEditorOpen && <QuestionEditor quiz={quiz} />}
    </div>
  );
}
