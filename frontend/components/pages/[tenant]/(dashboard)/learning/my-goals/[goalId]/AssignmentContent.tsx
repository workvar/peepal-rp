"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { LearningItem, ItemProgress } from "@/types/pages/learning/page";
import QuizTaker from "./QuizTaker";

// Renders an assignment item: completion-type gets a Mark Complete button,
// score-type gets the interactive quiz.
export default function AssignmentContent({
  item,
  progress,
  egpId,
  onSubmitCompletion,
  onQuizSubmitted,
}: {
  item: LearningItem;
  progress?: ItemProgress;
  egpId: string;
  onSubmitCompletion: () => void;
  onQuizSubmitted: () => Promise<void>;
}) {
  return (
    <div className="mt-4">
      <div className="bg-muted/30 rounded-md p-4 text-sm">
        <div className="font-medium">
          {item.assessmentType === "score"
            ? `Quiz — pass threshold ${item.passScore ?? 0}%`
            : "Completion assignment"}
        </div>
        <div className="text-muted-foreground/80 mt-1">
          {item.assessmentType === "score"
            ? "Answer all questions and submit — the quiz is graded automatically."
            : "Mark as complete once you have finished the task."}
        </div>
      </div>

      {/* Prior status summary (shown above quiz so users can see their streak state) */}
      <div className="mt-4">
        {progress?.status === "passed" && (
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 size={16} /> Passed
            {progress.score !== null &&
              progress.score !== undefined && (
                <span className="text-muted-foreground">
                  · score {progress.score}
                </span>
              )}
          </div>
        )}
        {progress?.status === "failed" && (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle size={16} /> Previous attempt did not pass
            {progress.score !== null &&
              progress.score !== undefined && (
                <span className="text-muted-foreground">
                  · score {progress.score}
                </span>
              )}
          </div>
        )}
      </div>

      {/* Completion-type: simple Mark Complete button */}
      {item.assessmentType === "completion" &&
        progress?.status !== "passed" && (
          <div className="mt-4 flex justify-end">
            <button className="btn-primary" onClick={onSubmitCompletion}>
              Mark Complete
            </button>
          </div>
        )}

      {/* Score-type: interactive quiz */}
      {item.assessmentType === "score" && (
        <div className="mt-5">
          <QuizTaker
            assignmentId={item.id}
            questions={item.questions ?? []}
            egpId={egpId}
            passScore={item.passScore ?? 0}
            alreadyPassed={progress?.status === "passed"}
            onSubmitted={onQuizSubmitted}
          />
        </div>
      )}
    </div>
  );
}
