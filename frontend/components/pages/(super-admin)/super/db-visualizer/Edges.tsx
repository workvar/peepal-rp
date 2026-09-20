"use client";

import { EDGES } from "./schema";
import { NodePos } from "./layout";

interface Props {
  positions: Record<string, NodePos>;
  worldW: number;
  worldH: number;
  activeTable: string | null;
}

/** SVG layer drawing FK relationships as curved child→parent links. */
export default function Edges({ positions, worldW, worldH, activeTable }: Props) {
  return (
    <svg
      width={worldW}
      height={worldH}
      className="absolute top-0 left-0 pointer-events-none"
      style={{ overflow: "visible" }}
    >
      <defs>
        <marker id="dbv-arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
          <path d="M0,0 L7,3 L0,6 Z" className="fill-muted-foreground" />
        </marker>
        <marker id="dbv-arrow-active" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
          <path d="M0,0 L7,3 L0,6 Z" fill="#0ea5e9" />
        </marker>
      </defs>
      {EDGES.map((e, i) => {
        const c = positions[e.child];
        const p = positions[e.parent];
        if (!c || !p) return null;
        const cc = { x: c.x + c.w / 2, y: c.y + c.h / 2 };
        const pc = { x: p.x + p.w / 2, y: p.y + p.h / 2 };
        // exit/enter on the horizontal side facing the other node
        const childRight = pc.x >= cc.x;
        const sx = childRight ? c.x + c.w : c.x;
        const sy = cc.y;
        const ex = pc.x >= cc.x ? p.x : p.x + p.w;
        const ey = pc.y;
        const dx = Math.max(40, Math.abs(ex - sx) * 0.5);
        const c1x = sx + (childRight ? dx : -dx);
        const c2x = ex + (pc.x >= cc.x ? -dx : dx);
        const active = activeTable === e.child || activeTable === e.parent;
        return (
          <path
            key={i}
            d={`M${sx},${sy} C${c1x},${sy} ${c2x},${ey} ${ex},${ey}`}
            fill="none"
            className={active ? "" : "stroke-border"}
            stroke={active ? "#0ea5e9" : undefined}
            strokeWidth={active ? 2 : 1.2}
            strokeOpacity={activeTable && !active ? 0.15 : active ? 0.9 : 0.5}
            markerEnd={`url(#dbv-arrow${active ? "-active" : ""})`}
          />
        );
      })}
    </svg>
  );
}
