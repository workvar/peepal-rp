import axios from "axios";
import { API_BASE_URL } from "@/config";
import { hasSessionMarker } from "@/lib/session";
import {
  canRefreshSession,
  endSession,
  refreshSession,
} from "@/lib/refreshSession";

// Auth uses two httpOnly cookies set by the backend: a short-lived access
// token that every request carries, and a long-lived refresh token that buys
// new access tokens. The browser attaches both automatically; no token ever
// touches localStorage.
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const tenantId = localStorage.getItem("tenantId");
    if (tenantId) {
      config.headers["X-Tenant-ID"] = tenantId;
    }
  }
  return config;
});

// Requests that must never trigger a refresh: for the session endpoints
// themselves, a 401 IS the answer.
function isSessionEndpoint(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/refresh") ||
    url.includes("/auth/logout")
  );
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isLoginRequest = original?.url?.includes("/auth/login");

    if (
      error.response?.status !== 401 ||
      typeof window === "undefined" ||
      isLoginRequest
    ) {
      return Promise.reject(error);
    }

    // Access tokens are short-lived, so a 401 usually just means this one aged
    // out. Spend the refresh cookie and replay the request once — the user
    // notices a slower response instead of being thrown back to the login
    // page. `_retried` keeps a still-401 replay from looping.
    if (
      original &&
      !original._retried &&
      !isSessionEndpoint(original.url) &&
      canRefreshSession()
    ) {
      original._retried = true;
      if (await refreshSession()) {
        return apiClient(original);
      }
    }

    // Refresh was impossible or refused: the session is genuinely over. Only
    // kick the user out to /login when there WAS a session and they are not
    // already on a public/marketing page.
    if (hasSessionMarker()) {
      endSession();
    }

    return Promise.reject(error);
  }
);

export default apiClient;
