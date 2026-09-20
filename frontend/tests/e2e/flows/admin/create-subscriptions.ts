import { test, expect } from "@playwright/test";
import { getSuperPage } from "../../../context/session";
import { state } from "../../../context/state";
import { track } from "../../../context/track";
import { extractId } from "../../../context/api";
import { clickAndCapture, inDialog, field } from "../../../helpers/ui";
import type { PlanShape } from "./_plan-shapes";

function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function createSubscriptionsFlow() {
  test("Create subscriptions", async () => {
    const page = getSuperPage();
    const tenantId = state.get<string>("tenantId");
    const plans = state.get<Array<PlanShape & { id?: string }>>("createdPlans") || [];

    await test.step("Pre-flight: tenant + plans available", async () => {
      expect(tenantId, "no tenantId in state").toBeTruthy();
      expect(plans.length, "no plans in state").toBeGreaterThan(0);
    });

    // Assign the FIRST plan to the tenant (the per-subscription loop in the
    // master spec re-assigns higher plans afterward and re-checks modules).
    const firstPlan = plans[0];

    await test.step("Navigate to /super/subscriptions", async () => {
      await page.goto("/super/subscriptions");
      await expect(page).toHaveURL(/\/super\/subscriptions/);
    });

    await test.step("Click '+ Assign Plan' to open modal", async () => {
      await page.getByRole("button", { name: /assign plan/i }).first().click();
      await expect(inDialog(page)).toBeVisible();
    });

    await test.step(`Fill form: tenant + plan '${firstPlan.name}'`, async () => {
      const dlg = inDialog(page);
      await field(dlg, "Organisation").selectOption(tenantId!);
      await field(dlg, "Plan").selectOption(firstPlan.id!);
      await field(dlg, "Billing").selectOption("monthly");
      await field(dlg, "Status").selectOption("active");
      await field(dlg, "Start Date").fill(isoDate(0));
      await field(dlg, "End Date").fill(isoDate(30));
    });

    let id: string | null = null;
    await test.step("Submit and capture subscription id", async () => {
      const res = await clickAndCapture(
        page,
        /\/super\/subscriptions(?:\?|$)/,
        async () => {
          await inDialog(page).getByRole("button", { name: /save subscription/i }).click();
        }
      );
      expect(res.status, `create subscription failed: ${res.status} ${res.raw.slice(0, 200)}`).toBeLessThan(400);
      id = extractId(res.body?.data ?? res.body, ["subscription.id", "subscription.ID", "id", "ID"]);
    });

    await test.step("Track subscription", async () => {
      if (id) {
        track({ kind: "subscription", id });
        state.set("subscriptionId", id);
        state.set("activePlanIndex", 0);
      }
    });
  });
}
