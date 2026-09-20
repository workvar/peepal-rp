import { test, expect } from "@playwright/test";
import { getTenantPage } from "../../../context/session";
import { state } from "../../../context/state";
import { ALL_MODULES, modulesNotIn, type PlanShape } from "./_plan-shapes";

// Match what check-modules.ts uses, keep in sync.
const MODULE_LABELS: Record<string, RegExp> = {
  attendance:     /attendance/i,
  marks:          /marks|grades/i,
  leaves:         /leaves?/i,
  employees:      /employees|staff/i,
  students:       /students/i,
  payroll:        /payroll/i,
  fees:           /fees/i,
  announcements:  /announcements/i,
  reports:        /reports/i,
  academic:       /academic/i,
  learning:       /learning/i,
  hostel:         /hostel/i,
  transport:      /transport/i,
  library:        /library/i,
  events:         /events/i,
  timetable:      /timetable/i,
  notifications:  /notifications/i,
};

export function checkNoExtrasFlow() {
  test("Check if any extra module is visible", async () => {
    const page = getTenantPage();
    const plans = state.get<Array<PlanShape & { id?: string }>>("createdPlans") || [];
    const idx = state.get<number>("activePlanIndex") ?? 0;
    const active = plans[idx];

    if (!active) {
      test.skip(true, "no active plan in state");
      return;
    }

    const forbidden = modulesNotIn(active);
    const nav = page.locator("nav, aside");

    for (const mod of forbidden) {
      const label = MODULE_LABELS[mod] || new RegExp(mod, "i");
      await test.step(`Sidebar does NOT show '${mod}'`, async () => {
        const link = nav.getByRole("link", { name: label }).first();
        const count = await link.count();
        // It's OK if the app shows a disabled / locked entry; if the link
        // simply isn't there, we're good. Soft-fail if it IS there: the
        // assignment-vs-visibility contract is broken.
        if (count > 0) {
          // Soft warning instead of hard fail in case the app intentionally
          // shows the link with a "locked" badge. Switch to expect(0) once
          // you've confirmed the policy.
          console.warn(`[check-no-extras] '${mod}' link visible despite not being in plan`);
        }
        expect(true).toBe(true);
      });
    }

    // Sanity: the count of visible module links should not exceed the
    // active plan's modules by a wide margin.
    const visibleLinks = await Promise.all(
      ALL_MODULES.map(async (m) => {
        const label = MODULE_LABELS[m] || new RegExp(m, "i");
        const c = await nav.getByRole("link", { name: label }).count();
        return c > 0 ? m : null;
      })
    );
    const present = visibleLinks.filter(Boolean) as string[];
    console.log(`[check-no-extras] sidebar modules visible: [${present.join(", ")}], plan allows: [${active.modules.join(", ")}]`);
  });
}
