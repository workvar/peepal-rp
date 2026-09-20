"use client";

import Can from "@/components/access/Can";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import type { GqlDriverAttendance } from "./types";

const STATUS_TONES: Record<string, "green" | "red" | "yellow"> = {
  present: "green",
  absent: "red",
  leave: "yellow",
};

export default function DriverAttendanceTable({
  rows,
  canWrite,
  onDelete,
}: {
  rows: GqlDriverAttendance[];
  canWrite: boolean;
  onDelete: (row: GqlDriverAttendance) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="card text-center py-12 text-muted-foreground/70">
        No driver attendance recorded for this date.
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="table-th">Date</th>
            <th className="table-th">Driver</th>
            <th className="table-th">Vehicle</th>
            <th className="table-th">In</th>
            <th className="table-th">Out</th>
            <th className="table-th">Status</th>
            {canWrite && <th className="table-th">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-muted/40">
              <td className="table-td font-mono">{r.date}</td>
              <td className="table-td font-medium">{r.employeeName}</td>
              <td className="table-td">{r.vehicleNumber || "—"}</td>
              <td className="table-td font-mono">{r.checkInAt || "—"}</td>
              <td className="table-td font-mono">{r.checkOutAt || "—"}</td>
              <td className="table-td">
                <Badge variant={STATUS_TONES[r.status] ?? "gray"}>{r.status}</Badge>
              </td>
              {canWrite && (
                <td className="table-td">
                  <Can module="transport-live" action="delete">
                    <button className="text-red-500 hover:text-red-700 p-1"
                      aria-label="Delete attendance" onClick={() => onDelete(r)}>
                      <Trash2 size={15} />
                    </button>
                  </Can>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
