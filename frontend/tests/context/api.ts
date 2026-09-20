// Thin fetch wrapper for the Go backend. Two cached tokens (admin + super)
// so flow tests and globalTeardown can hit endpoints without re-authenticating.

import { env } from "../fixtures/env";

let adminToken: string | null = null;
let superToken: string | null = null;

// Node's fetch (undici) often resolves "localhost" to ::1 first on macOS.
// If the Go server only listens on 127.0.0.1 you get ECONNREFUSED. Normalize.
function normalizeBase(url: string): string {
  return url.replace(/\/+$/, "").replace("://localhost", "://127.0.0.1");
}

const API_BASE = normalizeBase(env.apiURL);

async function login(email: string, password: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(`[api] login(${email}) failed: ${res.status} ${txt}`);
      return null;
    }
    const json = await res.json();
    return json?.data?.token ?? json?.token ?? null;
  } catch (err: any) {
    console.error(`[api] login(${email}) threw: ${err?.message ?? err}`);
    return null;
  }
}

export async function getAdminToken(): Promise<string | null> {
  if (adminToken) return adminToken;
  adminToken = await login(env.admin.email, env.admin.password);
  return adminToken;
}

export async function getSuperToken(): Promise<string | null> {
  if (superToken) return superToken;
  superToken = await login(env.superAdmin.email, env.superAdmin.password);
  return superToken;
}

export interface ApiOpts {
  auth?: "admin" | "super" | "none";
  tenantId?: string;
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;             // 0 if the fetch threw
  data: T | null;             // unwrapped data field, or full body if no data field
  raw: string;                // raw response body text
  error: string | null;       // fetch-level error message, if any
  url: string;
}

export async function api<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  opts: ApiOpts = {}
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const which = opts.auth ?? "admin";
  if (which === "admin") {
    const t = await getAdminToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  } else if (which === "super") {
    const t = await getSuperToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  if (opts.tenantId) headers["X-Tenant-ID"] = opts.tenantId;

  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const raw = await res.text();
    let data: T | null = null;
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      data = parsed?.data ?? parsed ?? null;
    } catch { /* non-json response */ }
    return { ok: res.ok, status: res.status, data, raw, error: null, url };
  } catch (err: any) {
    const message = err?.cause?.message || err?.message || String(err);
    return {
      ok: false, status: 0, data: null, raw: "",
      error: `${method} ${url} → ${message}`,
      url,
    };
  }
}

/** Throw a clear diagnostic if the response wasn't 2xx. Includes status + body. */
export function ensureOk(res: ApiResult<unknown>, label: string): asserts res is ApiResult<unknown> & { ok: true } {
  if (res.ok) return;
  const detail = res.error
    ? `network error (is backend running at ${API_BASE}?): ${res.error}`
    : `HTTP ${res.status} ${res.raw?.slice(0, 300) || ""}`;
  throw new Error(`${label}: ${detail}`);
}

/**
 * Try a list of dot-paths against the response body and return the first
 * truthy value as a string. Useful because the Go backend nests created
 * entities differently per route (e.g. tenants returns { tenant: { id } },
 * plans returns { id }, etc.).
 *
 *   extractId(res.data, ["tenant.id", "id"])
 */
export function extractId(data: unknown, paths: string[]): string | null {
  if (!data) return null;
  for (const p of paths) {
    const v = p.split(".").reduce<any>((acc, k) => (acc != null ? acc[k] : undefined), data);
    if (v != null && v !== "") return String(v);
  }
  return null;
}
