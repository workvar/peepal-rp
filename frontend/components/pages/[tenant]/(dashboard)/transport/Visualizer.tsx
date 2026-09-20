"use client";

import { useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Bus, MapPin, AlertTriangle, Route as RouteIcon } from "lucide-react";
import type { TransportVehicle } from "@/types/general/entities";

// Rider-fill state of a single vehicle, used to colour its row.
type Fill = "empty" | "partial" | "full" | "maintenance";

const FILL: Record<Fill, { dot: string; bar: string; tint: string; label: string }> = {
  empty:       { dot: "bg-emerald-500", bar: "bg-emerald-500", tint: "border-l-emerald-500", label: "Empty (no riders)" },
  partial:     { dot: "bg-amber-500",   bar: "bg-amber-500",   tint: "border-l-amber-500",   label: "Partially filled" },
  full:        { dot: "bg-rose-500",    bar: "bg-rose-500",    tint: "border-l-rose-500",    label: "Full" },
  maintenance: { dot: "bg-slate-400",   bar: "bg-slate-400",   tint: "border-l-slate-400",   label: "Maintenance" },
};

function vehicleFill(vehicle: TransportVehicle, riders: number): Fill {
  if (vehicle.status === "maintenance") return "maintenance";
  if (vehicle.capacity > 0 && riders >= vehicle.capacity) return "full";
  if (riders > 0) return "partial";
  return "empty";
}

const ROUTE_FILTERS = [
  { key: "all", label: "All routes" },
  { key: "assigned", label: "With vehicles" },
  { key: "empty", label: "Empty routes" },
];

export default function TransportVisualizer() {
  const { routes, vehicles, allocations, loading } = useAppSelector((s) => s.transport);
  const [routeFilter, setRouteFilter] = useState("all");

  // Active riders per vehicle (inactive/ended allocations don't count).
  const ridersByVehicle = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of allocations) {
      if (a.status !== "active") continue;
      m[a.vehicle_id] = (m[a.vehicle_id] || 0) + 1;
    }
    return m;
  }, [allocations]);

  // Vehicles grouped by the route they run.
  const vehiclesByRoute = useMemo(() => {
    const m: Record<string, TransportVehicle[]> = {};
    for (const v of vehicles) (m[v.route_id] ||= []).push(v);
    return m;
  }, [vehicles]);

  // One summary object per route: its vehicles, total seats and total riders.
  const routeCards = useMemo(() => {
    return routes.map((r) => {
      const vs = (vehiclesByRoute[r.id] || []).slice().sort((a, b) =>
        String(a.vehicle_number).localeCompare(String(b.vehicle_number), undefined, { numeric: true })
      );
      const capacity = vs.reduce((s, v) => s + (v.capacity || 0), 0);
      const riders = vs.reduce((s, v) => s + (ridersByVehicle[v.id] || 0), 0);
      return { route: r, vehicles: vs, capacity, riders };
    });
  }, [routes, vehiclesByRoute, ridersByVehicle]);

  // Vehicles whose route_id no longer points at a real route (e.g. the route
  // was deleted). Surfaced so they don't silently disappear from the picture.
  const orphanVehicles = useMemo(() => {
    const ids = new Set(routes.map((r) => r.id));
    return vehicles.filter((v) => !ids.has(v.route_id));
  }, [routes, vehicles]);

  const emptyVehicles = useMemo(
    () => vehicles.filter((v) => (ridersByVehicle[v.id] || 0) === 0),
    [vehicles, ridersByVehicle]
  );

  const emptyRouteCount = routeCards.filter((rc) => rc.vehicles.length === 0).length;
  const activeRiders = Object.values(ridersByVehicle).reduce((s, n) => s + n, 0);

  if (loading && routes.length === 0 && vehicles.length === 0) return <LoadingSpinner />;
  if (routes.length === 0 && vehicles.length === 0) {
    return (
      <div className="card p-8 text-center text-muted-foreground">
        Add routes and vehicles to see the assignment map.
      </div>
    );
  }

  const visibleRouteCards =
    routeFilter === "empty" ? routeCards.filter((rc) => rc.vehicles.length === 0)
    : routeFilter === "assigned" ? routeCards.filter((rc) => rc.vehicles.length > 0)
    : routeCards;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Stat label="Routes" value={routes.length} />
        <Stat label="Vehicles" value={vehicles.length} />
        <Stat label="Empty routes" value={emptyRouteCount} accent="text-amber-500" />
        <Stat label="Empty vehicles" value={emptyVehicles.length} accent="text-emerald-500" />
        <Stat label="Active riders" value={activeRiders} accent="text-blue-500" />
      </div>

      {/* Legend + route filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {(["empty", "partial", "full", "maintenance"] as Fill[]).map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`inline-block h-3 w-3 rounded ${FILL[k].dot}`} />
              {FILL[k].label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {ROUTE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setRouteFilter(f.key)}
              className={`px-2.5 py-1 text-xs rounded-md transition ${
                routeFilter === f.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Routes and their vehicles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleRouteCards.map(({ route, vehicles: vs, capacity, riders }) => {
          const isEmpty = vs.length === 0;
          return (
            <div key={route.id} className={`card p-4 border-l-4 ${isEmpty ? "border-l-amber-500" : "border-l-primary/60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <RouteIcon size={16} className="text-muted-foreground shrink-0" />
                    <h3 className="font-semibold truncate">{route.route_name}</h3>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin size={12} className="shrink-0" />
                    <span className="truncate">{route.start_point} → {route.end_point}</span>
                  </div>
                </div>
                {isEmpty ? (
                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 border-amber-500/30 shrink-0">Empty</Badge>
                ) : (
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    <div className="font-medium text-foreground">{vs.length} vehicle{vs.length > 1 ? "s" : ""}</div>
                    <div>{riders}/{capacity} seats</div>
                  </div>
                )}
              </div>

              {isEmpty ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground border border-dashed border-border rounded-lg px-3 py-3">
                  <AlertTriangle size={14} className="text-amber-500" />
                  No vehicles assigned to this route.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {vs.map((v) => {
                    const r = ridersByVehicle[v.id] || 0;
                    const fill = FILL[vehicleFill(v, r)];
                    const pct = v.capacity > 0 ? Math.min(100, (r / v.capacity) * 100) : 0;
                    return (
                      <div key={v.id} className={`flex items-center gap-3 rounded-lg border border-l-4 ${fill.tint} border-border bg-muted/30 px-3 py-2`}>
                        <Bus size={15} className="text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm truncate">{v.vehicle_number}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{r}/{v.capacity} riders</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                            <div className={`h-full ${fill.bar}`} style={{ width: `${pct}%` }} />
                          </div>
                          {v.driver_name && (
                            <div className="text-[11px] text-muted-foreground mt-1 truncate">Driver: {v.driver_name}</div>
                          )}
                        </div>
                        {v.status === "maintenance" && <Badge variant="secondary" className="shrink-0">maintenance</Badge>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {visibleRouteCards.length === 0 && (
          <div className="card p-6 text-center text-muted-foreground text-sm lg:col-span-2">
            No routes match this filter.
          </div>
        )}
      </div>

      {/* Empty vehicles */}
      <div>
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Empty vehicles
          <span className="text-sm font-normal text-muted-foreground">({emptyVehicles.length})</span>
        </h3>
        <p className="text-xs text-muted-foreground mb-3">Vehicles with no active student allocations.</p>
        {emptyVehicles.length === 0 ? (
          <div className="card p-4 text-sm text-muted-foreground">Every vehicle has at least one rider.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {emptyVehicles.map((v) => {
              const route = routes.find((r) => r.id === v.route_id);
              return (
                <div key={v.id} className="card p-3 border-l-4 border-l-emerald-500 flex items-center gap-3">
                  <Bus size={16} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{v.vehicle_number}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {route ? route.route_name : <span className="text-amber-600">No route</span>} · {v.capacity} seats
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Orphaned vehicles (route was deleted) */}
      {orphanVehicles.length > 0 && (
        <div>
          <h3 className="font-semibold mb-1 flex items-center gap-2 text-amber-600">
            <AlertTriangle size={15} />
            Vehicles with no route
            <span className="text-sm font-normal text-muted-foreground">({orphanVehicles.length})</span>
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Their route was removed. Reassign them from the Vehicles tab.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {orphanVehicles.map((v) => (
              <div key={v.id} className="card p-3 border-l-4 border-l-amber-500 flex items-center gap-3">
                <Bus size={16} className="text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{v.vehicle_number}</div>
                  <div className="text-xs text-muted-foreground">{v.capacity} seats</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted-foreground uppercase mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? ""}`}>{value}</p>
    </div>
  );
}
