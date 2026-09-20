"use client";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SortableTh from "@/components/ui/SortableTh";
import type { SortState } from "@/lib/tableSort";
import type { TransportRoute } from "@/types/general/entities";

// Presentational routes table. Rows arrive already filtered + sorted from the
// page; this component only renders and raises selection / edit events.
interface Props {
  routes: TransportRoute[];
  loading: boolean;
  isAdmin: boolean;
  selected: Set<string>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggleSelect: (id: string) => void;
  sort: SortState | null;
  onSort: (key: string) => void;
  onEdit: (route: TransportRoute) => void;
}

export default function RoutesTable({
  routes, loading, isAdmin, selected, allSelected, onToggleAll, onToggleSelect, sort, onSort, onEdit,
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
              <SortableTh label="Route Name" sortKey="route_name" sort={sort} onSort={onSort} />
              <SortableTh label="Start Point" sortKey="start_point" sort={sort} onSort={onSort} />
              <SortableTh label="End Point" sortKey="end_point" sort={sort} onSort={onSort} />
              <SortableTh label="Stops" sortKey="stops" sort={sort} onSort={onSort} />
              <SortableTh label="Distance" sortKey="distance" sort={sort} onSort={onSort} />
              {isAdmin && <th className="table-th">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {routes.map((route) => (
              <tr key={route.id} className="hover:bg-muted/50">
                {isAdmin && (
                  <td className="table-td">
                    <input type="checkbox" className="rounded" checked={selected.has(route.id)} onChange={() => onToggleSelect(route.id)} />
                  </td>
                )}
                <td className="table-td font-medium">{route.route_name}</td>
                <td className="table-td">{route.start_point}</td>
                <td className="table-td">{route.end_point}</td>
                <td className="table-td text-xs text-muted-foreground">{route.stops}</td>
                <td className="table-td">{route.distance} km</td>
                {isAdmin && (
                  <td className="table-td">
                    <button onClick={() => onEdit(route)} className="text-sm text-blue-600 hover:underline">Edit</button>
                  </td>
                )}
              </tr>
            ))}
            {routes.length === 0 && (
              <tr><td colSpan={colSpan} className="table-td text-center text-muted-foreground py-8">No routes yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
