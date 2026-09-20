// Shared helpers for the tenant flow modules.

import type { Page } from "@playwright/test";

export function tenantSlugFromUrl(page: Page): string {
  const parts = new URL(page.url()).pathname.split("/").filter(Boolean);
  return parts[0] || "demo";
}

export async function gotoModule(page: Page, modulePath: string) {
  const slug = tenantSlugFromUrl(page);
  await page.goto(`/${slug}/${modulePath}`);
}
