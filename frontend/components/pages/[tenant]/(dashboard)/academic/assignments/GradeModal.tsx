"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { GqlSubmission } from "./types";

export default function GradeModal({
  submission,
  onClose,
  onGrade,
}: {
  submission: GqlSubmission | null;
  onClose: () => void;
  onGrade: (submission: GqlSubmission, marks: number, feedback: string) => Promise<void>;
}) {
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!submission) return;
    setMarks(submission.marksAwarded != null ? String(submission.marksAwarded) : "");
    setFeedback(submission.feedback ?? "");
  }, [submission]);

  if (!submission) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onGrade(submission, Number(marks), feedback);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Grade — ${submission.studentName}`} isOpen onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground/70 mb-1">
            Submitted {submission.submittedAt || "—"}
          </p>
          <p className="whitespace-pre-wrap text-sm">{submission.text || "No typed answer."}</p>
          {submission.attachmentUrl && (
            <a href={submission.attachmentUrl} target="_blank" rel="noreferrer"
              className="mt-2 inline-block text-sm text-blue-600 hover:underline">
              Open attachment
            </a>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Marks (out of {submission.maxMarks})
          </label>
          <input type="number" min={0} max={submission.maxMarks || undefined} step="0.5"
            className="input-field" required value={marks}
            onChange={(e) => setMarks(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Feedback</label>
          <textarea className="input-field" rows={3} value={feedback}
            onChange={(e) => setFeedback(e.target.value)} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : "Save Grade"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
