import apiClient from "@/api/client";

export interface UpdateProfilePayload {
  name?: string;
  photo_url?: string;
}

export const authAPI = {
  // `identifier` may be an email, employee ID, or student roll number.
  // `tenantSubdomain` is required for non-super logins; omit only for /super/login.
  login: (identifier: string, password: string, tenantSubdomain?: string) =>
    apiClient.post("/auth/login", {
      identifier,
      password,
      tenant_subdomain: tenantSubdomain,
    }),
  me: () => apiClient.get("/auth/me"),
  // Exchanges the httpOnly refresh cookie for a fresh access token. Normally
  // driven automatically by the API clients on a 401 (see lib/refreshSession);
  // exposed here for explicit "keep me signed in" flows.
  refresh: () => apiClient.post("/auth/refresh"),
  // Clears the httpOnly auth cookie server-side.
  logout: () => apiClient.post("/auth/logout"),
  /**
   * updateProfile — partial update. Pass `name` to rename, `photo_url`
   * to change the avatar (set to "" to clear it). Backwards compatible
   * with the previous `updateProfile(name)` callers.
   */
  updateProfile: (payload: string | UpdateProfilePayload) => {
    const body =
      typeof payload === "string" ? { name: payload } : payload;
    return apiClient.put("/auth/profile", body);
  },
  changePassword: (current_password: string, new_password: string) =>
    apiClient.put("/auth/password", { current_password, new_password }),
  // ── Workspaces (multi-role) ──────────────────────────────────
  // Switching re-mints the httpOnly auth cookie with a different active role,
  // so it must go through REST rather than GraphQL.
  workspaces: () => apiClient.get("/auth/workspaces"),
  switchWorkspace: (role: string) => apiClient.post("/auth/workspace", { role }),
};

export const tenantLookupAPI = {
  lookup: (subdomain: string) => apiClient.get(`/tenants/lookup/${subdomain}`),
};
