// Page Object for the tenant dashboard / sidebar nav.

import type { Page } from "@playwright/test";

export class DashboardPage {
  constructor(private page: Page) {}

  async expectLoaded() {
    await this.page.waitForURL((url) => url.toString().includes("/dashboard"));
  }

  /**
   * Navigate via the sidebar by visible link text. Module routes follow
   * /{tenant}/{module}. Falls back to direct URL nav if the link is not found.
   */
  async go(module: string) {
    const link = this.page.getByRole("link", { name: new RegExp(`^${module}$`, "i") });
    if (await link.count()) {
      await link.first().click();
    } else {
      const url = this.page.url();
      const tenant = url.split("/")[3] || "demo";
      await this.page.goto(`/${tenant}/${module.toLowerCase()}`);
    }
  }

  async logout() {
    const btn = this.page.getByRole("button", { name: /log\s*out|sign\s*out/i });
    if (await btn.count()) await btn.first().click();
    else {
      // Fallback: clear storage and navigate.
      await this.page.evaluate(() => localStorage.clear());
      await this.page.goto("/login");
    }
  }
}
