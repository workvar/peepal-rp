"use client";

import DiagramFrame from "./DiagramFrame";

/** End-to-end flow of how a brand-new institute onboards. */
export default function UserOnboardingFlow() {
  const steps = [
    { c: "#3b82f6", title: "Super Admin",  sub: "creates Tenant + Plan" },
    { c: "#6366f1", title: "Org Admin",    sub: "logs in to /[tenant]/login" },
    { c: "#8b5cf6", title: "Org Profile",  sub: "name, logo, theme, terminology" },
    { c: "#2d7a4a", title: "Departments",  sub: "+ Academic Years + Holidays" },
    { c: "#4f9268", title: "Users",        sub: "create teachers, students, staff" },
    { c: "#10b981", title: "Modules",      sub: "attendance, marks, leaves go live" },
  ];

  return (
    <DiagramFrame
      title="Institute Onboarding Flow"
      caption="The recommended order for a new institute. Roles, departments and academic years are pre-requisites for most other modules."
    >
      <svg viewBox="0 0 880 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <defs>
          <marker id="ob-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
          </marker>
        </defs>
        {steps.map((s, i) => {
          const x = 20 + i * 145;
          return (
            <g key={i}>
              <circle cx={x + 50} cy="80" r="36" fill={s.c} fillOpacity="0.15" stroke={s.c} strokeOpacity="0.55" />
              <text x={x + 50} y="74" textAnchor="middle" className="fill-foreground" fontSize="13" fontWeight="700">{i + 1}</text>
              <text x={x + 50} y="92" textAnchor="middle" className="fill-foreground" fontSize="10" opacity="0.85">step</text>
              <text x={x + 50} y="138" textAnchor="middle" className="fill-foreground" fontSize="12" fontWeight="700">{s.title}</text>
              <text x={x + 50} y="156" textAnchor="middle" className="fill-foreground" fontSize="11" opacity="0.75">{s.sub}</text>
              {i < steps.length - 1 && (
                <path d={`M${x + 86},80 L${x + 144},80`} stroke="currentColor" strokeOpacity="0.45" fill="none" strokeWidth="1.4" markerEnd="url(#ob-arr)" className="text-foreground" />
              )}
            </g>
          );
        })}
      </svg>
    </DiagramFrame>
  );
}
