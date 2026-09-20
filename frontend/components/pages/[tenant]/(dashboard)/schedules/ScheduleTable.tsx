"use client";

import Can from "@/components/access/Can";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import type { GqlClinicianSchedule } from "./types";
import { DAY_NAMES } from "./types";

interface Props {
  rows: GqlClinicianSchedule[];
  onEdit: (s: GqlClinicianSchedule) => void;
  onDelete: (s: GqlClinicianSchedule) => void;
}

export default function ScheduleTable({ rows, onEdit, onDelete }: Props) {
  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="table-th">Clinician</th>
            <th className="table-th">Day</th>
            <th className="table-th">Hours</th>
            <th className="table-th">Slot</th>
            <th className="table-th">Status</th>
            <th className="table-th">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((s) => (
            <tr key={s.id} className="hover:bg-muted/40">
              <td className="table-td font-medium">{s.clinicianName || "—"}</td>
              <td className="table-td">{DAY_NAMES[s.dayOfWeek]}</td>
              <td className="table-td font-mono">{s.startTime}–{s.endTime}</td>
              <td className="table-td">{s.slotMinutes} min</td>
              <td className="table-td">
                <Badge label={s.active ? "Active" : "Inactive"} variant={s.active ? "green" : "gray"} />
              </td>
              <td className="table-td">
                <div className="flex items-center gap-3">
                  <Can module="schedules" action="edit">
                    <button className="text-sm text-blue-600 hover:underline" onClick={() => onEdit(s)}>
                      Edit
                    </button>
                  </Can>
                  <Can module="schedules" action="delete">
                    <button className="text-red-500 hover:text-red-700 p-1"
                      aria-label="Delete window" onClick={() => onDelete(s)}>
                      <Trash2 size={15} />
                    </button>
                  </Can>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
