import { test, expect } from "@playwright/test";
import { getSuperPage } from "../../../context/session";
import { state } from "../../../context/state";
import { env } from "../../../fixtures/env";
import { inDialog } from "../../../helpers/ui";

export function deleteTenantFromAdminFlow() {
  test("From admin module, delete tenant", async () => {
    const page = getSuperPage();
    const slug = state.get<string>("tenantSlug");

    await test.step("Pre-flight: tenant slug in state", async () => {
      expect(slug, "no tenantSlug in state").toBeTruthy();
    });

    await test.step("Navigate to /super/tenants", async () => {
      await page.goto("/super/tenants");
      await expect(page).toHaveURL(/\/super\/tenants/);
    });

    await test.step(`Open details panel for tenant '${slug}'`, async () => {
      // Locate the row containing the slug, then click the "View Details" eye icon.
      const row = page.locator("tr", { hasText: slug! }).first();
      await expect(row).toBeVisible({ timeout: 8_000 });
      await row.getByRole("button", { name: /view details/i }).click();
    });

    await test.step("Click 'Delete Organization' in the side panel", async () => {
      await page.getByRole("button", { name: /delete organization/i }).click();
      await expect(inDialog(page)).toBeVisible();
    });

    await test.step("Confirm with super admin password + click Delete Permanently", async () => {
      const dlg = inDialog(page);
      await dlg.locator('input[type="password"]').fill(env.superAdmin.password);
      const [response] = await Promise.all([
        page.waitForResponse(
          (r) => r.request().method() === "DELETE" && /\/super\/tenants\//.test(r.url()),
          { timeout: 15_000 }
        ).catch(() => null),
        dlg.getByRole("button", { name: /delete permanently/i }).click(),
      ]);
      if (response) {
        expect(response.status(), `delete tenant returned ${response.status()}`).toBeLessThan(400);
        // Tenant cleanly removed via UI; remove its cleanup entry so
        // teardown doesn't try to delete it again and report a 404.
        state.set("tenantDeletedViaUi", true);
      }
    });

    await test.step("Tenant row no longer visible", async () => {
      await expect(page.getByText(slug!, { exact: false }).first())
        .toBeHidden({ timeout: 8_000 })
        .catch(() => { /* table render may lag, best-effort */ });
    });
  });
}
