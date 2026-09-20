"use client";

import { Badge } from "@/components/ui/badge";
import type { GqlLiveVehicle } from "./types";
import { hasPosition, minutesSincePing, pingLabel } from "./types";

export default function VehicleTable({
  vehicles,
  selectedId,
  onSelect,
}: {
  vehicles: GqlLiveVehicle[];
  selectedId: string | null;
  onSelect: (v: GqlLiveVehicle) => void;
}) {
  if (vehicles.length === 0) {
    return (
      <div className="card text-center py-12 text-muted-foreground/70">
        No vehicles registered yet.
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="table-th">Vehicle</th>
            <th className="table-th">Route</th>
            <th className="table-th">Driver</th>
            <th className="table-th">Position</th>
            <th className="table-th">Last Ping</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {vehicles.map((v) => {
            const mins = minutesSincePing(v);
            const tone = mins === null ? "gray" : mins > 15 ? "yellow" : "green";
            return (
              <tr key={v.id}
                className={`cursor-pointer hover:bg-muted/40 ${selectedId === v.id ? "bg-muted/50" : ""}`}
                onClick={() => onSelect(v)}>
                <td className="table-td font-medium">{v.vehicleNumber}</td>
                <td className="table-td">{v.routeName || "—"}</td>
                <td className="table-td">
                  {v.driverName || "—"}
                  {v.driverPhone && (
                    <span className="ml-2 text-xs text-muted-foreground/70">{v.driverPhone}</span>
                  )}
                </td>
                <td className="table-td font-mono text-xs">
                  {hasPosition(v) ? `${v.latitude.toFixed(4)}, ${v.longitude.toFixed(4)}` : "—"}
                </td>
                <td className="table-td">
                  <Badge variant={tone}>{pingLabel(v)}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
