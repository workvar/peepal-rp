import { test, expect } from "@playwright/test";
import { superSession, tenantSession } from "../../../context/session";

export function superLogoutFlow() {
  test("Logout", async () => {
    await test.step("Clear super admin session", async () => {
      const page = superSession.page;
      if (page) {
        await page.evaluate(() => localStorage.clear()).catch(() => {});
        await page.goto("/super/login");
        await expect(page).toHaveURL(/\/super\/login/);
      }
    });
    await test.step("Close all browser contexts", async () => {
      if (superSession.context) {
        try { await superSession.context.close(); } catch { /* ignore */ }
        superSession.context = null;
        superSession.page = null;
      }
      if (tenantSession.context) {
        try { await tenantSession.context.close(); } catch { /* ignore */ }
        tenantSession.context = null;
        tenantSession.page = null;
      }
    });
  });
}
