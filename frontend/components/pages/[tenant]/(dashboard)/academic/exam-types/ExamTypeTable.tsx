"use client";

import { Badge } from "@/components/ui/badge";
import Can from "@/components/access/Can";
import { Trash2 } from "lucide-react";
import type { GqlExamType } from "./types";

export default function ExamTypeTable({
  examTypes,
  canWrite,
  onEdit,
  onDelete,
}: {
  examTypes: GqlExamType[];
  canWrite: boolean;
  onEdit: (e: GqlExamType) => void;
  onDelete: (e: GqlExamType) => void;
}) {
  if (examTypes.length === 0) {
    return (
      <div className="card text-center py-12 text-muted-foreground/70">
        No exams configured yet. Add one to populate the assessment-type dropdown when entering marks.
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="table-th">Exam</th>
            <th className="table-th">Department</th>
            <th className="table-th">Max Marks</th>
            <th className="table-th">Weightage</th>
            <th className="table-th">Status</th>
            {canWrite && <th className="table-th">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {examTypes.map((e) => (
            <tr key={e.id} className="hover:bg-muted/40">
              <td className="table-td font-medium">{e.name}</td>
              <td className="table-td">
                {e.department?.name ?? (
                  <span className="text-muted-foreground/70">All departments</span>
                )}
              </td>
              <td className="table-td font-mono">{e.maxMarks}</td>
              <td className="table-td">
                {e.weightage != null && e.weightage > 0 ? `${e.weightage}%` : "—"}
              </td>
              <td className="table-td">
                <Badge label={e.active ? "Active" : "Inactive"} variant={e.active ? "green" : "gray"} />
              </td>
              {canWrite && (
                <td className="table-td">
                  <div className="flex items-center gap-3">
                    <Can module="exam-types" action="edit">
                      <button onClick={() => onEdit(e)} className="text-sm text-blue-600 hover:underline">
                        Edit
                      </button>
                    </Can>
                    <Can module="exam-types" action="delete">
                      <button
                        onClick={() => onDelete(e)}
                        className="text-red-500 hover:text-red-700 p-1"
                        aria-label={`Delete ${e.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </Can>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
