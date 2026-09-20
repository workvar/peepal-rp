// Small wait helpers that wrap Playwright primitives.

import type { Page } from "@playwright/test";

export async function waitForToast(page: Page, text?: string) {
  // react-hot-toast renders as div with role status, text content matches.
  if (text) {
    await page.getByText(text, { exact: false }).first().waitFor({ timeout: 5000 });
  } else {
    await page.locator("[role='status']").first().waitFor({ timeout: 5000 });
  }
}

export async function waitForUrlContains(page: Page, fragment: string) {
  await page.waitForURL((url) => url.toString().includes(fragment), { timeout: 10_000 });
}
