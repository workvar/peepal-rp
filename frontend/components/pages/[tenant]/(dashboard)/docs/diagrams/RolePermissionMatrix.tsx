"use client";

import DiagramFrame from "./DiagramFrame";

const roles = ["Admin", "Teacher", "Student", "Staff"] as const;
const features: { label: string; perms: boolean[] }[] = [
  { label: "Manage Users / Roles",       perms: [true,  false, false, false] },
  { label: "Create Employees / Students", perms: [true,  false, false, false] },
  { label: "Mark Attendance",             perms: [true,  true,  false, true]  },
  { label: "Enter Marks",                 perms: [true,  true,  false, false] },
  { label: "View Own Profile / Marks",    perms: [true,  true,  true,  true]  },
  { label: "Apply Leave",                 perms: [true,  true,  true,  true]  },
  { label: "Approve Leave (chain)",       perms: [true,  true,  false, true]  },
  { label: "Configure Approval Flows",    perms: [true,  false, false, false] },
  { label: "Fees / Payroll",              perms: [true,  false, false, true]  },
  { label: "Reports & Analytics",         perms: [true,  false, false, false] },
];

/** Heat-map style matrix showing what each base role can do. */
export default function RolePermissionMatrix() {
  return (
    <DiagramFrame
      title="Role × Permission Matrix"
      caption="Custom roles (under Org → Roles) extend this baseline by adding fine-grained permissions on top of a base role."
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-bold">
                Capability
              </th>
              {roles.map((r) => (
                <th key={r} className="py-2 px-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-bold text-center">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((f, i) => (
              <tr key={i} className="hover:bg-muted/30">
                <td className="py-2 px-3 border-b border-border/50 text-foreground">{f.label}</td>
                {f.perms.map((p, j) => (
                  <td key={j} className="py-2 px-3 border-b border-border/50 text-center">
                    {p ? (
                      <span className="inline-block w-7 h-7 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 text-xs font-bold leading-7">✓</span>
                    ) : (
                      <span className="inline-block w-7 h-7 rounded-md bg-muted/40 text-muted-foreground text-xs font-bold leading-7">·</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DiagramFrame>
  );
}
