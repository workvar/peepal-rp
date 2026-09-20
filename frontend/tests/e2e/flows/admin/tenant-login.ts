import { test, expect } from "@playwright/test";
import { tenantSession, attachConsole } from "../../../context/session";
import { state } from "../../../context/state";
import { env } from "../../../fixtures/env";
import { clickAndCapture } from "../../../helpers/ui";

export function tenantLoginFlow() {
  test("Login to tenant", async ({ browser }) => {
    const orgSlug      = state.get<string>("tenantSlug")           || env.orgSlug;
    const adminEmail   = state.get<string>("tenantAdminEmail")     || env.admin.email;
    const adminPassword= state.get<string>("tenantAdminPassword")  || env.admin.password;

    await test.step("Open fresh browser context for the tenant", async () => {
      // Close any prior context cleanly.
      if (tenantSession.context) {
        try { await tenantSession.context.close(); } catch { /* ignore */ }
      }
      tenantSession.context = await browser.newContext();
      tenantSession.page = await tenantSession.context.newPage();
      attachConsole(tenantSession.page, "tenant");
    });
    const page = tenantSession.page!;

    await test.step(`Visit /login as ${adminEmail} into '${orgSlug}'`, async () => {
      await page.goto("/login");
    });
    await test.step("Fill org + admin credentials", async () => {
      await page.getByPlaceholder("your-org-name").fill(orgSlug);
      await page.getByPlaceholder("you@example.com").fill(adminEmail);
      await page.getByPlaceholder("••••••••").fill(adminPassword);
    });
    await test.step("Submit and capture login response", async () => {
      const res = await clickAndCapture(
        page,
        /\/auth\/login/,
        async () => {
          await page.getByRole("button", { name: /sign in/i }).click();
        },
        15_000
      );
      if (!(res.status >= 200 && res.status < 400)) {
        throw new Error(
          `tenant login failed: status ${res.status} ${res.raw.slice(0, 300)}\n` +
          `(org='${orgSlug}', email='${adminEmail}')`
        );
      }
    });
    await test.step("Land on /{tenant}/dashboard", async () => {
      await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    });
  });
}
