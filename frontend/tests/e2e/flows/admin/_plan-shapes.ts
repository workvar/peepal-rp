// Plan definitions used by the "various plans" + "loop subscriptions" flows.
// Module names mirror frontend ALL_MODULES so visibility checks line up
// with the tenant sidebar.

export interface PlanShape {
  name: string;
  modules: string[];   // modules the plan grants access to
  uniqueLabel: string; // suffix to keep names unique across runs
}

const TS = Date.now().toString(36);

export const ALL_MODULES = [
  "attendance", "marks", "leaves", "employees", "students",
  "payroll", "fees", "announcements", "reports", "academic",
  "learning", "hostel", "transport", "library", "events",
  "timetable", "notifications",
];

export const PLAN_SHAPES: PlanShape[] = [
  {
    name: `E2E Basic ${TS}`,
    modules: ["attendance", "students", "announcements"],
    uniqueLabel: TS,
  },
  {
    name: `E2E Pro ${TS}`,
    modules: ["attendance", "students", "announcements", "marks", "leaves", "employees", "reports"],
    uniqueLabel: TS,
  },
];

/** Modules that are NEVER granted by any e2e plan, used for "extras" checks. */
export function modulesNotIn(shape: PlanShape): string[] {
  return ALL_MODULES.filter((m) => !shape.modules.includes(m));
}
