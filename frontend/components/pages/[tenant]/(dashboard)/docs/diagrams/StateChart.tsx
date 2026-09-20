"use client";

import DiagramFrame from "./DiagramFrame";

/** Donut chart of the Redux store layout. */
export default function StateChart() {
  const slices = [
    { label: "auth",         pct: 18, color: "#3b82f6" },
    { label: "tenant",       pct: 8,  color: "#6366f1" },
    { label: "org",          pct: 10, color: "#8b5cf6" },
    { label: "terminology",  pct: 6,  color: "#2d7a4a" },
    { label: "notification", pct: 8,  color: "#4f9268" },
    { label: "calendar",     pct: 8,  color: "#f59e0b" },
    { label: "holiday",      pct: 6,  color: "#f97316" },
    { label: "report",       pct: 8,  color: "#10b981" },
    { label: "subscription", pct: 8,  color: "#14b8a6" },
    { label: "timetable",    pct: 6,  color: "#06b6d4" },
    { label: "hostel",       pct: 5,  color: "#0ea5e9" },
    { label: "transport",    pct: 5,  color: "#22c55e" },
    { label: "library",      pct: 4,  color: "#84cc16" },
  ];

  let cumulative = 0;
  const radius = 72;
  const inner = 44;
  const cx = 110, cy = 110;

  const arcs = slices.map((s) => {
    const start = cumulative;
    cumulative += s.pct;
    const end = cumulative;

    const a0 = (start / 100) * Math.PI * 2 - Math.PI / 2;
    const a1 = (end / 100) * Math.PI * 2 - Math.PI / 2;

    const x0 = cx + radius * Math.cos(a0);
    const y0 = cy + radius * Math.sin(a0);
    const x1 = cx + radius * Math.cos(a1);
    const y1 = cy + radius * Math.sin(a1);

    const xi0 = cx + inner * Math.cos(a0);
    const yi0 = cy + inner * Math.sin(a0);
    const xi1 = cx + inner * Math.cos(a1);
    const yi1 = cy + inner * Math.sin(a1);

    const large = end - start > 50 ? 1 : 0;

    return {
      ...s,
      d: `M ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${inner} ${inner} 0 ${large} 0 ${xi0} ${yi0} Z`,
    };
  });

  return (
    <DiagramFrame
      title="Redux Store Composition"
      caption="Slices that survived the GraphQL migration. Per-feature data (employees, students, marks, leaves, …) now lives in Apollo's normalised cache instead of Redux."
    >
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-center">
        <svg viewBox="0 0 220 220" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
          {arcs.map((a) => (
            <path key={a.label} d={a.d} fill={a.color} fillOpacity="0.85" stroke="white" strokeWidth="1" />
          ))}
          <text x={cx} y={cy - 4} textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="700">store</text>
          <text x={cx} y={cy + 12} textAnchor="middle" className="fill-foreground" fontSize="10" opacity="0.7">{slices.length} slices</text>
        </svg>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
          {slices.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
              <span className="font-mono text-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </DiagramFrame>
  );
}
