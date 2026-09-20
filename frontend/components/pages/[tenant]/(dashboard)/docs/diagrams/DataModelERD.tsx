"use client";

import DiagramFrame from "./DiagramFrame";

interface Box { x: number; y: number; w: number; h: number; title: string; fields: string[]; tone: string }

const boxes: Box[] = [
  { x: 30,  y: 30,  w: 180, h: 130, title: "Tenant",     tone: "#f59e0b", fields: ["id (pk)", "subdomain", "name", "plan_id"] },
  { x: 240, y: 30,  w: 180, h: 170, title: "User",       tone: "#3b82f6", fields: ["id (pk)", "tenant_id (fk)", "email", "password (bcrypt)", "role", "manager_id"] },
  { x: 450, y: 30,  w: 180, h: 130, title: "Department", tone: "#8b5cf6", fields: ["id (pk)", "tenant_id (fk)", "name"] },
  { x: 660, y: 30,  w: 200, h: 170, title: "Employee",   tone: "#10b981", fields: ["id (pk)", "user_id (fk)", "department_id (fk)", "designation", "join_date"] },
  { x: 240, y: 230, w: 180, h: 150, title: "Course",     tone: "#2d7a4a", fields: ["id (pk)", "tenant_id (fk)", "name", "code"] },
  { x: 450, y: 230, w: 180, h: 170, title: "Student",    tone: "#06b6d4", fields: ["id (pk)", "user_id (fk)", "course_id (fk)", "roll_number", "semester"] },
  { x: 30,  y: 230, w: 180, h: 170, title: "Attendance", tone: "#22c55e", fields: ["id (pk)", "user_id (fk)", "date", "status (P/A/L/H)"] },
  { x: 660, y: 230, w: 200, h: 170, title: "Mark",       tone: "#ef4444", fields: ["id (pk)", "student_id (fk)", "subject_id (fk)", "marks", "grade"] },
];

const links: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 3], [1, 6], [1, 5], [4, 5], [5, 7],
];

/** Entity-relationship diagram of the core tenant-scoped tables. */
export default function DataModelERD() {
  return (
    <DiagramFrame
      title="Core Data Model (ERD)"
      caption="Every business table carries a tenant_id. Users are the join point for both Employees and Students; everything else hangs off those."
    >
      <svg viewBox="0 0 900 430" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <g fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.3" className="text-foreground">
          {links.map(([a, b], i) => {
            const ax = boxes[a].x + boxes[a].w / 2;
            const ay = boxes[a].y + boxes[a].h / 2;
            const bx = boxes[b].x + boxes[b].w / 2;
            const by = boxes[b].y + boxes[b].h / 2;
            return <path key={i} d={`M${ax},${ay} L${bx},${by}`} />;
          })}
        </g>

        {boxes.map((b) => (
          <g key={b.title}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="10" fill={b.tone} fillOpacity="0.1" stroke={b.tone} strokeOpacity="0.55" />
            <rect x={b.x} y={b.y} width={b.w} height="26" rx="10" fill={b.tone} fillOpacity="0.32" />
            <text x={b.x + b.w / 2} y={b.y + 17} textAnchor="middle" className="fill-foreground" fontSize="12" fontWeight="800">{b.title}</text>
            {b.fields.map((f, i) => (
              <text key={i} x={b.x + 12} y={b.y + 44 + i * 16} className="fill-foreground" fontSize="10.5" fontFamily="ui-monospace, monospace" opacity="0.85">
                {f}
              </text>
            ))}
          </g>
        ))}
      </svg>
    </DiagramFrame>
  );
}
