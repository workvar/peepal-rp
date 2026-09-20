"use client";

import { DiagramFrame } from "./ui";

interface Node { y: number; title: string; sub?: string; tone: string; kind: "step" | "decision" }

// Two-stage gate on every mapped root field: first the subscription module gate
// (org-wide, binds admins, only super_admin/core skip), then the per-action role
// gate (admins bypass). Green ALLOW chips and red DENY chips branch right; the
// bottom red box is the role fall-through.
const SPINE: Node[] = [
  { y: 18,  title: "GraphQL root field",       sub: "query / mutation",                 tone: "#3b82f6", kind: "step" },
  { y: 90,  title: "accessFieldMiddleware",     sub: "runs on every root field",         tone: "#64748b", kind: "step" },
  { y: 162, title: "Mapped in opAccess?",       sub: "field → (module, action)",         tone: "#f59e0b", kind: "decision" },
  { y: 240, title: "Stage 1 · enforceSubscriptionModule", sub: "is the module in the plan?", tone: "#14b8a6", kind: "step" },
  { y: 312, title: "Module enabled for tenant?", sub: "EffectiveModules",                 tone: "#f59e0b", kind: "decision" },
  { y: 390, title: "Stage 2 · enforceAccess",   sub: "role × action",                    tone: "#64748b", kind: "step" },
  { y: 462, title: "Admin / Super Admin?",      sub: "role check",                       tone: "#f59e0b", kind: "decision" },
  { y: 534, title: "Effective flags",           sub: "stored AccessRule ?? default",     tone: "#8b5cf6", kind: "step" },
  { y: 606, title: "Base role allows action?",  sub: "flags.Can(action)",                tone: "#f59e0b", kind: "decision" },
  { y: 678, title: "Linked custom role grants it?", sub: "union with custom rule",       tone: "#f59e0b", kind: "decision" },
];

// Right-hand exit chips keyed by the spine row they branch from.
const EXITS: { row: number; label: string; tone: "allow" | "deny" | "pass"; note: string }[] = [
  { row: 2, label: "Pass through", tone: "pass",  note: "unmapped" },
  { row: 4, label: "DENY",         tone: "deny",  note: "not subscribed" },
  { row: 6, label: "ALLOW",        tone: "allow", note: "bypass" },
  { row: 8, label: "ALLOW",        tone: "allow", note: "yes" },
  { row: 9, label: "ALLOW",        tone: "allow", note: "yes" },
];

const TONE = { allow: "#22c55e", deny: "#ef4444", pass: "#64748b" } as const;
const BOX_X = 60;
const BOX_W = 250;
const CX = BOX_X + BOX_W / 2;
const CHIP_X = 470;
const CHIP_W = 150;

export default function AccessEnforcementDiagram() {
  return (
    <DiagramFrame
      title="Two-Stage Enforcement (subscription gate → role gate)"
      caption="Every mapped GraphQL root field is checked twice. Stage 1 (subscription) blocks features the org didn't buy — it binds everyone including admins; only super_admin and 'core' modules skip it. Stage 2 (role) is the per-action matrix, which admins bypass. A stored AccessRule overrides the registry default, and a linked custom role can still grant a verb the base role is denied."
    >
      <svg viewBox="0 0 640 760" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <defs>
          <marker id="ace-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" className="fill-foreground" fillOpacity="0.5" />
          </marker>
          <marker id="ace-allow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
          </marker>
          <marker id="ace-deny" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
          </marker>
        </defs>

        {/* vertical spine arrows */}
        <g stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.4" className="text-foreground">
          {SPINE.slice(0, -1).map((n, i) => (
            <line key={i} x1={CX} y1={n.y + 52} x2={CX} y2={SPINE[i + 1].y} markerEnd="url(#ace-arrow)" />
          ))}
          <line x1={CX} y1={SPINE[9].y + 52} x2={CX} y2={732} markerEnd="url(#ace-arrow)" />
        </g>

        {/* exit branches */}
        {EXITS.map((e) => {
          const n = SPINE[e.row];
          const y = n.y + 26;
          const c = TONE[e.tone];
          return (
            <line key={e.row} x1={BOX_X + BOX_W} y1={y} x2={CHIP_X} y2={y}
              stroke={c} strokeOpacity="0.75" strokeWidth="1.4"
              markerEnd={`url(#ace-${e.tone === "allow" ? "allow" : e.tone === "deny" ? "deny" : "arrow"})`}
              strokeDasharray={e.tone === "pass" ? "4 3" : "0"} />
          );
        })}

        {/* spine nodes */}
        {SPINE.map((n, i) => (
          <g key={i}>
            <rect x={BOX_X} y={n.y} width={BOX_W} height={52}
              rx={n.kind === "decision" ? 26 : 10}
              fill={n.tone} fillOpacity="0.12" stroke={n.tone} strokeOpacity="0.6" />
            <text x={CX} y={n.sub ? n.y + 23 : n.y + 30} textAnchor="middle" className="fill-foreground" fontSize="12.5" fontWeight="700">{n.title}</text>
            {n.sub && <text x={CX} y={n.y + 39} textAnchor="middle" className="fill-foreground" fontSize="10" opacity="0.7" fontFamily="ui-monospace, monospace">{n.sub}</text>}
          </g>
        ))}

        {/* exit chips */}
        {EXITS.map((e) => {
          const n = SPINE[e.row];
          const c = TONE[e.tone];
          return (
            <g key={`c${e.row}`}>
              <rect x={CHIP_X} y={n.y} width={CHIP_W} height={52} rx="10" fill={c} fillOpacity="0.14" stroke={c} strokeOpacity="0.6" />
              <text x={CHIP_X + CHIP_W / 2} y={n.y + 24} textAnchor="middle" fontSize="12.5" fontWeight="800" style={{ fill: c }}>{e.label}</text>
              <text x={CHIP_X + CHIP_W / 2} y={n.y + 39} textAnchor="middle" className="fill-foreground" fontSize="9.5" opacity="0.65">{e.note}</text>
            </g>
          );
        })}

        {/* DENY terminal */}
        <g>
          <rect x={CX - 95} y={732} width={190} height={26} rx="8" fill="#ef4444" fillOpacity="0.16" stroke="#ef4444" strokeOpacity="0.6" />
          <text x={CX} y={749} textAnchor="middle" fontSize="12" fontWeight="800" fill="#ef4444">DENY · ErrForbidden (role)</text>
        </g>
      </svg>
    </DiagramFrame>
  );
}
