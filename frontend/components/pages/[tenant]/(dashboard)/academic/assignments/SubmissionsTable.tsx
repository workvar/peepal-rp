"use client";

import { useQuery } from "@apollo/client";
import { LIST_ASSIGNMENT_SUBMISSIONS } from "@/graphql/queries/campus";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import Can from "@/components/access/Can";
import type { GqlAssignment, GqlSubmission } from "./types";

/**
 * Submissions for one assignment. Rendered inline under the selected row so
 * grading never leaves the list context.
 */
export default function SubmissionsTable({
  assignment,
  onGrade,
}: {
  assignment: GqlAssignment;
  onGrade: (s: GqlSubmission) => void;
}) {
  const { data, loading } = useQuery(LIST_ASSIGNMENT_SUBMISSIONS, {
    variables: { assignmentId: assignment.id },
  });
  const submissions: GqlSubmission[] = data?.assignmentSubmissions ?? [];

  if (loading) return <LoadingSpinner />;
  if (submissions.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground/70">
        No submissions yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="table-th">Roll No</th>
            <th className="table-th">Student</th>
            <th className="table-th">Submitted</th>
            <th className="table-th">Status</th>
            <th className="table-th">Marks</th>
            <th className="table-th">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {submissions.map((s) => (
            <tr key={s.id} className="hover:bg-muted/40">
              <td className="table-td font-mono">{s.rollNumber || "—"}</td>
              <td className="table-td font-medium">{s.studentName}</td>
              <td className="table-td font-mono">{s.submittedAt || "—"}</td>
              <td className="table-td">
                <Badge variant={s.status === "graded" ? "green" : "blue"}>
                  {s.status === "graded" ? "Graded" : "Submitted"}
                </Badge>
              </td>
              <td className="table-td">
                {s.marksAwarded != null ? `${s.marksAwarded} / ${s.maxMarks}` : "—"}
              </td>
              <td className="table-td">
                <Can module="assignments" action="edit">
                  <button className="text-sm text-blue-600 hover:underline" onClick={() => onGrade(s)}>
                    {s.status === "graded" ? "Edit grade" : "Grade"}
                  </button>
                </Can>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
