// Page Object for /login. Keeps selectors out of test files.

import type { Page } from "@playwright/test";
import { env } from "../fixtures/env";

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/login");
  }

  async fill(orgSlug: string, email: string, password: string) {
    await this.page.getByPlaceholder("your-org-name").fill(orgSlug);
    await this.page.getByPlaceholder("you@example.com").fill(email);
    await this.page.getByPlaceholder("••••••••").fill(password);
  }

  async submit() {
    await this.page.getByRole("button", { name: /sign in/i }).click();
  }

  async loginAs(role: "admin" | "teacher" | "student", orgSlug = env.orgSlug) {
    const creds = env[role];
    await this.goto();
    await this.fill(orgSlug, creds.email, creds.password);
    await this.submit();
    await this.page.waitForURL((url) => url.toString().includes("/dashboard"), {
      timeout: 15_000,
    });
  }

  errorBanner() {
    return this.page.locator("[role='alert'], div").filter({ hasText: /not found|invalid|incorrect/i }).first();
  }
}
