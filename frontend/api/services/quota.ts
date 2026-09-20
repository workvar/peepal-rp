import apiClient from "@/api/client";

// Quota status for the signed-in tenant. Readable by every role (no billing
// details) so the persistent over-quota banner can render for all users.
export const quotaAPI = {
  status: () => apiClient.get("/quota"),
};
