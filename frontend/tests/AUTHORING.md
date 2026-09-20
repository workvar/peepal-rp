# Adding a new test case

Tests simulate the frontend UI only. Cleanup runs via the backend API
in `globalTeardown` so the DB stays clean.

## The pattern

Every create flow does three things:

1. Drive the UI: navigate, click the "open modal" button, fill the form,
   click submit.
2. While submitting, capture the network response to extract the new
   entity's id.
3. Push the id onto the cleanup stack with `track(...)`.

```ts
// tests/e2e/flows/tenant/timetable.ts
import { test, expect } from "@playwright/test";
import { getTenantPage } from "../../../context/session";
import { state } from "../../../context/state";
import { track } from "../../../context/track";
import { extractId } from "../../../context/api";
import { clickAndCapture, inDialog } from "../../../helpers/ui";
import { gotoModule } from "./_nav";

export function timetableFlow() {
  test("Create timetable entry", async () => {
    const page = getTenantPage();

    await test.step("Open timetable page", async () => {
      await gotoModule(page, "timetable");
      await expect(page).toHaveURL(/\/timetable/);
    });

    await test.step("Click 'Add Entry' to open modal", async () => {
      await page.getByRole("button", { name: /add entry/i }).first().click();
      await expect(inDialog(page)).toBeVisible();
    });

    await test.step("Fill the form", async () => {
      const dlg = inDialog(page);
      await dlg.getByLabel(/subject/i).fill("Math");
      await dlg.getByLabel(/day/i).selectOption("monday");
    });

    let id: string | null = null;
    await test.step("Submit and capture id", async () => {
      const res = await clickAndCapture(
        page,
        /\/timetable|\/graphql/,
        async () => {
          await inDialog(page).getByRole("button", { name: /^save$/i }).click();
        }
      );
      expect(res.status, `create failed: ${res.status} ${res.raw.slice(0, 200)}`).toBeLessThan(400);
      id = extractId(res.body?.data ?? res.body, ["timetable.id", "id", "ID"]);
      if (!id) throw new Error(`create returned no id. body=${res.raw.slice(0, 300)}`);
    });

    await test.step("Track for cleanup", async () => {
      if (id) track({ kind: "custom", id, deletePath: `/api/v1/timetable/${id}` });
    });
  });
}
```

## Plug into the master spec

Open `tests/e2e/00-flow.spec.ts` and add it under the right describe:

```ts
import { timetableFlow } from "./flows/tenant/timetable";

test.describe("Timetable", () => {
  timetableFlow();
});
```

## Selector cheat sheet

Prefer in this order:

1. `dlg.getByLabel(/full name/i)` for inputs with an explicit `<label>`.
2. `page.getByRole("button", { name: /create user/i })` for buttons.
3. `page.getByPlaceholder("e.g. CS2024001")` if no label exists.

Always scope the form lookup to `inDialog(page)` so the same button text
(many pages have "Create X" in both the header and the modal submit)
doesn't double-match.

## Useful primitives

| File                          | What it gives you |
|------------------------------|-------------------|
| `helpers/ui.ts`              | `clickAndCapture(page, url, action)` and `inDialog(page)` |
| `context/session.ts`         | `getSuperPage()`, `getTenantPage()` (already authenticated) |
| `context/state.ts`           | `state.set/get` to pass IDs between flows |
| `context/track.ts`           | `track({ kind, id, body? })` to register cleanup |
| `context/api.ts`             | `extractId(body, paths)`; the cleanup teardown uses `api()` |
| `e2e/flows/tenant/_nav.ts`   | `gotoModule(page, "students")` resolves the tenant slug |

## Why a tiny API layer still exists

Tests themselves never call the backend directly. The `api()` helper is
only used by the `globalTeardown` to drain the cleanup stack with DELETE
calls. Without that the DB would accumulate test data forever.

## Capturing the id from GraphQL endpoints

Some tenant-side pages POST to `/graphql`. `clickAndCapture` accepts a
regex like `/\/users|\/graphql/` so the same call works for REST or
GraphQL. The body will be `{ data: { createUser: {...} } }` in that
case; `extractId(res.body?.data, ["createUser.id", "id"])` handles it.

## Conventions

1. One flow module per feature, kept under ~80 lines.
2. Every action is wrapped in `await test.step("description", ...)` so
   the dashboard's live step view tells the operator exactly where they
   are in the flow.
3. Generate unique values with `Date.now().toString(36)` to avoid
   collisions on repeat runs.
4. After a successful create, call `track(...)` immediately.
5. Use `state.set/get` to share ids between later flows in the same run.

## Running a subset

```
pnpm test --grep "Create student"
pnpm test --grep "Login to super"
```
