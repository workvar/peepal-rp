import apiClient from "@/api/client";

// Public, unauthenticated invite endpoints. A freshly-created user follows an
// e-mailed link to set their own password.
export const invitesAPI = {
  // Validate a token and fetch the minimal context for the accept page.
  validate: (token: string) => apiClient.get(`/invites/${token}`),
  // Set the user's password and consume the invite.
  accept: (token: string, password: string) =>
    apiClient.post(`/invites/accept`, { token, password }),
};
