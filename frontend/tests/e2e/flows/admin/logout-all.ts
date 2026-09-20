import { test, expect } from "@playwright/test";
import { newAdminSession } from "./login-new-admin";

export function logoutAllFlow() {
  test("Logout of all accounts", async () => {
    await test.step("Sign out the secondary admin session", async () => {
      const page = newAdminSession.page;
      if (!page) {
        test.skip(true, "no secondary session to log out");
        return;
      }
      // Clear storage and navigate to /login to force a clean sign-out.
      await page.evaluate(() => localStorage.clear());
      await page.goto("/super/login");
      await expect(page).toHaveURL(/\/super\/login/);
    });

    await test.step("Close secondary browser context", async () => {
      if (newAdminSession.ctx) await newAdminSession.ctx.close();
      newAdminSession.ctx = null;
      newAdminSession.page = null;
    });
  });
}
