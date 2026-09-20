"use client";

import { TABLES } from "./schema";
import { useDbCanvas } from "./useDbCanvas";
import TableCard from "./TableCard";
import Edges from "./Edges";

interface Props {
  canvas: ReturnType<typeof useDbCanvas>;
  colorOf: (mod: string) => string;
  active: string | null;
  setActive: (n: string | null) => void;
  query: string;
}

/** The pannable / zoomable world: module regions, edges and table cards. */
export default function Canvas({ canvas, colorOf, active, setActive, query }: Props) {
  const { base, positions, view, containerRef, onWheel, startPan, startNode } = canvas;
  const q = query.trim().toLowerCase();

  return (
    <div
      ref={containerRef}
      onWheel={onWheel}
      onPointerDown={startPan}
      className="relative w-full h-full overflow-hidden bg-muted/30 dark:bg-slate-950/40 cursor-grab active:cursor-grabbing"
      style={{
        backgroundImage:
          "radial-gradient(circle, var(--border) 1px, transparent 1px)",
        backgroundSize: "26px 26px",
      }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
          width: base.worldW,
          height: base.worldH,
        }}
      >
        {/* Module regions */}
        {base.moduleBoxes.map((m) => (
          <div
            key={m.name}
            className="absolute rounded-xl border-2 border-dashed pointer-events-none"
            style={{ left: m.x, top: m.y, width: m.w, height: m.h, borderColor: m.color + "44", background: m.color + "08" }}
          >
            <span className="absolute -top-2.5 left-3 px-1.5 text-[11px] font-bold rounded" style={{ color: m.color, background: "var(--card)" }}>
              {m.name}
            </span>
          </div>
        ))}

        <Edges positions={positions} worldW={base.worldW} worldH={base.worldH} activeTable={active} />

        {TABLES.map((t) => {
          const match = !q || t.name.toLowerCase().includes(q) || t.module.toLowerCase().includes(q);
          return (
            <TableCard
              key={t.name}
              table={t}
              pos={positions[t.name]}
              color={colorOf(t.module)}
              active={active === t.name}
              dimmed={!!q && !match}
              onPointerDown={(e) => startNode(e, t.name)}
              onClick={() => setActive(t.name)}
            />
          );
        })}
      </div>
    </div>
  );
}
