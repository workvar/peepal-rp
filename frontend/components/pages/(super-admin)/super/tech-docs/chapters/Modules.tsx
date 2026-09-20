"use client";

import { DocSection, ModuleMap, AttendanceFlowDiagram, Callout } from "../ui";
import { MODULES, TABLES } from "../../db-visualizer/schema";

/** Chapter 10 — the functional modules and how they map to tables. */
export default function Modules() {
  return (
    <DocSection
      eyebrow="Chapter 10"
      title="Modules Reference"
      description="Each functional area is a module: a set of related tables, resolvers and frontend pages. Frontend pages live under components/pages and are imported into thin route files."
    >
      <ModuleMap />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {MODULES.map((m) => {
          const count = TABLES.filter((t) => t.module === m.name).length;
          return (
            <div key={m.name} className="rounded-lg border border-border bg-card px-3 py-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} />
              <span className="text-sm font-semibold text-foreground flex-1">{m.name}</span>
              <span className="text-xs text-muted-foreground">{count} tables</span>
            </div>
          );
        })}
      </div>

      <h3 className="text-base font-bold text-foreground mt-2">Example: the attendance flow</h3>
      <p className="text-sm text-foreground/85 leading-relaxed">
        A representative module. Attendance can be marked individually or in bulk for students and
        employees; settings define the minimum percentage and a lock window after which records
        freeze.
      </p>
      <AttendanceFlowDiagram />

      <Callout variant="tip" title="Frontend file convention">
        Components live first in <code className="font-mono text-xs">/components</code> and are
        imported into the route. Keep files small and split logic into multiple files — a route
        page is usually a one-line re-export of its Page component.
      </Callout>
    </DocSection>
  );
}
