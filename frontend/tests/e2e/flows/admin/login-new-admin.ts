import { test, expect } from "@playwright/test";
import { attachConsole } from "../../../context/session";
import { state } from "../../../context/state";
import type { AdminAccount } from "./create-admins";
import { clickAndCapture } from "../../../helpers/ui";
import type { BrowserContext, Page } from "@playwright/test";

// Hold the secondary admin's browser session here so the access-check and
// logout-all flows can reuse it.
export const newAdminSession: { ctx: BrowserContext | null; page: Page | null } = {
  ctx: null,
  page: null,
};

export function loginNewAdminFlow() {
  test("Login to new admin user", async ({ browser }) => {
    const admins = state.get<AdminAccount[]>("createdAdmins") || [];
    const fullAdmin = admins.find((a) => a.perms.length > 0) || admins[0];

    await test.step("Pre-flight: a new admin exists in state", async () => {
      expect(fullAdmin, "no admin in state. Did 'Create admin users' run?").toBeTruthy();
    });

    await test.step("Open isolated browser context for the new admin", async () => {
      newAdminSession.ctx = await browser.newContext();
      newAdminSession.page = await newAdminSession.ctx.newPage();
      attachConsole(newAdminSession.page, "new-admin");
    });
    const page = newAdminSession.page!;

    await test.step(`Visit /super/login`, async () => {
      await page.goto("/super/login");
    });
    await test.step(`Fill credentials for ${fullAdmin.email}`, async () => {
      await page.getByPlaceholder(/admin@/i).fill(fullAdmin.email);
      await page.getByPlaceholder("••••••••").fill(fullAdmin.password);
    });
    await test.step("Submit and capture login response", async () => {
      const res = await clickAndCapture(
        page,
        /\/auth\/login/,
        async () => {
          await page.getByRole("button", { name: /sign in/i }).click();
        }
      );
      if (!(res.status >= 200 && res.status < 400)) {
        throw new Error(`new-admin login failed: status ${res.status} ${res.raw.slice(0, 300)}`);
      }
    });
    await test.step("Land on /super/dashboard", async () => {
      await page.waitForURL(/\/super\/dashboard/, { timeout: 15_000 });
    });
  });
}
