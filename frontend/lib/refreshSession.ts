import axios from "axios";
import { API_BASE_URL } from "@/config";
import { clearSessionMarker, hasSessionMarker } from "@/lib/session";

// Silent session renewal.
//
// The access token the backend issues is short-lived (minutes), so a request
// coming back 401 usually means "the token aged out", not "you are logged out".
// The long-lived half of the session is the httpOnly refresh cookie, which
// POST /auth/refresh exchanges for a fresh access token — invisibly, without
// sending the user back to the login form.
//
// Both API clients (axios and Apollo) funnel through here so a burst of
// parallel 401s triggers exactly ONE refresh. That single-flight guarantee is
// not just an optimisation: the backend rotates the refresh token on every
// exchange and treats a replayed one as theft, so concurrent refreshes would
// risk tearing down the very session we are trying to save.

// A bare client: it must not run the interceptors that call back into here.
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

let inFlight: Promise<boolean> | null = null;

/**
 * Exchanges the refresh cookie for a new access token.
 *
 * Resolves true when the session was renewed, false when it is genuinely over
 * (expired, revoked, or the token was replayed and the backend killed it).
 * Concurrent callers share one request.
 */
export function refreshSession(): Promise<boolean> {
  if (inFlight) return inFlight;

  inFlight = refreshClient
    .post("/auth/refresh")
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/**
 * True when it is worth attempting a refresh at all. Without a prior login
 * there is no refresh cookie to spend, and a pointless 401 on /auth/refresh
 * just adds noise to the console for anonymous visitors.
 */
export function canRefreshSession(): boolean {
  return hasSessionMarker();
}

// Public routes where an expired session must NOT cause a redirect. Visitors on
// the landing page or any marketing/legal page should stay where they are even
// if some background request comes back unauthorised.
const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/super/login",
  "/modules",
  "/about",
  "/mission",
  "/inspiration",
  "/privacy",
  "/terms",
];

export function isOnPublicPage(): boolean {
  if (typeof window === "undefined") return true;
  const path = window.location.pathname;
  if (path === "/") return true;
  // Any login page is public, including per-tenant ones (/{tenant}/login).
  // A background 401 here must not bounce the visitor away from the form.
  if (path.endsWith("/login")) return true;
  return PUBLIC_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Called once a refresh has failed, i.e. the session is genuinely over: forget
 * it, and send the user to the login page unless they are on a page that is
 * fine to view logged out.
 */
export function endSession(): void {
  if (typeof window === "undefined") return;
  if (!hasSessionMarker()) return;
  clearSessionMarker();
  if (!isOnPublicPage()) {
    window.location.href = "/login";
  }
}
