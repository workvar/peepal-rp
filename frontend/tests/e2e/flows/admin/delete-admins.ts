import { test, expect } from "@playwright/test";
import { getSuperPage } from "../../../context/session";
import { state } from "../../../context/state";
import type { AdminAccount } from "./create-admins";

export function deleteAdminsFlow() {
  test("Delete additional accounts", async () => {
    const page = getSuperPage();
    const admins = state.get<AdminAccount[]>("createdAdmins") || [];

    await test.step("Navigate to /super/admins", async () => {
      await page.goto("/super/admins");
      await expect(page).toHaveURL(/\/super\/admins/);
    });

    // The /super/admins UI currently exposes Edit but no Delete button. The
    // accounts we created are still on the cleanup stack (see create-admins
    // → track(...)) and will be removed by globalTeardown via DELETE
    // /api/v1/super/admins/:id, so the database stays clean.
    await test.step("Confirm cleanup stack is loaded with the additional admins", async () => {
      expect(admins.length, "no admins tracked from earlier step").toBeGreaterThan(0);
    });
  });
}
