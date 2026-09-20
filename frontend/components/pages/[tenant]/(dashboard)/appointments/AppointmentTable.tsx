"use client";

import { Badge } from "@/components/ui/badge";
import Can from "@/components/access/Can";
import { Printer, Trash2, Check, X } from "lucide-react";
import type { GqlAppointment } from "./types";
import type { AppointmentPerms } from "./permissions";

const STATUS_VARIANT: Record<string, "blue" | "green" | "gray" | "yellow"> = {
  scheduled: "blue",
  completed: "green",
  cancelled: "gray",
  no_show: "yellow",
};

export default function AppointmentTable({
  appointments,
  perms,
  onEdit,
  onDelete,
  onStatus,
  onPrint,
}: {
  appointments: GqlAppointment[];
  perms: AppointmentPerms;
  onEdit: (a: GqlAppointment) => void;
  onDelete: (a: GqlAppointment) => void;
  onStatus: (a: GqlAppointment, status: string) => void;
  onPrint: (a: GqlAppointment) => void;
}) {
  // The Actions column is always rendered: anyone who can see a row may print
  // its slip, and the patient carries that slip to the doctor.
  if (appointments.length === 0) {
    return (
      <div className="card text-center py-12 text-muted-foreground/70">
        No appointments found. Book one to build the day&apos;s schedule.
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="table-th">Date</th>
            <th className="table-th">Time</th>
            <th className="table-th">Patient</th>
            <th className="table-th">Clinician</th>
            <th className="table-th">Department</th>
            <th className="table-th">Reason</th>
            <th className="table-th">Status</th>
            <th className="table-th">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {appointments.map((a) => (
            <tr key={a.id} className="hover:bg-muted/40">
              <td className="table-td font-mono">{a.date}</td>
              <td className="table-td font-mono">
                {a.startTime}{a.endTime ? `–${a.endTime}` : ""}
              </td>
              <td className="table-td font-medium">
                {a.patientName}
                <span className="text-xs text-muted-foreground/70 ml-1">({a.patientMrn})</span>
              </td>
              <td className="table-td">{a.clinicianName || "—"}</td>
              <td className="table-td">{a.departmentName ?? "—"}</td>
              <td className="table-td">{a.reason || "—"}</td>
              <td className="table-td">
                <Badge
                  label={a.status.replace("_", " ")}
                  variant={STATUS_VARIANT[a.status] ?? "gray"}
                />
              </td>
              <td className="table-td">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onPrint(a)}
                      className="text-muted-foreground hover:text-foreground p-1"
                      title="Print OPD slip"
                      aria-label="Print OPD slip"
                    >
                      <Printer size={15} />
                    </button>
                    {/* Accepting or declining is the clinician's call (admins
                        may act on their behalf); front desk cannot. */}
                    {a.status === "scheduled" && perms.canDecide && (
                      <Can module="appointments" action="edit">
                        <button
                          onClick={() => onStatus(a, "completed")}
                          className="text-emerald-600 hover:text-emerald-700 p-1"
                          title="Accept / mark completed"
                          aria-label="Accept appointment"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          onClick={() => onStatus(a, "cancelled")}
                          className="text-muted-foreground hover:text-foreground p-1"
                          title="Decline / cancel"
                          aria-label="Decline appointment"
                        >
                          <X size={15} />
                        </button>
                      </Can>
                    )}
                    {perms.canModify && (
                      <>
                        <Can module="appointments" action="edit">
                          <button onClick={() => onEdit(a)} className="text-sm text-blue-600 hover:underline">
                            Edit
                          </button>
                        </Can>
                        <Can module="appointments" action="delete">
                          <button
                            onClick={() => onDelete(a)}
                            className="text-red-500 hover:text-red-700 p-1"
                            aria-label="Delete appointment"
                          >
                            <Trash2 size={15} />
                          </button>
                        </Can>
                      </>
                    )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
