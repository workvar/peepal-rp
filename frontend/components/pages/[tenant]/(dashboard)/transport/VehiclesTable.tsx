"use client";

import { Bus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SortableTh from "@/components/ui/SortableTh";
import type { SortState } from "@/lib/tableSort";
import type { TransportVehicle } from "@/types/general/entities";

// Presentational vehicles table. Rows arrive already filtered + sorted.
interface Props {
  vehicles: TransportVehicle[];
  loading: boolean;
  isAdmin: boolean;
  selected: Set<string>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggleSelect: (id: string) => void;
  sort: SortState | null;
  onSort: (key: string) => void;
  onEdit: (vehicle: TransportVehicle) => void;
}

export default function VehiclesTable({
  vehicles, loading, isAdmin, selected, allSelected, onToggleAll, onToggleSelect, sort, onSort, onEdit,
}: Props) {
  const colSpan = isAdmin ? 8 : 6;
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
              <SortableTh label="Vehicle Number" sortKey="vehicle_number" sort={sort} onSort={onSort} />
              <SortableTh label="Type" sortKey="vehicle_type" sort={sort} onSort={onSort} />
              <SortableTh label="Capacity" sortKey="capacity" sort={sort} onSort={onSort} />
              <SortableTh label="Driver" sortKey="driver" sort={sort} onSort={onSort} />
              <SortableTh label="Route" sortKey="route" sort={sort} onSort={onSort} />
              <SortableTh label="Status" sortKey="status" sort={sort} onSort={onSort} />
              {isAdmin && <th className="table-th">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-muted/50">
                {isAdmin && (
                  <td className="table-td">
                    <input type="checkbox" className="rounded" checked={selected.has(vehicle.id)} onChange={() => onToggleSelect(vehicle.id)} />
                  </td>
                )}
                <td className="table-td font-medium flex items-center gap-2">
                  <Bus size={16} /> {vehicle.vehicle_number}
                </td>
                <td className="table-td capitalize">{vehicle.vehicle_type}</td>
                <td className="table-td">{vehicle.capacity}</td>
                <td className="table-td">
                  <div className="text-xs">
                    <p className="font-medium">{vehicle.driver_name}</p>
                    <p className="text-muted-foreground">{vehicle.driver_phone}</p>
                  </div>
                </td>
                <td className="table-td">{vehicle.route?.route_name}</td>
                <td className="table-td"><Badge variant="secondary">{vehicle.status}</Badge></td>
                {isAdmin && (
                  <td className="table-td">
                    <button onClick={() => onEdit(vehicle)} className="text-sm text-blue-600 hover:underline">Edit</button>
                  </td>
                )}
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr><td colSpan={colSpan} className="table-td text-center text-muted-foreground py-8">No vehicles yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
