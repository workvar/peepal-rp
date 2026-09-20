import apiClient from "@/api/client";

// api/services/passkeys.ts — the REST surface for passkey sign-in and the
// optional 6-digit PIN.
//
// Auth stays on REST rather than GraphQL for the same reason login does: these
// calls set and clear the httpOnly session cookies, which is a transport-level
// concern the GraphQL endpoint does not handle.

export interface PasskeySummary {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  /** True when the key lives in a cloud keychain and survives a lost device. */
  synced: boolean;
  /** Set when the authenticator's counter went backwards — a possible clone. */
  clone_warning: boolean;
}

export interface PasskeyListResponse {
  passkeys: PasskeySummary[];
  pin_enabled: boolean;
}

export interface PINStatus {
  enabled: boolean;
  has_passkeys: boolean;
  locked_until?: string;
}

/** What the server hands back after a verified assertion. */
export interface PasskeyLoginResult {
  /** Present when the account has a PIN: the session is not started yet. */
  pin_required?: boolean;
  pin_token?: string;
  user?: { name?: string; photo_url?: string } & Record<string, unknown>;
  token?: string;
}

export const passkeyAPI = {
  // ── Sign-in ─────────────────────────────────────────────────
  // `identifier` is optional: omitting it runs the discoverable flow, where the
  // authenticator picks the account. Passing one is the fallback for keys that
  // cannot be discovered.
  beginLogin: (tenantSubdomain?: string, identifier?: string) =>
    apiClient.post("/auth/passkey/login/begin", {
      tenant_subdomain: tenantSubdomain,
      identifier,
    }),
  finishLogin: (challengeId: string, credential: unknown) =>
    apiClient.post("/auth/passkey/login/finish", {
      challenge_id: challengeId,
      credential,
    }),
  // Completes a login that stopped at the PIN step.
  verifyPin: (pinToken: string, pin: string) =>
    apiClient.post("/auth/passkey/pin", { pin_token: pinToken, pin }),

  // ── Enrolment (authenticated) ───────────────────────────────
  beginRegistration: () => apiClient.post("/auth/passkey/register/begin"),
  finishRegistration: (challengeId: string, credential: unknown, name: string) =>
    apiClient.post("/auth/passkey/register/finish", {
      challenge_id: challengeId,
      credential,
      name,
    }),

  // ── Management (authenticated) ──────────────────────────────
  list: () => apiClient.get("/auth/passkeys"),
  rename: (id: string, name: string) =>
    apiClient.patch(`/auth/passkeys/${id}`, { name }),
  remove: (id: string) => apiClient.delete(`/auth/passkeys/${id}`),

  // ── PIN (authenticated) ─────────────────────────────────────
  pinStatus: () => apiClient.get("/auth/pin"),
  // Setting the first PIN is confirmed with the account password; changing an
  // existing one is confirmed with the current PIN.
  setPin: (pin: string, confirm: { currentPin?: string; password?: string }) =>
    apiClient.put("/auth/pin", {
      pin,
      current_pin: confirm.currentPin,
      password: confirm.password,
    }),
  removePin: (confirm: { currentPin?: string; password?: string }) =>
    apiClient.delete("/auth/pin", {
      data: { current_pin: confirm.currentPin, password: confirm.password },
    }),
};
