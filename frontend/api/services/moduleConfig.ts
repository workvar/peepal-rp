import apiClient from "@/api/client";

// Super-admin module configurator: coarse module catalog + page→module mapping.
export const moduleConfigAPI = {
  get: () => apiClient.get("/super/module-config"),
  setPageMapping: (id: string, moduleKey: string) =>
    apiClient.put(`/super/module-config/pages/${id}`, { module_key: moduleKey }),
  createModule: (data: { label: string; key?: string }) =>
    apiClient.post("/super/module-config/modules", data),
  updateModule: (key: string, data: { label?: string; sort?: number }) =>
    apiClient.put(`/super/module-config/modules/${key}`, data),
  deleteModule: (key: string) =>
    apiClient.delete(`/super/module-config/modules/${key}`),
};
