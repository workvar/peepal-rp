// UI-driven helpers. Tests use these so they look like a real user, while
// still capturing enough info from the network to clean up after themselves.

import type { Page, Locator } from "@playwright/test";

export interface CapturedResponse {
  status: number;
  body: any;        // parsed JSON, or null
  raw: string;
  url: string;
  method: string;
}

/**
 * Run `action` (typically clicking a submit button) and wait for the next
 * non-GET network response whose URL matches `urlPattern`. Returns the
 * parsed body so the test can read the new entity id for cleanup tracking.
 *
 * Times out after 15s; if no matching response fires, returns status 0.
 */
export async function clickAndCapture(
  page: Page,
  urlPattern: RegExp | string,
  action: () => Promise<void>,
  timeoutMs = 15_000
): Promise<CapturedResponse> {
  const respP = page.waitForResponse(
    (r) => {
      const method = r.request().method();
      if (method === "GET" || method === "OPTIONS" || method === "HEAD") return false;
      const url = r.url();
      return typeof urlPattern === "string" ? url.includes(urlPattern) : urlPattern.test(url);
    },
    { timeout: timeoutMs }
  ).catch(() => null);

  await action();
  const response = await respP;
  if (!response) {
    return { status: 0, body: null, raw: "", url: "", method: "" };
  }
  const raw = await response.text();
  let body: any = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { /* not JSON */ }
  return {
    status: response.status(), body, raw,
    url: response.url(), method: response.request().method(),
  };
}

/**
 * The visible modal/dialog. This app uses two patterns:
 *   1. role="dialog" (the Dialog component in components/ui/dialog.tsx)
 *   2. plain `.fixed.inset-0` divs wrapping a form (custom modals)
 * Match either, prefer the most recent.
 */
export function inDialog(page: Page): Locator {
  return page.locator('[role="dialog"], .fixed.inset-0:has(form)').last();
}

/**
 * Find the input/textarea/select that sits next to a <label> with the given
 * text. Works for forms where the label isn't programmatically associated
 * (no `htmlFor`/`id`), which is the dominant pattern in this codebase.
 *
 *   field(dlg, "Organization Name").fill("Acme")
 *   field(dlg, "Status").selectOption("active")
 */
export function field(scope: Locator, labelText: string): Locator {
  const safe = labelText.replace(/"/g, '\\"');
  // Same-parent fallback covers the common <div><label/><input/></div> pattern.
  return scope
    .locator(
      `xpath=.//label[contains(normalize-space(.), "${safe}")]/following-sibling::*[self::input or self::textarea or self::select][1] | ` +
      `.//label[contains(normalize-space(.), "${safe}")]/..//*[self::input or self::textarea or self::select][1]`
    )
    .first();
}

/**
 * Open a custom SelectBox dropdown by its sibling label and click an option.
 * SelectBox renders a <button role="combobox"> trigger and a portaled
 * <div role="listbox"> with option <button>s.
 *
 *   await selectBox(page, dlg, "User Account", "Jane Doe")
 *   await selectBox(page, dlg, "Gender", /^male$/i)
 *
 * Pass `optionMatch = "*"` to click the first available option.
 */
export async function selectBox(
  page: Page,
  scope: Locator,
  labelText: string,
  optionMatch: string | RegExp
): Promise<void> {
  const safe = labelText.replace(/"/g, '\\"');
  const trigger = scope.locator(
    `xpath=.//label[contains(normalize-space(.), "${safe}")]/following::*[@role="combobox"][1] | ` +
    `.//label[contains(normalize-space(.), "${safe}")]/..//*[@role="combobox"][1]`
  ).first();
  await trigger.click();

  // Listbox is portaled to <body>, so look at the page (not the dialog scope).
  const listbox = page.locator('[role="listbox"]').last();
  await listbox.waitFor({ state: "visible", timeout: 5_000 });

  if (optionMatch === "*") {
    await listbox.locator("button").first().click();
  } else if (typeof optionMatch === "string") {
    await listbox.locator(`button:has-text("${optionMatch.replace(/"/g, '\\"')}")`).first().click();
  } else {
    await listbox.locator("button").filter({ hasText: optionMatch }).first().click();
  }
}
