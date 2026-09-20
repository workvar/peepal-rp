"use client";

import { Fragment } from "react";
import Can from "@/components/access/Can";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import SubmissionsTable from "./SubmissionsTable";
import type { GqlAssignment, GqlSubmission } from "./types";
import { STATUS_LABELS, STATUS_VARIANTS, isOverdue } from "./types";

export default function AssignmentsTable({
  assignments,
  expandedId,
  onToggle,
  onEdit,
  onPublish,
  onClose,
  onDelete,
  onGrade,
}: {
  assignments: GqlAssignment[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onEdit: (a: GqlAssignment) => void;
  onPublish: (a: GqlAssignment) => void;
  onClose: (a: GqlAssignment) => void;
  onDelete: (a: GqlAssignment) => void;
  onGrade: (s: GqlSubmission) => void;
}) {
  if (assignments.length === 0) {
    return (
      <div className="card text-center py-12 text-muted-foreground/70">
        No assignments yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="table-th w-8"></th>
            <th className="table-th">Title</th>
            <th className="table-th">Class</th>
            <th className="table-th">Due</th>
            <th className="table-th">Status</th>
            <th className="table-th">Submissions</th>
            <th className="table-th">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {assignments.map((a) => (
            <Fragment key={a.id}>
              <tr className="hover:bg-muted/40">
                <td className="table-td">
                  <button aria-label="Toggle submissions" onClick={() => onToggle(a.id)}>
                    {expandedId === a.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                </td>
                <td className="table-td font-medium">
                  {a.title}
                  {a.subjectName && (
                    <span className="ml-2 text-xs text-muted-foreground/70">{a.subjectName}</span>
                  )}
                </td>
                <td className="table-td text-sm">
                  {a.courseName || "—"}
                  {a.semester ? ` · Sem ${a.semester}` : ""}
                  {a.section ? ` · ${a.section}` : ""}
                </td>
                <td className="table-td font-mono">
                  {a.dueDate || "—"}
                  {isOverdue(a) && <span className="ml-2 text-xs text-red-500">overdue</span>}
                </td>
                <td className="table-td">
                  <Badge variant={STATUS_VARIANTS[a.status] ?? "gray"}>
                    {STATUS_LABELS[a.status] ?? a.status}
                  </Badge>
                </td>
                <td className="table-td font-mono text-sm">
                  {a.gradedCount}/{a.submissionCount} graded
                </td>
                <td className="table-td">
                  <div className="flex items-center gap-3">
                    {a.status !== "closed" && (
                      <Can module="assignments" action="edit">
                        <button className="text-sm text-blue-600 hover:underline" onClick={() => onEdit(a)}>
                          Edit
                        </button>
                      </Can>
                    )}
                    {a.status === "draft" && (
                      <Can module="assignments" action="edit">
                        <button className="text-sm text-green-600 hover:underline" onClick={() => onPublish(a)}>
                          Publish
                        </button>
                      </Can>
                    )}
                    {a.status === "published" && (
                      <Can module="assignments" action="edit">
                        <button className="text-sm text-yellow-600 hover:underline" onClick={() => onClose(a)}>
                          Close
                        </button>
                      </Can>
                    )}
                    <Can module="assignments" action="delete">
                      <button className="text-red-500 hover:text-red-700 p-1"
                        aria-label="Delete assignment" onClick={() => onDelete(a)}>
                        <Trash2 size={15} />
                      </button>
                    </Can>
                  </div>
                </td>
              </tr>
              {expandedId === a.id && (
                <tr>
                  <td colSpan={7} className="bg-muted/20 px-4 py-2">
                    <SubmissionsTable assignment={a} onGrade={onGrade} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
