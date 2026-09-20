// Holds the active Playwright page for each role. Flow modules call
// getSuperPage() or getTenantPage() to act on the already-authenticated
// browser context. The actual login happens in flows/superadmin/login.ts
// and flows/tenant/login.ts via test.beforeAll.

import type { BrowserContext, Page } from "@playwright/test";

export interface RoleSession {
  context: BrowserContext | null;
  page: Page | null;
}

export const superSession:  RoleSession = { context: null, page: null };
export const tenantSession: RoleSession = { context: null, page: null };

export function getSuperPage(): Page {
  if (!superSession.page) throw new Error("super session not initialised. Did super login run?");
  return superSession.page;
}

export function getTenantPage(): Page {
  if (!tenantSession.page) throw new Error("tenant session not initialised. Did tenant login run?");
  return tenantSession.page;
}

/**
 * Attach a browser console listener so logs surface in the dashboard.
 * Reporter listens to stdout and forwards lines tagged "[browser]".
 */
export function attachConsole(page: Page, tag: string) {
  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    process.stdout.write(`[browser:${tag}:${type}] ${text}\n`);
  });
  page.on("pageerror", (err) => {
    process.stderr.write(`[browser:${tag}:pageerror] ${err.message}\n`);
  });
  page.on("requestfailed", (req) => {
    process.stdout.write(`[browser:${tag}:net-fail] ${req.method()} ${req.url()}\n`);
  });
}
