"use client";

import DiagramFrame from "./DiagramFrame";

const steps = [
  { x: 30,  label: "User action", sub: "Click / form submit", color: "#3b82f6" },
  { x: 200, label: "Redux / Apollo", sub: "Dispatch / mutation", color: "#6366f1" },
  { x: 370, label: "axios / link", sub: "+ JWT header", color: "#8b5cf6" },
  { x: 540, label: "Fiber router", sub: "/api/v1/...", color: "#10b981" },
  { x: 710, label: "Middleware", sub: "Authenticate · tenant", color: "#14b8a6" },
];

const lower = [
  { x: 710, label: "Handler", sub: "handlers/*.go", color: "#14b8a6" },
  { x: 540, label: "GORM", sub: "models scoped by tenant_id", color: "#f59e0b" },
  { x: 370, label: "PostgreSQL", sub: "Aiven · pgx", color: "#f59e0b" },
  { x: 200, label: "APIResponse", sub: "{success,data,message,error}", color: "#8b5cf6" },
  { x: 30,  label: "UI re-renders", sub: "Selector / cache update", color: "#3b82f6" },
];

/** Top-to-bottom sequence of a single API call from click to UI update. */
export default function RequestLifecycle() {
  return (
    <DiagramFrame
      title="Request Lifecycle"
      caption="One round trip: a user action travels right across the top, through the Go API and back along the bottom row to update the UI."
    >
      <svg viewBox="0 0 880 320" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <defs>
          <marker id="rl-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
          </marker>
        </defs>

        {steps.map((s, i) => (
          <g key={`top-${i}`}>
            <rect x={s.x} y="40" width="140" height="62" rx="10" fill={s.color} fillOpacity="0.12" stroke={s.color} strokeOpacity="0.45" />
            <text x={s.x + 70} y="68" textAnchor="middle" className="fill-foreground" fontSize="12" fontWeight="700">{s.label}</text>
            <text x={s.x + 70} y="86" textAnchor="middle" className="fill-foreground" fontSize="10" opacity="0.75">{s.sub}</text>
          </g>
        ))}

        <g fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.4" className="text-foreground">
          {steps.slice(0, -1).map((s, i) => (
            <path key={`arr-top-${i}`} d={`M${s.x + 140},71 L${steps[i + 1].x},71`} markerEnd="url(#rl-arr)" />
          ))}
        </g>

        {/* Bend down */}
        <g fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.4" className="text-foreground">
          <path d="M850,102 L850,160 L780,160" markerEnd="url(#rl-arr)" />
        </g>

        {lower.map((s, i) => (
          <g key={`bot-${i}`}>
            <rect x={s.x} y="200" width="140" height="62" rx="10" fill={s.color} fillOpacity="0.12" stroke={s.color} strokeOpacity="0.45" />
            <text x={s.x + 70} y="228" textAnchor="middle" className="fill-foreground" fontSize="12" fontWeight="700">{s.label}</text>
            <text x={s.x + 70} y="246" textAnchor="middle" className="fill-foreground" fontSize="10" opacity="0.75">{s.sub}</text>
          </g>
        ))}

        <g fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.4" className="text-foreground">
          {lower.slice(0, -1).map((s, i) => (
            <path key={`arr-bot-${i}`} d={`M${s.x},231 L${lower[i + 1].x + 140},231`} markerEnd="url(#rl-arr)" />
          ))}
        </g>
      </svg>
    </DiagramFrame>
  );
}
