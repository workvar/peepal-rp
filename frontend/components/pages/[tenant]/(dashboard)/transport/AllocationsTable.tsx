"use client";

import { Bus, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SortableTh from "@/components/ui/SortableTh";
import type { SortState } from "@/lib/tableSort";
import type { TransportAllocation } from "@/types/general/entities";

// Presentational allocations table. Rows arrive already filtered + sorted.
// Per-row "Remove" is a soft end (sets status inactive); hard delete happens
// via the bulk selection bar on the page.
interface Props {
  allocations: TransportAllocation[];
  loading: boolean;
  isAdmin: boolean;
  selected: Set<string>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggleSelect: (id: string) => void;
  sort: SortState | null;
  onSort: (key: string) => void;
  onRemove: (id: string) => void;
}

export default function AllocationsTable({
  allocations, loading, isAdmin, selected, allSelected, onToggleAll, onToggleSelect, sort, onSort, onRemove,
}: Props) {
  const colSpan = isAdmin ? 7 : 5;
  return (
    <div className="card p-0 overflow-hidden">
      {loading ? (
        <LoadingSpinner />
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              {isAdmin && (
                <th className="table-th w-8">
                  <input type="checkbox" className="rounded" checked={allSelected} onChange={onToggleAll} />
                </th>
              )}
              <SortableTh label="Member" sortKey="member" sort={sort} onSort={onSort} />
              <SortableTh label="Vehicle" sortKey="vehicle" sort={sort} onSort={onSort} />
              <SortableTh label="Route" sortKey="route" sort={sort} onSort={onSort} />
              <SortableTh label="Pickup Stop" sortKey="pickup_stop" sort={sort} onSort={onSort} />
              <SortableTh label="Status" sortKey="status" sort={sort} onSort={onSort} />
              {isAdmin && <th className="table-th">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {allocations.map((alloc) => (
              <tr key={alloc.id} className="hover:bg-muted/50">
                {isAdmin && (
                  <td className="table-td">
                    <input type="checkbox" className="rounded" checked={selected.has(alloc.id)} onChange={() => onToggleSelect(alloc.id)} />
                  </td>
                )}
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    <span>{alloc.student?.user?.name ?? alloc.employee?.user?.name ?? "—"}</span>
                    <Badge variant="secondary" className="text-[10px]">{alloc.alloc_type === "staff" ? "Staff" : "Student"}</Badge>
                  </div>
                </td>
                <td className="table-td flex items-center gap-2">
                  <Bus size={14} />
                  {alloc.vehicle?.vehicle_number}
                </td>
                <td className="table-td">{alloc.vehicle?.route?.route_name}</td>
                <td className="table-td flex items-center gap-2">
                  <MapPin size={14} />
                  {alloc.pickup_stop}
                </td>
                <td className="table-td"><Badge variant="secondary">{alloc.status}</Badge></td>
                {isAdmin && (
                  <td className="table-td">
                    <button onClick={() => onRemove(alloc.id)} className="text-sm text-red-500 hover:underline">Remove</button>
                  </td>
                )}
              </tr>
            ))}
            {allocations.length === 0 && (
              <tr><td colSpan={colSpan} className="table-td text-center text-muted-foreground py-8">No allocations yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
