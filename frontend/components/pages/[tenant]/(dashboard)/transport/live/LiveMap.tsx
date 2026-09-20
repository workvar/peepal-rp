"use client";

import { useMemo } from "react";
import type { GqlLiveVehicle } from "./types";
import { hasPosition, minutesSincePing, pingLabel } from "./types";

/**
 * Lightweight vehicle map. Rather than pull in a mapping library (and an API
 * key) for what is a handful of points, positions are projected onto a plain
 * SVG using the bounding box of the reporting fleet. That keeps the page
 * dependency-free while still showing relative positions and staleness; a
 * tiled basemap can be swapped in later behind the same props.
 */
export default function LiveMap({
  vehicles,
  selectedId,
  onSelect,
}: {
  vehicles: GqlLiveVehicle[];
  selectedId: string | null;
  onSelect: (v: GqlLiveVehicle) => void;
}) {
  const tracked = useMemo(() => vehicles.filter(hasPosition), [vehicles]);

  const bounds = useMemo(() => {
    if (tracked.length === 0) return null;
    const lats = tracked.map((v) => v.latitude);
    const lngs = tracked.map((v) => v.longitude);
    // Pad so a single vehicle (or a tight cluster) isn't projected onto a
    // zero-width box, which would put every marker in the same pixel.
    const pad = 0.01;
    return {
      minLat: Math.min(...lats) - pad,
      maxLat: Math.max(...lats) + pad,
      minLng: Math.min(...lngs) - pad,
      maxLng: Math.max(...lngs) + pad,
    };
  }, [tracked]);

  if (!bounds) {
    return (
      <div className="card text-center py-16 text-muted-foreground/70">
        No vehicle has reported a position yet.
      </div>
    );
  }

  const project = (v: GqlLiveVehicle) => ({
    x: ((v.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100,
    // SVG y grows downward, so a higher latitude must map to a smaller y.
    y: (1 - (v.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100,
  });

  return (
    <div className="card p-0 overflow-hidden">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-[420px] w-full bg-muted/30">
        {[25, 50, 75].map((n) => (
          <g key={n} className="text-border">
            <line x1={n} y1="0" x2={n} y2="100" stroke="currentColor" strokeWidth="0.15" />
            <line x1="0" y1={n} x2="100" y2={n} stroke="currentColor" strokeWidth="0.15" />
          </g>
        ))}
        {tracked.map((v) => {
          const { x, y } = project(v);
          const mins = minutesSincePing(v);
          const stale = mins !== null && mins > 15;
          const selected = selectedId === v.id;
          return (
            <g key={v.id} onClick={() => onSelect(v)} className="cursor-pointer">
              <circle cx={x} cy={y} r={selected ? 2.4 : 1.6}
                className={stale ? "fill-yellow-500" : "fill-green-500"}
                opacity={stale ? 0.6 : 1} />
              <text x={x + 3} y={y + 1} fontSize="2.4" className="fill-foreground">
                {v.vehicleNumber}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-center gap-4 border-t border-border/60 px-4 py-2 text-xs text-muted-foreground/70">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Recent ping
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" /> Stale (over 15m)
        </span>
        <span className="ml-auto">
          {tracked.length} of {vehicles.length} vehicles reporting
          {selectedId && (() => {
            const sel = tracked.find((v) => v.id === selectedId);
            return sel ? ` · ${sel.vehicleNumber} ${pingLabel(sel)}` : "";
          })()}
        </span>
      </div>
    </div>
  );
}
