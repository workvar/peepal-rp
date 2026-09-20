import { test, expect } from "@playwright/test";
import { env } from "../../../fixtures/env";
import { superSession, attachConsole } from "../../../context/session";

export function superLoginFlow() {
  test("Login", async ({ browser }) => {
    await test.step("Open fresh browser context", async () => {
      superSession.context = await browser.newContext();
      superSession.page = await superSession.context.newPage();
      attachConsole(superSession.page, "super");
    });
    const page = superSession.page!;

    await test.step("Visit /super/login", async () => {
      await page.goto("/super/login");
    });
    await test.step("Fill super admin credentials", async () => {
      await page.getByPlaceholder(/admin@/i).fill(env.superAdmin.email);
      await page.getByPlaceholder("••••••••").fill(env.superAdmin.password);
    });
    await test.step("Submit and land on /super/dashboard", async () => {
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/super\/dashboard/, { timeout: 15_000 });
    });
    await test.step("Token persisted in localStorage", async () => {
      const token = await page.evaluate(() => localStorage.getItem("token"));
      expect(token).toBeTruthy();
    });
  });
}
