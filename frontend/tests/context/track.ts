// File-backed LIFO cleanup stack. Each test that creates a record calls
// `track({ kind: "user", id })` and globalTeardown drains the stack in
// reverse order so no test data is left in the DB.

import * as fs from "fs";
import * as path from "path";

const STATE_FILE = path.resolve(__dirname, "../.run-state.json");

export type Kind =
  | "tenant"
  | "plan"
  | "subscription"
  | "user"
  | "role"
  | "department"
  | "student"
  | "employee"
  | "attendance"
  | "marks"
  | "leave"
  | "leaveType"
  | "custom";

export interface CleanupItem {
  kind: Kind;
  id: string | number;
  /** Override the default DELETE path. */
  deletePath?: string;
  /** Override the HTTP method (e.g. "PATCH" for soft-delete). */
  method?: "DELETE" | "PATCH" | "PUT" | "POST";
  /** Optional body sent with the cleanup call (some delete endpoints need confirmation). */
  body?: Record<string, unknown>;
  /** Which token to use. Defaults per-kind. */
  auth?: "admin" | "super";
  /** Free-text note for log lines. */
  note?: string;
}

export function track(item: CleanupItem) {
  const items = readAll();
  items.push(item);
  fs.writeFileSync(STATE_FILE, JSON.stringify(items, null, 2));
}

export function readAll(): CleanupItem[] {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return [];
  }
}

export function clear() {
  fs.writeFileSync(STATE_FILE, "[]");
}
