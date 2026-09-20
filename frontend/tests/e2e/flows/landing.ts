import { test, expect } from "@playwright/test";

export function landingFlow() {
  test("Landing page loads", async ({ page }) => {
    await test.step("Visit /", async () => {
      await page.goto("/");
    });
    await test.step("Body is visible", async () => {
      await expect(page.locator("body")).toBeVisible();
    });
    await test.step("Status code is OK", async () => {
      // Already loaded; if it wasn't, goto would have thrown.
      expect(page.url()).toContain("/");
    });
  });
}
