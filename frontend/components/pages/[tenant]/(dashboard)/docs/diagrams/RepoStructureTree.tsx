"use client";

import DiagramFrame from "./DiagramFrame";
import { Folder, FileCode } from "lucide-react";

const tree: { depth: number; name: string; type: "dir" | "file"; note?: string }[] = [
  { depth: 0, name: "Peepal/",           type: "dir" },
  { depth: 1, name: "backend/",            type: "dir", note: "Go Fiber API" },
  { depth: 2, name: "main.go",             type: "file", note: "entry · seeds super-admin" },
  { depth: 2, name: "config/",             type: "dir", note: "env loader" },
  { depth: 2, name: "database/",           type: "dir", note: "GORM connect + Migrate" },
  { depth: 2, name: "models/",             type: "dir", note: "User, Student, Employee, Mark, Leave …" },
  { depth: 2, name: "handlers/",           type: "dir", note: "HTTP handlers per module" },
  { depth: 2, name: "middleware/",         type: "dir", note: "auth.go (JWT) · tenant.go" },
  { depth: 2, name: "routes/routes.go",    type: "file", note: "single registration point" },
  { depth: 2, name: "graph/",              type: "dir", note: "gqlgen GraphQL schema + resolvers" },
  { depth: 2, name: "utils/",              type: "dir", note: "APIResponse, JWT helpers" },
  { depth: 1, name: "frontend/",           type: "dir", note: "Next.js 14 App Router" },
  { depth: 2, name: "app/[tenant]/(dashboard)/", type: "dir", note: "tenant-scoped pages" },
  { depth: 2, name: "app/(super-admin)/",  type: "dir", note: "platform owner area" },
  { depth: 2, name: "components/pages/",   type: "dir", note: "actual page bodies (small files)" },
  { depth: 2, name: "components/ui/",      type: "dir", note: "Card, Modal, PageHeader, …" },
  { depth: 2, name: "components/layout/",  type: "dir", note: "TopBar, Sidebar, Providers" },
  { depth: 2, name: "store/",              type: "dir", note: "Redux Toolkit slices" },
  { depth: 2, name: "lib/api.ts",          type: "file", note: "axios + JWT interceptor" },
  { depth: 2, name: "lib/apollo.ts",       type: "file", note: "Apollo client" },
  { depth: 2, name: "graphql/",            type: "dir", note: "queries / mutations" },
  { depth: 2, name: "constants/",          type: "dir", note: "navigation, terminology, theme" },
];

/** Visual file-tree of the most important directories. */
export default function RepoStructureTree() {
  return (
    <DiagramFrame
      title="Repository Layout"
      caption="The codebase is intentionally split into many small files — every page has a thin app-router file that re-exports from components/pages."
    >
      <ul className="font-mono text-[13px] leading-7">
        {tree.map((n, i) => (
          <li
            key={i}
            className="flex items-start gap-2"
            style={{ paddingLeft: `${n.depth * 18}px` }}
          >
            {n.type === "dir" ? (
              <Folder size={14} className="mt-1.5 text-amber-500 shrink-0" />
            ) : (
              <FileCode size={14} className="mt-1.5 text-blue-500 shrink-0" />
            )}
            <span className="text-foreground">{n.name}</span>
            {n.note && (
              <span className="text-muted-foreground text-xs italic ml-2">— {n.note}</span>
            )}
          </li>
        ))}
      </ul>
    </DiagramFrame>
  );
}
