"use client";

import { Badge } from "@/components/ui/badge";
import Can from "@/components/access/Can";
import { Trash2 } from "lucide-react";
import type { GqlEncounter } from "./types";

export default function EncounterTable({
  encounters,
  canWrite,
  isAdmin,
  onEdit,
  onDelete,
}: {
  encounters: GqlEncounter[];
  canWrite: boolean;
  isAdmin: boolean;
  onEdit: (e: GqlEncounter) => void;
  onDelete: (e: GqlEncounter) => void;
}) {
  if (encounters.length === 0) {
    return (
      <div className="card text-center py-12 text-muted-foreground/70">
        No visits recorded yet. Record one when a patient walks in or an appointment starts.
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="table-th">Date</th>
            <th className="table-th">Patient</th>
            <th className="table-th">Clinician</th>
            <th className="table-th">Complaint</th>
            <th className="table-th">Diagnosis</th>
            <th className="table-th">Follow-up</th>
            <th className="table-th">Status</th>
            {canWrite && <th className="table-th">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {encounters.map((e) => (
            <tr key={e.id} className="hover:bg-muted/40">
              <td className="table-td font-mono">
                {e.visitDate}
                {e.crNumber && <div className="text-xs text-muted-foreground/70">{e.crNumber}</div>}
              </td>
              <td className="table-td font-medium">
                {e.patientName}
                <span className="text-xs text-muted-foreground/70 ml-1">({e.patientMrn})</span>
                {e.patientAllergies && (
                  <div className="text-xs text-red-600">⚠ {e.patientAllergies}</div>
                )}
              </td>
              <td className="table-td">{e.clinicianName || "—"}</td>
              <td className="table-td">{e.chiefComplaint || "—"}</td>
              <td className="table-td">{e.diagnosis || "—"}</td>
              <td className="table-td font-mono">{e.followUpDate || "—"}</td>
              <td className="table-td">
                <Badge label={e.status} variant={e.status === "open" ? "blue" : "gray"} />
              </td>
              {canWrite && (
                <td className="table-td">
                  <div className="flex items-center gap-3">
                    <Can module="encounters" action="edit">
                      <button onClick={() => onEdit(e)} className="text-sm text-blue-600 hover:underline">
                        {e.status === "open" ? "Edit" : "View"}
                      </button>
                    </Can>
                    {isAdmin && (
                      <Can module="encounters" action="delete">
                        <button
                          onClick={() => onDelete(e)}
                          className="text-red-500 hover:text-red-700 p-1"
                          aria-label="Delete visit"
                        >
                          <Trash2 size={15} />
                        </button>
                      </Can>
                    )}
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
