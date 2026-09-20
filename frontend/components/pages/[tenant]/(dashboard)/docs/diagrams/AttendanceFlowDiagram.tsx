"use client";

import DiagramFrame from "./DiagramFrame";

/** How an attendance entry travels from the teacher's screen to a report. */
export default function AttendanceFlowDiagram() {
  return (
    <DiagramFrame
      title="Attendance — End to End"
      caption="A teacher marks a class, the API stores per-user records, and the same data feeds three views: summary, shortage and exports."
    >
      <svg viewBox="0 0 880 280" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <defs>
          <marker id="at-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
          </marker>
        </defs>

        <g>
          <rect x="30" y="100" width="160" height="60" rx="10" fill="#3b82f6" fillOpacity="0.15" stroke="#3b82f6" strokeOpacity="0.55" />
          <text x="110" y="125" textAnchor="middle" className="fill-foreground" fontSize="12" fontWeight="700">Teacher screen</text>
          <text x="110" y="145" textAnchor="middle" className="fill-foreground" fontSize="11" opacity="0.8">Bulk mark / per-row</text>
        </g>

        <g>
          <rect x="240" y="100" width="160" height="60" rx="10" fill="#8b5cf6" fillOpacity="0.15" stroke="#8b5cf6" strokeOpacity="0.55" />
          <text x="320" y="125" textAnchor="middle" className="fill-foreground" fontSize="12" fontWeight="700">/api/v1/attendance</text>
          <text x="320" y="145" textAnchor="middle" className="fill-foreground" fontSize="11" opacity="0.8">handler upserts rows</text>
        </g>

        <g>
          <rect x="450" y="100" width="160" height="60" rx="10" fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeOpacity="0.55" />
          <text x="530" y="125" textAnchor="middle" className="fill-foreground" fontSize="12" fontWeight="700">attendance table</text>
          <text x="530" y="145" textAnchor="middle" className="fill-foreground" fontSize="11" opacity="0.8">user_id · date · status</text>
        </g>

        {/* Three downstream consumers */}
        {[
          { x: 660, y: 30,  c: "#f59e0b", title: "Summary view",     sub: "/(dashboard)/attendance/summary" },
          { x: 660, y: 110, c: "#ef4444", title: "Shortage list",    sub: "auto-flag below %" },
          { x: 660, y: 190, c: "#06b6d4", title: "Exports / reports", sub: "CSV + analytics" },
        ].map((d) => (
          <g key={d.title}>
            <rect x={d.x} y={d.y} width="200" height="60" rx="10" fill={d.c} fillOpacity="0.15" stroke={d.c} strokeOpacity="0.55" />
            <text x={d.x + 100} y={d.y + 25} textAnchor="middle" className="fill-foreground" fontSize="12" fontWeight="700">{d.title}</text>
            <text x={d.x + 100} y={d.y + 45} textAnchor="middle" className="fill-foreground" fontSize="11" opacity="0.8">{d.sub}</text>
          </g>
        ))}

        <g fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.4" className="text-foreground">
          <path d="M190,130 L240,130" markerEnd="url(#at-arr)" />
          <path d="M400,130 L450,130" markerEnd="url(#at-arr)" />
          <path d="M610,130 L660,60"  markerEnd="url(#at-arr)" />
          <path d="M610,130 L660,140" markerEnd="url(#at-arr)" />
          <path d="M610,130 L660,220" markerEnd="url(#at-arr)" />
        </g>
      </svg>
    </DiagramFrame>
  );
}
