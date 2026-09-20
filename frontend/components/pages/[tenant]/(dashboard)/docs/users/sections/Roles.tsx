"use client";

import DocSection from "../../_shared/DocSection";
import RolePermissionMatrix from "../../diagrams/RolePermissionMatrix";
import Callout from "../../_shared/Callout";

const roles = [
  { name: "Admin",   color: "#3b82f6", desc: "Owns the institute. Creates users, configures modules, builds approval flows. Sees every module." },
  { name: "Teacher", color: "#2d7a4a", desc: "Marks attendance for their classes, enters marks, approves leaves of students assigned to them." },
  { name: "Student", color: "#10b981", desc: "Views their own attendance, marks, results, fee dues. Applies for leave. Reads notices." },
  { name: "Staff",   color: "#f59e0b", desc: "Non-teaching employees (HR, accounts, hostel). Access to attendance, payroll and any module their custom role grants." },
];

export default function Roles() {
  return (
    <DocSection
      id="roles"
      title="Roles & what they can do"
      description="Every user has one base role plus an optional custom role for fine-grained extras."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {roles.map((r) => (
          <div key={r.name} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
              <h4 className="text-sm font-bold text-foreground">{r.name}</h4>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>

      <RolePermissionMatrix />

      <Callout variant="tip" title="Custom roles">
        Need a 'Hostel Warden' or 'Exam Coordinator'? Go to{" "}
        <em>Org → Roles</em>, create a custom role, tick the specific
        permissions, and attach it to a user. The user keeps their base role
        and gains the extras.
      </Callout>
    </DocSection>
  );
}
