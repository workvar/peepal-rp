"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { LIST_MY_ASSIGNMENTS } from "@/graphql/queries/campus";
import { SUBMIT_ASSIGNMENT } from "@/graphql/mutations/campus";
import SubmitModal from "./SubmitModal";
import type { MyAssignment } from "./types";
import { statusLabel } from "./types";

export default function MyAssignmentsPage() {
  const { data, loading } = useQuery(LIST_MY_ASSIGNMENTS, { variables: { status: null } });
  const [submitMut] = useMutation(SUBMIT_ASSIGNMENT, {
    refetchQueries: [{ query: LIST_MY_ASSIGNMENTS, variables: { status: null } }],
  });
  const [active, setActive] = useState<MyAssignment | null>(null);

  const entries: MyAssignment[] = data?.myAssignments ?? [];

  const submit = async (entry: MyAssignment, text: string, attachmentUrl: string) => {
    try {
      await submitMut({
        variables: {
          assignmentId: entry.assignment.id,
          input: { text: text || null, attachmentUrl: attachmentUrl || null },
        },
      });
      toast.success("Submitted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
      throw err;
    }
  };

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;

  return (
    <div>
      <Header title="My Assignments" subtitle="Coursework set for your class" />

      {entries.length === 0 ? (
        <div className="card text-center py-12 text-muted-foreground/70">
          Nothing has been set for your class yet.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {entries.map((entry) => {
            const { assignment, submission } = entry;
            const status = statusLabel(entry);
            return (
              <div key={assignment.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{assignment.title}</h3>
                    <p className="text-xs text-muted-foreground/70">
                      {assignment.subjectName || "General"} · {assignment.teacherName || "—"}
                    </p>
                  </div>
                  <Badge variant={status.tone}>{status.text}</Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground/80">
                  <span>Due <span className="font-mono">{assignment.dueDate || "—"}</span></span>
                  <span>Out of {assignment.maxMarks}</span>
                </div>

                {submission?.status === "graded" && (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
                    <p className="font-medium">
                      Scored {submission.marksAwarded} / {assignment.maxMarks}
                    </p>
                    {submission.feedback && (
                      <p className="mt-1 text-muted-foreground/80">{submission.feedback}</p>
                    )}
                  </div>
                )}

                {assignment.attachmentUrl && (
                  <a href={assignment.attachmentUrl} target="_blank" rel="noreferrer"
                    className="inline-block text-sm text-blue-600 hover:underline">
                    Open handout
                  </a>
                )}

                <div>
                  {entry.canSubmit ? (
                    <button className="btn-primary" onClick={() => setActive(entry)}>
                      {submission ? "Resubmit" : "Submit"}
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground/70">
                      This assignment is closed for submissions.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SubmitModal entry={active} onClose={() => setActive(null)} onSubmit={submit} />
    </div>
  );
}
