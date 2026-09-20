"use client";

// Fleet list for the Ambulance page: a table with multi-select delete and
// scroll-based lazy loading. Reuses the shared bulkSelect + useLazyList helpers
// so behaviour matches other list pages (vendors, drugs, inventory).

import { useState } from "react";
import { Ambulance as AmbIcon, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Can from "@/components/access/Can";
import {
  useBulkSelect, runBulkDelete, BulkDeleteBar, RowCheckbox, HeaderCheckbox,
} from "@/components/ui/bulkSelect";
import { useLazyList } from "@/components/ui/useLazyList";

export interface FleetVehicle {
  id: string;
  code: string;
  registration?: string | null;
  vehicleType: string;
  driverName?: string | null;
  status: string;
}

export default function FleetTab({ fleet, deleteOne }: {
  fleet: FleetVehicle[];
  deleteOne: (id: string) => Promise<unknown>;
}) {
  const sel = useBulkSelect();
  const [deleting, setDeleting] = useState(false);
  const { visible, sentinelRef, hasMore } = useLazyList(fleet);

  const ids = fleet.map((a) => a.id);

  const handleBulkDelete = async () => {
    setDeleting(true);
    await runBulkDelete([...sel.selected], deleteOne, "ambulance");
    sel.clear();
    setDeleting(false);
  };

  if (fleet.length === 0) {
    return <div className="card text-center py-12 text-muted-foreground/70">No ambulances yet.</div>;
  }

  return (
    <div>
      <Can module="ambulance" action="delete">
        <BulkDeleteBar sel={sel} onDelete={handleBulkDelete} deleting={deleting} />
      </Can>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/40">
            <tr>
              <th className="table-th w-10">
                <HeaderCheckbox checked={sel.isAllSelected(ids)} onChange={() => sel.toggleAll(ids)} />
              </th>
              <th className="table-th">Code</th>
              <th className="table-th">Type</th>
              <th className="table-th">Registration</th>
              <th className="table-th">Driver</th>
              <th className="table-th">Status</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {visible.map((a) => {
              const isSel = sel.selected.has(a.id);
              return (
                <tr key={a.id} className={`hover:bg-muted/40 ${isSel ? "bg-primary/5" : ""}`}>
                  <td className="table-td w-10">
                    <RowCheckbox checked={isSel} onChange={() => sel.toggle(a.id)} />
                  </td>
                  <td className="table-td font-medium">
                    <span className="inline-flex items-center gap-2">
                      <AmbIcon size={16} className="text-red-500" />{a.code}
                    </span>
                  </td>
                  <td className="table-td uppercase text-xs">{a.vehicleType}</td>
                  <td className="table-td">{a.registration || "—"}</td>
                  <td className="table-td">{a.driverName || "—"}</td>
                  <td className="table-td">
                    <Badge
                      label={a.status.replace("_", " ")}
                      variant={a.status === "available" ? "green" : a.status === "on_trip" ? "yellow" : "gray"}
                      className="capitalize"
                    />
                  </td>
                  <td className="table-td">
                    {a.status !== "on_trip" && (
                      <Can module="ambulance" action="delete">
                        <button onClick={() => deleteOne(a.id)} className="text-red-500 hover:text-red-700 p-1"
                          aria-label={`Delete ${a.code}`}>
                          <Trash2 size={15} />
                        </button>
                      </Can>
                    )}
                  </td>
                </tr>
              );
            })}
            {hasMore && (
              <tr ref={sentinelRef}>
                <td colSpan={7} className="table-td text-center text-sm text-muted-foreground/70 py-4">
                  Loading more…
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-2 text-xs text-muted-foreground/60 border-t border-border/60">
          Showing {visible.length} of {fleet.length}
        </div>
      </div>
    </div>
  );
}
