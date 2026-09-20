"use client";

import DiagramFrame from "./DiagramFrame";

/** Visual representation of a multi-step approval chain. */
export default function ApprovalFlowDiagram() {
  return (
    <DiagramFrame
      title="Approval Engine"
      caption="Each request type (leave, expense, …) maps to a chain. Steps can target specific users, managers, or roles. The engine resolves the next assignee dynamically."
    >
      <svg viewBox="0 0 880 240" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <defs>
          <marker id="ap-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
          </marker>
        </defs>

        {[
          { x: 30,  c: "#3b82f6", title: "Submitted",   sub: "Student / Employee" },
          { x: 220, c: "#f59e0b", title: "Step 1",      sub: "Class Teacher / Manager" },
          { x: 410, c: "#f59e0b", title: "Step 2",      sub: "HOD" },
          { x: 600, c: "#10b981", title: "Step 3",      sub: "Admin" },
          { x: 790, c: "#10b981", title: "Approved",    sub: "Notify requester" },
        ].map((s) => (
          <g key={s.x}>
            <rect x={s.x} y="80" width="150" height="78" rx="12" fill={s.c} fillOpacity="0.15" stroke={s.c} strokeOpacity="0.55" />
            <text x={s.x + 75} y="110" textAnchor="middle" className="fill-foreground" fontSize="13" fontWeight="700">{s.title}</text>
            <text x={s.x + 75} y="130" textAnchor="middle" className="fill-foreground" fontSize="11" opacity="0.8">{s.sub}</text>
          </g>
        ))}

        <g fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" className="text-foreground">
          <path d="M180,119 L220,119" markerEnd="url(#ap-arr)" />
          <path d="M370,119 L410,119" markerEnd="url(#ap-arr)" />
          <path d="M560,119 L600,119" markerEnd="url(#ap-arr)" />
          <path d="M750,119 L790,119" markerEnd="url(#ap-arr)" />
        </g>

        {/* Reject branch */}
        <g fill="none" stroke="#ef4444" strokeOpacity="0.6" strokeWidth="1.4" strokeDasharray="4 4" className="text-foreground">
          <path d="M295,158 L295,200 L80,200 L80,158" />
        </g>
        <text x="190" y="216" className="fill-foreground" fontSize="11" opacity="0.8">on reject → notify requester, mark Rejected</text>
      </svg>
    </DiagramFrame>
  );
}
