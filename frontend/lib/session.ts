// Lightweight client-side session marker.
//
// The real credential is an httpOnly cookie that JavaScript cannot read.
// This marker only records "a login happened in this browser" so the UI can
// decide whether a 401 means "session expired" (redirect to login) versus
// "anonymous visitor" (do nothing). It carries no secret.

const SESSION_MARKER_KEY = "peepal_session";

export function setSessionMarker(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_MARKER_KEY, "1");
  }
}

export function hasSessionMarker(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SESSION_MARKER_KEY) === "1";
}

export function clearSessionMarker(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_MARKER_KEY);
    // Clean up keys from the old localStorage-token scheme.
    localStorage.removeItem("token");
    localStorage.removeItem("impersonation_token");
    localStorage.removeItem("impersonation_tenant");
  }
}
