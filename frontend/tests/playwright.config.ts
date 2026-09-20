import { defineConfig, devices } from "@playwright/test";
import * as path from "path";
import * as dotenv from "dotenv";

// Load test env vars (TEST_BASE_URL, TEST_API_URL, credentials, etc.)
dotenv.config({ path: path.resolve(__dirname, ".env") });

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const HEADED = process.env.PW_HEADED === "1";
const CI = !!process.env.CI;

// Dashboard server port (used by the custom reporter to stream live events).
// Keep in sync with tests/dashboard/server.js.
const DASHBOARD_PORT = process.env.DASHBOARD_PORT || "9323";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./.playwright-output",
  timeout: 60_000,
  expect: { timeout: 6_000 },

  // Tests are chained: superadmin login feeds tenant tests, etc.
  // Files run in declaration order, tests within a file run sequentially.
  fullyParallel: false,
  forbidOnly: CI,
  retries: 0,
  workers: 1,

  globalSetup:    path.resolve(__dirname, "context/setup.ts"),
  globalTeardown: path.resolve(__dirname, "context/teardown.ts"),

  reporter: [
    ["list"],
    ["html", { outputFolder: "./.playwright-report", open: "never" }],
    [
      path.resolve(__dirname, "dashboard/reporter.js"),
      { port: DASHBOARD_PORT },
    ],
  ],

  use: {
    baseURL: BASE_URL,
    headless: !HEADED,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
