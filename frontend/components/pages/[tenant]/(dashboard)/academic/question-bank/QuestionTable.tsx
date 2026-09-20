"use client";

import { Badge } from "@/components/ui/badge";
import Can from "@/components/access/Can";
import { Trash2 } from "lucide-react";
import type { GqlQuestion } from "./types";
import { difficultyVariant } from "./types";

export default function QuestionTable({
  questions,
  canWrite,
  onEdit,
  onDelete,
}: {
  questions: GqlQuestion[];
  canWrite: boolean;
  onEdit: (q: GqlQuestion) => void;
  onDelete: (q: GqlQuestion) => void;
}) {
  if (questions.length === 0) {
    return (
      <div className="card py-12 text-center text-muted-foreground/70">
        No questions yet for this subject. Add one, or bulk-upload a CSV to seed the pool.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="table-th">Question</th>
            <th className="table-th">Unit</th>
            <th className="table-th">Type</th>
            <th className="table-th">Difficulty</th>
            <th className="table-th">Marks</th>
            <th className="table-th">CO</th>
            {canWrite && <th className="table-th">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {questions.map((q) => (
            <tr key={q.id} className={`hover:bg-muted/40 ${q.active ? "" : "opacity-60"}`}>
              <td className="table-td max-w-md">
                <span className="line-clamp-2">{q.questionText}</span>
                {q.options.length > 0 && (
                  <span className="mt-0.5 block text-xs text-muted-foreground/70">
                    {q.options.length} options
                  </span>
                )}
                {!q.active && (
                  <span className="mt-1 inline-block">
                    <Badge label="Retired" variant="gray" />
                  </span>
                )}
              </td>
              <td className="table-td">
                {q.unit || <span className="text-muted-foreground/70">—</span>}
              </td>
              <td className="table-td capitalize">{q.questionType}</td>
              <td className="table-td">
                <Badge
                  label={q.difficulty}
                  variant={difficultyVariant[q.difficulty] ?? "gray"}
                  className="capitalize"
                />
              </td>
              <td className="table-td font-mono">{q.marks}</td>
              <td className="table-td">
                {q.courseOutcome || <span className="text-muted-foreground/70">—</span>}
              </td>
              {canWrite && (
                <td className="table-td">
                  <div className="flex items-center gap-3">
                    <Can module="question-bank" action="edit">
                      <button
                        onClick={() => onEdit(q)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                    </Can>
                    <Can module="question-bank" action="delete">
                      <button
                        onClick={() => onDelete(q)}
                        className="p-1 text-red-500 hover:text-red-700"
                        aria-label="Delete question"
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
