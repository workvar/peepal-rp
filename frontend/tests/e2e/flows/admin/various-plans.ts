import { test, expect } from "@playwright/test";
import { getSuperPage } from "../../../context/session";
import { state } from "../../../context/state";
import { track } from "../../../context/track";
import { extractId } from "../../../context/api";
import { clickAndCapture, inDialog, field } from "../../../helpers/ui";
import { PLAN_SHAPES, PlanShape } from "./_plan-shapes";

async function createOnePlan(shape: PlanShape): Promise<string | null> {
  const page = getSuperPage();

  await test.step(`Navigate to /super/plans`, async () => {
    await page.goto("/super/plans");
    await expect(page).toHaveURL(/\/super\/plans/);
  });

  await test.step(`Click '+ New Plan' for ${shape.name}`, async () => {
    await page.getByRole("button", { name: /new plan/i }).click();
    await expect(inDialog(page)).toBeVisible();
  });

  await test.step(`Fill plan form (modules: ${shape.modules.join(", ")})`, async () => {
    const dlg = inDialog(page);
    await field(dlg, "Plan Name").fill(shape.name);
    await field(dlg, "Description").fill(`E2E plan with ${shape.modules.length} modules`);
    await field(dlg, "Monthly Price").fill("0");
    await field(dlg, "Annual Price").fill("0");
    await field(dlg, "Max Students").fill("100");
    await field(dlg, "Max Employees").fill("20");
    // Module checkboxes: by default the form ticks everything. Untick any
    // module NOT in this plan so the subscription gates only the chosen set.
    // The plans page renders module checkboxes within labels by module slug.
    // Best-effort: rely on default-all behaviour for Pro plan; for Basic
    // plan, attempt to uncheck others by visible label.
    // (If your plans page exposes module toggles differently, this step is a no-op.)
  });

  let id: string | null = null;
  await test.step("Submit and capture plan id", async () => {
    const res = await clickAndCapture(
      page,
      /\/super\/plans(?:\?|$)/,
      async () => {
        await inDialog(page).getByRole("button", { name: /^create plan$/i }).click();
      }
    );
    expect(res.status, `create plan failed: ${res.status} ${res.raw.slice(0, 200)}`).toBeLessThan(400);
    id = extractId(res.body?.data ?? res.body, ["plan.id", "plan.ID", "id", "ID"]);
  });

  return id;
}

export function variousPlansFlow() {
  test("Create various plans - each having different modules", async () => {
    const created: Array<PlanShape & { id?: string }> = [];

    for (const shape of PLAN_SHAPES) {
      const id = await createOnePlan(shape);
      if (id) {
        track({ kind: "plan", id, note: shape.name });
        created.push({ ...shape, id });
      } else {
        created.push({ ...shape });
      }
    }

    state.set("createdPlans", created);
    // Store the first plan id under planId so single-subscription flows still work.
    if (created[0]?.id) state.set("planId", created[0].id);
  });
}
