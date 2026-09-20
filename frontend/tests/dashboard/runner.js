// Test runner entrypoint.
// 1. Start the dashboard server (HTTP + WS).
// 2. Open the dashboard in the default browser.
// 3. Spawn Playwright the first time. Subsequent runs are triggered by the
//    Restart button in the dashboard, which calls POST /restart on the server.

const path = require("path");
const { spawn } = require("child_process");
const { startDashboardServer } = require("./server");

const PORT = parseInt(process.env.DASHBOARD_PORT || "9323", 10);
const TESTS_DIR = path.resolve(__dirname, "..");
const FRONTEND_DIR = path.resolve(TESTS_DIR, "..");

async function openBrowser(url) {
  try {
    const open = (await import("open")).default;
    await open(url);
  } catch {
    console.log(`[dashboard] auto-open failed, visit ${url} manually`);
  }
}

function buildSpawn() {
  const playwrightBin = path.join(
    FRONTEND_DIR, "node_modules", ".bin",
    process.platform === "win32" ? "playwright.cmd" : "playwright"
  );
  const args = [
    "test",
    "--config",
    path.join(TESTS_DIR, "playwright.config.ts"),
    ...process.argv.slice(2),
  ];
  return () => spawn(playwrightBin, args, {
    stdio: "inherit",
    cwd: FRONTEND_DIR,
    env: { ...process.env, DASHBOARD_PORT: String(PORT) },
  });
}

async function main() {
  const spawnRun = buildSpawn();
  const { server, setChild } = await startDashboardServer({ port: PORT, spawnRun });
  const url = `http://localhost:${PORT}`;
  console.log(`\n[dashboard] live at ${url}\n`);

  if (!process.env.CI) await openBrowser(url);

  const child = spawnRun();
  setChild(child);
  child.on("exit", (code) => {
    console.log(`\n[dashboard] test run finished (exit ${code}).`);
    console.log(`[dashboard] click Restart in the dashboard to run again, or Ctrl+C to stop.`);
  });

  process.on("SIGINT", () => {
    console.log("\n[dashboard] shutting down");
    if (child && !child.killed) child.kill("SIGINT");
    server.close(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error("[dashboard] fatal:", err);
  process.exit(1);
});
