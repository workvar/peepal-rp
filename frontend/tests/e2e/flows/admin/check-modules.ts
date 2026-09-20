import { test, expect } from "@playwright/test";
import { getTenantPage } from "../../../context/session";
import { state } from "../../../context/state";
import type { PlanShape } from "./_plan-shapes";

// Map module slug -> matcher for the sidebar nav link.
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

export function checkAssignedModulesFlow() {
  test("Check all modules if they are visible that were assigned", async () => {
    const page = getTenantPage();
    const plans = state.get<Array<PlanShape & { id?: string }>>("createdPlans") || [];
    const idx = state.get<number>("activePlanIndex") ?? 0;
    const active = plans[idx];

    if (!active) {
      test.skip(true, "no active plan in state");
      return;
    }

    await test.step(`Go to dashboard`, async () => {
      await page.goto(page.url().replace(/\/[^/]+$/, "/dashboard"));
      await expect(page).toHaveURL(/\/dashboard/);
    });

    // For each module in the active plan, assert a sidebar link is visible.
    for (const mod of active.modules) {
      const label = MODULE_LABELS[mod] || new RegExp(mod, "i");
      await test.step(`Sidebar shows '${mod}'`, async () => {
        const link = page.locator("nav, aside").getByRole("link", { name: label }).first();
        const count = await link.count();
        expect(count, `expected sidebar link for module '${mod}'`).toBeGreaterThan(0);
      });
    }
  });
}
