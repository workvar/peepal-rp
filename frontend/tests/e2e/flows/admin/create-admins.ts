import { test, expect } from "@playwright/test";
import { getSuperPage } from "../../../context/session";
import { state } from "../../../context/state";
import { track } from "../../../context/track";
import { extractId } from "../../../context/api";
import { clickAndCapture, inDialog } from "../../../helpers/ui";

export interface AdminAccount {
  id?:       string;
  name:      string;
  email:     string;
  password:  string;
  // Which permission keys to grant. Empty array = read-only (no permissions).
  perms:     string[];
}

async function createOneAdmin(account: AdminAccount): Promise<string | null> {
  const page = getSuperPage();

  await test.step(`Open admins page`, async () => {
    await page.goto("/super/admins");
    await expect(page).toHaveURL(/\/super\/admins/);
  });

  await test.step(`Click 'Add Super Admin' to open modal`, async () => {
    await page.getByRole("button", { name: /add super admin/i }).first().click();
    await expect(inDialog(page)).toBeVisible();
  });

  await test.step(`Fill admin form (${account.email})`, async () => {
    const dlg = inDialog(page);
    await dlg.getByPlaceholder(/jane smith/i).fill(account.name);
    await dlg.getByPlaceholder(/jane@platform/i).fill(account.email);
    await dlg.getByPlaceholder(/min\. 8 characters/i).fill(account.password);
    // PermissionPanel: tick the requested permissions if any.
    if (account.perms.length === 0) {
      const clearBtn = dlg.getByRole("button", { name: /clear all/i });
      if (await clearBtn.count()) await clearBtn.click();
    } else {
      // Best-effort: click each permission row by visible label.
      for (const p of account.perms) {
        const row = dlg.locator(`label:has-text("${p}")`).first();
        if (await row.count()) await row.click().catch(() => {});
      }
    }
  });

  let id: string | null = null;
  await test.step(`Submit and capture admin id`, async () => {
    const res = await clickAndCapture(
      page,
      /\/super\/admins(?:\?|$)/,
      async () => {
        await inDialog(page).getByRole("button", { name: /^create admin$/i }).click();
      }
    );
    expect(res.status, `create admin failed: ${res.status} ${res.raw.slice(0, 200)}`).toBeLessThan(400);
    id = extractId(res.body?.data ?? res.body, ["admin.id", "admin.ID", "id", "ID"]);
  });

  return id;
}

export function createAdminsFlow() {
  test("Create admin users with various roles", async () => {
    // Two accounts: one full-access, one read-only.
    const ts = Date.now().toString(36);
    const accounts: AdminAccount[] = [
      {
        name:     `E2E Full Admin ${ts}`,
        email:    `e2e_full_${ts}@platform.test`,
        password: "FullAdmin@123",
        perms:    ["Manage Clients", "Manage Plans", "Manage Subscriptions"],
      },
      {
        name:     `E2E Read Admin ${ts}`,
        email:    `e2e_read_${ts}@platform.test`,
        password: "ReadAdmin@123",
        perms:    [], // read-only
      },
    ];

    for (const acc of accounts) {
      const id = await createOneAdmin(acc);
      acc.id = id ?? undefined;
      if (id) {
        track({
          kind: "custom",
          id,
          deletePath: `/api/v1/super/admins/${id}`,
          auth: "super",
          note: `super admin ${acc.email}`,
        });
      }
    }

    state.set("createdAdmins", accounts);
  });
}
