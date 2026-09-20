import apiClient from "@/api/client";

export const superAdminAPI = {
  getStats: () => apiClient.get("/super/stats"),
  listTenants: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get("/super/tenants", { params }),
  createTenant: (data: object) => apiClient.post("/super/tenants", data),
  getTenant: (id: string) => apiClient.get(`/super/tenants/${id}`),
  updateTenant: (id: string, data: object) => apiClient.put(`/super/tenants/${id}`, data),
  updateTenantStatus: (id: string, status: string) =>
    apiClient.patch(`/super/tenants/${id}/status`, { status }),
  impersonateTenant: (id: string) => apiClient.post(`/super/tenants/${id}/impersonate`),
  deleteTenant: (id: string, password: string) =>
    apiClient.delete(`/super/tenants/${id}`, { data: { password } }),
  listAdmins: () => apiClient.get("/super/admins"),
  createAdmin: (data: { name: string; email: string; password: string; permissions: string }) =>
    apiClient.post("/super/admins", data),
  updateAdmin: (id: string, data: { name?: string; is_active?: boolean; permissions?: string; password?: string }) =>
    apiClient.put(`/super/admins/${id}`, data),
  deleteAdmin: (id: string) => apiClient.delete(`/super/admins/${id}`),
  // Platform-wide email (SMTP) settings — the shared fallback transport used by
  // any tenant that has not configured its own.
  getEmailSettings: () => apiClient.get("/super/email-settings"),
  updateEmailSettings: (data: object) => apiClient.put("/super/email-settings", data),
  testEmailSettings: (to?: string) => apiClient.post("/super/email-settings/test", { to }),
  // Email template designer — per-type subject/body overrides.
  listEmailTemplates: () => apiClient.get("/super/email-templates"),
  updateEmailTemplate: (key: string, data: object) =>
    apiClient.put(`/super/email-templates/${key}`, data),
  resetEmailTemplate: (key: string) => apiClient.delete(`/super/email-templates/${key}`),
  testEmailTemplate: (key: string, to?: string) =>
    apiClient.post(`/super/email-templates/${key}/test`, { to }),
};

export const plansAPI = {
  list: () => apiClient.get("/super/plans"),
  create: (data: object) => apiClient.post("/super/plans", data),
  update: (id: string, data: object) => apiClient.put(`/super/plans/${id}`, data),
  delete: (id: string) => apiClient.delete(`/super/plans/${id}`),
};

export const subscriptionsAPI = {
  list: () => apiClient.get("/super/subscriptions"),
  getByTenant: (tenantId: string) => apiClient.get(`/super/subscriptions/tenant/${tenantId}`),
  assign: (data: object) => apiClient.post("/super/subscriptions", data),
  updateStatus: (id: string, data: { status: string; notes?: string }) =>
    apiClient.patch(`/super/subscriptions/${id}/status`, data),
  mySubscription: () => apiClient.get("/org/subscription"),
};
