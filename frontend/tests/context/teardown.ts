// Playwright globalTeardown. Drains the cleanup stack in LIFO order so
// nothing the tests created is left behind in the DB.

import { readAll, clear, CleanupItem, Kind } from "./track";
import { api } from "./api";

// Default DELETE endpoint per kind. Override per-item via item.deletePath.
const DELETE_PATHS: Record<Kind, (id: string | number) => string> = {
  tenant:       (id) => `/api/v1/super/tenants/${id}`,
  plan:         (id) => `/api/v1/super/plans/${id}`,
  subscription: (id) => `/api/v1/super/subscriptions/${id}/status`, // no DELETE endpoint
  user:         (id) => `/api/v1/users/${id}`,
  role:         (id) => `/api/v1/roles/${id}`,
  department:   (id) => `/api/v1/departments/${id}`,
  student:      (id) => `/api/v1/students/${id}`,
  employee:     (id) => `/api/v1/employees/${id}`,
  attendance:   (id) => `/api/v1/attendance/${id}`,
  marks:        (id) => `/api/v1/marks/${id}`,
  leave:        (id) => `/api/v1/leaves/${id}`,
  leaveType:    (id) => `/api/v1/leave-types/${id}`,
  custom:       (id) => `/api/v1/custom/${id}`,
};

const DEFAULT_AUTH: Record<Kind, "admin" | "super"> = {
  tenant: "super",
  plan: "super",
  subscription: "super",
  user: "admin",
  role: "admin",
  department: "admin",
  student: "admin",
  employee: "admin",
  attendance: "admin",
  marks: "admin",
  leave: "admin",
  leaveType: "admin",
  custom: "admin",
};

// Some endpoints don't accept DELETE; map to the right method + body shape.
const DEFAULT_METHOD: Partial<Record<Kind, "DELETE" | "PATCH" | "PUT" | "POST">> = {
  subscription: "PATCH",
};

export default async function globalTeardown() {
  const items = readAll();
  if (!items.length) {
    console.log("[teardown] nothing to clean up");
    return;
  }
  console.log(`[teardown] draining ${items.length} cleanup item(s) in LIFO order`);

  const reversed = [...items].reverse();
  let ok = 0, failed = 0;
  for (const item of reversed) {
    const success = await del(item);
    if (success) ok++;
    else failed++;
  }
  console.log(`[teardown] done: ${ok} deleted, ${failed} failed`);
  clear();
}

async function del(item: CleanupItem): Promise<boolean> {
  const path   = item.deletePath ?? DELETE_PATHS[item.kind](item.id);
  const auth   = item.auth   ?? DEFAULT_AUTH[item.kind];
  const method = item.method ?? DEFAULT_METHOD[item.kind] ?? "DELETE";
  const body   = item.body   ?? defaultBody(item);

  const res = await api(method, path, body, { auth });
  const tag = item.note ? ` (${item.note})` : "";
  if (res.ok || res.status === 404) {
    console.log(`  ✓ ${item.kind}:${item.id}${tag}`);
    return true;
  }
  console.log(`  ✕ ${item.kind}:${item.id}${tag} → ${method} ${path} [${res.status}]`);
  return false;
}

function defaultBody(item: CleanupItem): Record<string, unknown> | undefined {
  // Subscriptions: PATCH status to "expired" since DELETE isn't supported.
  if (item.kind === "subscription") return { status: "expired", notes: "e2e-cleanup" };
  return undefined;
}
