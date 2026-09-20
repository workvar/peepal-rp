"use client";

import Can from "@/components/access/Can";
import { Trash2 } from "lucide-react";
import type { GqlDutyShift } from "./types";

export default function RosterTable({
  shifts,
  canWrite,
  onEdit,
  onDelete,
}: {
  shifts: GqlDutyShift[];
  canWrite: boolean;
  onEdit: (s: GqlDutyShift) => void;
  onDelete: (s: GqlDutyShift) => void;
}) {
  if (shifts.length === 0) {
    return (
      <div className="card text-center py-12 text-muted-foreground/70">
        No shifts scheduled in this range yet.
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="table-th">Date</th>
            <th className="table-th">Employee</th>
            <th className="table-th">Shift</th>
            <th className="table-th">Hours</th>
            <th className="table-th">Location</th>
            {canWrite && <th className="table-th">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {shifts.map((s) => (
            <tr key={s.id} className="hover:bg-muted/40">
              <td className="table-td font-mono">{s.date}</td>
              <td className="table-td font-medium">{s.employeeName || "—"}</td>
              <td className="table-td">{s.shiftName || "—"}</td>
              <td className="table-td font-mono">{s.startTime}–{s.endTime}</td>
              <td className="table-td">{s.location || "—"}</td>
              {canWrite && (
                <td className="table-td">
                  <div className="flex items-center gap-3">
                    <Can module="duty-roster" action="edit">
                      <button className="text-sm text-blue-600 hover:underline"
                        onClick={() => onEdit(s)}>
                        Edit
                      </button>
                    </Can>
                    <Can module="duty-roster" action="delete">
                      <button className="text-red-500 hover:text-red-700 p-1"
                        aria-label="Delete shift" onClick={() => onDelete(s)}>
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
