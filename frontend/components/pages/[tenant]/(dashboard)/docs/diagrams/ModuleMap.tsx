"use client";

import DiagramFrame from "./DiagramFrame";

const groups = [
  { title: "People",         color: "#3b82f6", items: ["Users", "Employees", "Students", "Org Structure"] },
  { title: "Academics",      color: "#2d7a4a", items: ["Marks", "Results", "Subjects", "Exams", "Timetable"] },
  { title: "Operations",     color: "#10b981", items: ["Attendance", "Summary", "Shortage", "Leaves", "Approvals"] },
  { title: "Finance",        color: "#f97316", items: ["Payroll", "Salary Templates", "Fees", "Fee Dues", "Categories"] },
  { title: "Campus",         color: "#14b8a6", items: ["Hostel", "Transport", "Library", "Events"] },
  { title: "Communication",  color: "#4f9268", items: ["Notices", "Notifications"] },
  { title: "Administration", color: "#6366f1", items: ["Org Profile", "Departments", "Academic Years", "Roles", "Holidays"] },
  { title: "Reports",        color: "#0ea5e9", items: ["Attendance", "Marks", "Fees", "Payroll", "Leaves"] },
];

/** Visual map of every module grouped by domain. */
export default function ModuleMap() {
  return (
    <DiagramFrame
      title="Module Map"
      caption="Every tile on the dashboard maps to a directory under app/[tenant]/(dashboard) and a Go handler under backend/handlers."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {groups.map((g) => (
          <div
            key={g.title}
            className="rounded-xl border p-3"
            style={{ borderColor: `${g.color}55`, background: `${g.color}0F` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ background: g.color }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: g.color }}>
                {g.title}
              </span>
            </div>
            <ul className="space-y-1">
              {g.items.map((it) => (
                <li key={it} className="text-xs text-foreground/85">
                  · {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </DiagramFrame>
  );
}
