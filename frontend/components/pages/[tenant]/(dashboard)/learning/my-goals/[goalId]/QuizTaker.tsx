"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@apollo/client";
import { SUBMIT_QUIZ } from "@/graphql/mutations/learning";
import { MY_LEARNING_GOALS } from "@/graphql/queries/learning";
import { LearningQuestion, QuizSubmissionResult } from "@/types/pages/learning/page";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

interface QuizTakerProps {
  assignmentId: string;
  questions: LearningQuestion[];
  egpId: string;
  passScore: number;
  alreadyPassed: boolean;
  onSubmitted?: () => void | Promise<void>;
}

/**
 * Renders a quiz for an employee: one question at a time listed vertically
 * with the appropriate input (radio for mcq / true_false, checkbox for multi)
 * and a submit button that POSTs all answers at once and shows a result banner.
 */
export default function QuizTaker({
  assignmentId,
  questions,
  egpId,
  passScore,
  alreadyPassed,
  onSubmitted,
}: QuizTakerProps) {
  const sorted = useMemo(
    () => [...(questions ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [questions],
  );

  // answers state: qid -> string[] of selected option indices (as strings)
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<QuizSubmissionResult | null>(null);

  const [submit, { loading }] = useMutation(SUBMIT_QUIZ);

  const toggleMulti = (qid: string, val: string) => {
    setAnswers((prev) => {
      const cur = new Set(prev[qid] ?? []);
      if (cur.has(val)) cur.delete(val);
      else cur.add(val);
      return { ...prev, [qid]: Array.from(cur) };
    });
  };

  const setSingle = (qid: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: [val] }));
  };

  const handleReset = () => {
    setAnswers({});
    setResult(null);
  };

  const handleSubmit = async () => {
    // require at least one answer per question
    const missing = sorted.filter((q) => !(answers[q.id]?.length > 0));
    if (missing.length > 0) {
      toast.error(`Answer all ${sorted.length} questions before submitting`);
      return;
    }
    try {
      const res = await submit({
        variables: {
          employeeGoalProgressId: egpId,
          assignmentId,
          answers: sorted.map((q) => ({
            questionId: q.id,
            selected: answers[q.id] ?? [],
          })),
        },
        refetchQueries: [{ query: MY_LEARNING_GOALS }],
      });
      const r = res.data?.submitQuiz as QuizSubmissionResult | undefined;
      if (r) {
        setResult(r);
        if (r.passed) toast.success("Quiz passed!");
        else toast.error("Quiz not passed — try again");
      }
      if (onSubmitted) await onSubmitted();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to submit quiz"));
    }
  };

  if (!sorted.length) {
    return (
      <div className="bg-muted/30 rounded-md p-4 text-sm text-muted-foreground">
        No questions have been added to this quiz yet.
      </div>
    );
  }

  // Result banner
  if (result) {
    return (
      <div className="space-y-4">
        <div
          className={[
            "rounded-md p-4 border",
            result.passed
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800",
          ].join(" ")}
        >
          <div className="flex items-center gap-2 font-semibold">
            {result.passed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {result.passed ? "You passed!" : "You did not pass"}
          </div>
          <div className="mt-1 text-sm">
            Score: {result.score} / {result.maxScore} ({result.percentage}%) —
            pass threshold {passScore}%
          </div>
        </div>
        {!result.passed && (
          <div className="flex justify-end">
            <button
              className="btn-secondary inline-flex items-center gap-2"
              onClick={handleReset}
            >
              <RotateCcw size={14} /> Retake quiz
            </button>
          </div>
        )}
      </div>
    );
  }

  // If user already passed previously (and returned here), show summary only
  if (alreadyPassed) {
    return (
      <div className="rounded-md p-4 border bg-emerald-50 border-emerald-200 text-emerald-800">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle2 size={18} /> Already passed
        </div>
        <div className="mt-1 text-sm">
          You have already passed this quiz. No further action needed.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-sm text-muted-foreground/80">
        {sorted.length} question{sorted.length === 1 ? "" : "s"} · pass threshold {passScore}%
      </div>

      {sorted.map((q, qi) => {
        const selected = answers[q.id] ?? [];
        return (
          <div key={q.id} className="border border-border/60 rounded-md p-4 bg-background">
            <div className="flex items-start gap-2 mb-3">
              <span className="text-xs font-semibold text-muted-foreground mt-1">
                Q{qi + 1}.
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground whitespace-pre-line">
                  {q.prompt}
                </p>
                <div className="text-xs text-muted-foreground/70 mt-1">
                  {q.kind === "multi"
                    ? "Select all that apply"
                    : q.kind === "true_false"
                      ? "True or False"
                      : "Select one"}{" "}
                  · {q.points} pt{q.points === 1 ? "" : "s"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {q.kind === "true_false" ? (
                <>
                  {["true", "false"].map((val) => (
                    <label
                      key={val}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={val}
                        checked={selected[0] === val}
                        onChange={() => setSingle(q.id, val)}
                      />
                      <span className="capitalize">{val}</span>
                    </label>
                  ))}
                </>
              ) : (
                q.options.map((opt, oi) => {
                  const val = String(oi);
                  const isMulti = q.kind === "multi";
                  const checked = selected.includes(val);
                  return (
                    <label
                      key={oi}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type={isMulti ? "checkbox" : "radio"}
                        name={`q-${q.id}`}
                        value={val}
                        checked={checked}
                        onChange={() =>
                          isMulti ? toggleMulti(q.id, val) : setSingle(q.id, val)
                        }
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        );
      })}

      <div className="flex justify-end gap-2">
        <button
          className="btn-secondary"
          onClick={handleReset}
          disabled={loading}
          type="button"
        >
          Clear answers
        </button>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={loading}
          type="button"
        >
          {loading ? "Submitting…" : "Submit Quiz"}
        </button>
      </div>
    </div>
  );
}
