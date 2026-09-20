"use client";

import {
  Users, BarChart2, Settings, CreditCard, Building,
  CheckSquare, Square,
} from "lucide-react";

// ── Permission definitions ─────────────────────────────────────────────────

export interface Permission {
  key: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  group: string;
}

export const ALL_PERMISSIONS: Permission[] = [
  { key: "manage_tenants",       label: "Manage Clients",       desc: "Create, edit, suspend, and delete tenant organisations",              icon: Building,   group: "Platform" },
  { key: "manage_plans",         label: "Manage Plans",         desc: "Create and configure subscription plans and pricing",                 icon: CreditCard, group: "Platform" },
  { key: "manage_subscriptions", label: "Manage Subscriptions", desc: "Activate, pause, and transfer subscriptions across tenants",          icon: CreditCard, group: "Platform" },
  { key: "view_reports",         label: "View Reports",         desc: "Access platform-wide analytics, revenue, and usage dashboards",        icon: BarChart2,  group: "Analytics" },
  { key: "manage_super_admins",  label: "Manage Admins",        desc: "Create, deactivate, and update other super admin accounts",           icon: Users,      group: "Access" },
  { key: "system_settings",      label: "System Settings",      desc: "Configure platform-level settings, integrations, and feature flags",  icon: Settings,   group: "Access" },
];

// ── Permission helpers ─────────────────────────────────────────────────────

export function parsePerms(json: string): string[] {
  try { return JSON.parse(json) as string[]; } catch { return []; }
}

export function serializePerms(perms: string[]): string {
  return JSON.stringify(perms);
}

// ── Permission checkbox row ────────────────────────────────────────────────

function PermRow({ perm, checked, onToggle }: { perm: Permission; checked: boolean; onToggle: () => void }) {
  const Icon = perm.icon;
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={`perm-row ${checked ? "checked" : ""}`}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150"
        style={{
          background: checked
            ? "rgba(31,93,54,0.20)"
            : "rgb(var(--muted))",
          border: checked ? "1px solid rgba(31,93,54,0.35)" : "1px solid transparent",
        }}
      >
        <Icon size={15} style={{ color: checked ? "#1f5d36" : "rgb(var(--muted-foreground))" }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{perm.label}</p>
          {checked
            ? <CheckSquare size={14} style={{ color: "#1f5d36" }} className="shrink-0" />
            : <Square size={14} className="text-muted-foreground shrink-0" />
          }
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{perm.desc}</p>
      </div>
    </div>
  );
}

// ── Permission groups ─────────────────────────────────────────────────────

export function PermissionPanel({ selected, onChange }: {
  selected: string[];
  onChange: (keys: string[]) => void;
}) {
  const groups = ALL_PERMISSIONS.map((p) => p.group).filter((g, i, arr) => arr.indexOf(g) === i);
  const toggle = (key: string) =>
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  const selectAll = () => onChange(ALL_PERMISSIONS.map((p) => p.key));
  const clearAll  = () => onChange([]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Permissions
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={selectAll} className="btn btn-ghost btn-xs text-xs">
            All
          </button>
          <button type="button" onClick={clearAll} className="btn btn-ghost btn-xs text-xs">
            None
          </button>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group} className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 ml-1">
            {group}
          </p>
          <div className="space-y-2">
            {ALL_PERMISSIONS.filter((p) => p.group === group).map((perm) => (
              <PermRow
                key={perm.key}
                perm={perm}
                checked={selected.includes(perm.key)}
                onToggle={() => toggle(perm.key)}
              />
            ))}
          </div>
        </div>
      ))}

      {selected.length === 0 && (
        <p className="text-xs text-muted-foreground italic mt-1">
          ⚠ No permissions selected — this admin will have read-only access.
        </p>
      )}
    </div>
  );
}
