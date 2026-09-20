// Playwright globalSetup. Clears the cleanup stack so each run starts fresh.

import { clear } from "./track";

export default async function globalSetup() {
  clear();
  // Mute noisy logs in CI by default; the dashboard captures everything.
  console.log("[setup] cleanup stack reset");
}
