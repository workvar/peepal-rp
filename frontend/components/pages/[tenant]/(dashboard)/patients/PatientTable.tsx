"use client";

import { Badge } from "@/components/ui/badge";
import Can from "@/components/access/Can";
import { Trash2 } from "lucide-react";
import type { GqlPatient } from "./types";
import { patientName } from "./types";

const STATUS_VARIANT: Record<string, "green" | "gray" | "red"> = {
  active: "green",
  inactive: "gray",
  deceased: "red",
};

export default function PatientTable({
  patients,
  canWrite,
  onEdit,
  onDelete,
  onCreateLogin,
}: {
  patients: GqlPatient[];
  canWrite: boolean;
  onEdit: (p: GqlPatient) => void;
  onDelete: (p: GqlPatient) => void;
  onCreateLogin?: (p: GqlPatient) => void;
}) {
  if (patients.length === 0) {
    return (
      <div className="card text-center py-12 text-muted-foreground/70">
        No patients registered yet. Add one to start the registry.
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="table-th">MRN</th>
            <th className="table-th">Patient</th>
            <th className="table-th">Gender</th>
            <th className="table-th">Phone</th>
            <th className="table-th">Blood Group</th>
            <th className="table-th">Allergies</th>
            <th className="table-th">Status</th>
            {canWrite && <th className="table-th">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {patients.map((p) => (
            <tr key={p.id} className="hover:bg-muted/40">
              <td className="table-td font-mono">
                {p.mrn}
                {p.uhid && <div className="text-xs text-muted-foreground/70">UHID: {p.uhid}</div>}
              </td>
              <td className="table-td font-medium">{patientName(p)}</td>
              <td className="table-td capitalize">{p.gender || "—"}</td>
              <td className="table-td">{p.phone || "—"}</td>
              <td className="table-td">{p.bloodGroup || "—"}</td>
              <td className="table-td">
                {p.allergies ? (
                  <span className="text-red-600 text-sm">{p.allergies}</span>
                ) : (
                  "—"
                )}
              </td>
              <td className="table-td">
                <Badge label={p.status} variant={STATUS_VARIANT[p.status] ?? "gray"} />
              </td>
              {canWrite && (
                <td className="table-td">
                  <div className="flex items-center gap-3">
                    <Can module="patients" action="edit">
                      <button onClick={() => onEdit(p)} className="text-sm text-blue-600 hover:underline">
                        Edit
                      </button>
                      {onCreateLogin && (
                        <button onClick={() => onCreateLogin(p)} className="text-sm text-emerald-600 hover:underline">
                          Portal login
                        </button>
                      )}
                    </Can>
                    <Can module="patients" action="delete">
                      <button
                        onClick={() => onDelete(p)}
                        className="text-red-500 hover:text-red-700 p-1"
                        aria-label={`Delete ${patientName(p)}`}
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
