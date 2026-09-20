import { test, expect } from "@playwright/test";
import { getSuperPage } from "../../../context/session";
import { state } from "../../../context/state";
import { track } from "../../../context/track";
import { extractId } from "../../../context/api";
import { clickAndCapture, inDialog } from "../../../helpers/ui";
import { env } from "../../../fixtures/env";

export function newTenantFlow() {
  test("Create new tenant", async () => {
    const page = getSuperPage();
    const slug = `e2et${Date.now().toString(36)}`;
    const name = `E2E Tenant ${slug}`;
    const adminEmail = `e2e_t_admin_${slug}@example.test`;
    const adminPassword = "E2E@Test123";

    await test.step("Navigate to /super/tenants", async () => {
      await page.goto("/super/tenants");
      await expect(page).toHaveURL(/\/super\/tenants/);
    });

    await test.step("Click 'Create Tenant' to open modal", async () => {
      await page.getByRole("button", { name: /create tenant/i }).first().click();
      await expect(inDialog(page)).toBeVisible();
    });

    await test.step("Fill the tenant form", async () => {
      const dlg = inDialog(page);
      await dlg.locator('input[name="name"]').fill(name);
      await dlg.locator('input[name="subdomain"]').fill(slug);
      await dlg.locator('input[name="admin_name"]').fill("E2E Tenant Admin");
      await dlg.locator('input[name="admin_email"]').fill(adminEmail);
      await dlg.locator('input[name="admin_password"]').fill(adminPassword);
    });

    let id: string | null = null;
    await test.step("Submit and capture new tenant id", async () => {
      const res = await clickAndCapture(
        page,
        /\/super\/tenants(?:\?|$)/,
        async () => {
          await inDialog(page).getByRole("button", { name: /^create tenant$/i }).click();
        }
      );
      expect(res.status, `create tenant failed: ${res.status} ${res.raw.slice(0, 200)}`).toBeLessThan(400);
      id = extractId(res.body?.data ?? res.body, ["tenant.id", "tenant.ID", "id", "ID"]);
      if (!id) throw new Error(`create tenant returned no id. body=${res.raw.slice(0, 300)}`);
    });

    await test.step("Track tenant + admin creds for the next flows", async () => {
      if (id) {
        // The "From admin module, delete tenant" flow will remove it via UI.
        // We still register cleanup in case that step is skipped or fails.
        track({
          kind: "tenant",
          id,
          body: { password: env.superAdmin.password },
          note: `tenant ${slug}`,
        });
        state.set("tenantId", id);
        state.set("tenantSlug", slug);
        state.set("tenantAdminEmail", adminEmail);
        state.set("tenantAdminPassword", adminPassword);
      }
    });
  });
}
