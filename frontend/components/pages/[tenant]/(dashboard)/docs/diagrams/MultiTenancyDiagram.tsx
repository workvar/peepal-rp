"use client";

import DiagramFrame from "./DiagramFrame";

/** Visualises tenant isolation: one DB, every row scoped by tenant_id. */
export default function MultiTenancyDiagram() {
  return (
    <DiagramFrame
      title="Multi-Tenancy (shared schema, scoped rows)"
      caption="A single PostgreSQL database (Aiven-managed) serves every institute. Each row carries tenant_id and middleware injects the active tenant scope on every query."
    >
      <svg viewBox="0 0 880 320" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        {[
          { x: 30,  color: "#3b82f6", label: "/iit-bombay",  name: "IIT Bombay" },
          { x: 230, color: "#10b981", label: "/nit-trichy",  name: "NIT Trichy" },
          { x: 430, color: "#f59e0b", label: "/dps-school",  name: "DPS School" },
        ].map((t) => (
          <g key={t.label}>
            <rect x={t.x} y="30" width="170" height="80" rx="12" fill={t.color} fillOpacity="0.15" stroke={t.color} strokeOpacity="0.55" />
            <text x={t.x + 85} y="60" textAnchor="middle" className="fill-foreground" fontSize="13" fontWeight="700">{t.name}</text>
            <text x={t.x + 85} y="80" textAnchor="middle" className="fill-foreground" fontSize="11" fontFamily="ui-monospace, monospace" opacity="0.85">{t.label}</text>
            <text x={t.x + 85} y="98" textAnchor="middle" className="fill-foreground" fontSize="10" opacity="0.7">tenant_id = ...</text>

            <path d={`M${t.x + 85},110 L${t.x + 85},170`} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.4" className="text-foreground" />
          </g>
        ))}

        {/* Middleware bar */}
        <rect x="30" y="170" width="570" height="44" rx="10" fill="#8b5cf6" fillOpacity="0.18" stroke="#8b5cf6" strokeOpacity="0.5" />
        <text x="315" y="198" textAnchor="middle" className="fill-foreground" fontSize="13" fontWeight="700">middleware.Tenant → injects WHERE tenant_id = ?</text>

        {/* DB */}
        <g>
          <ellipse cx="780" cy="200" rx="60" ry="14" fill="#06b6d4" fillOpacity="0.2" stroke="#06b6d4" strokeOpacity="0.5" />
          <path d="M720,200 v40 a60,14 0 0 0 120,0 v-40" fill="#06b6d4" fillOpacity="0.15" stroke="#06b6d4" strokeOpacity="0.5" />
          <text x="780" y="204" textAnchor="middle" className="fill-foreground" fontSize="12" fontWeight="700">PostgreSQL</text>
          <text x="780" y="270" textAnchor="middle" className="fill-foreground" fontSize="11" opacity="0.75">collegeerp.db (shared)</text>
        </g>

        <path d="M600,192 L720,200" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.4" className="text-foreground" />
      </svg>
    </DiagramFrame>
  );
}
