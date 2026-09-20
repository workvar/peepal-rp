// lib/webauthn.ts — the browser half of a passkey ceremony.
//
// The WebAuthn API speaks ArrayBuffers; JSON does not. So every ceremony is
// bracketed by the same two conversions: the options the server sends carry
// base64url strings where the API wants bytes, and the credential the API
// returns carries bytes where the server wants base64url strings. That is
// nearly all this module does, and doing it in one place is why the components
// that call it stay readable.
//
// Encoding note: the server uses base64url without padding on the way out, and
// the decoder here accepts padded or unpadded input, because what a browser
// hands back is not guaranteed to match what it was given.

/** Decodes base64url (padded or not) into the bytes WebAuthn expects. */
export function base64UrlToBuffer(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Encodes bytes as unpadded base64url, the form the API sends and stores. */
export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** True when this browser can do WebAuthn at all. */
export function passkeysSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    !!navigator.credentials
  );
}

/**
 * True when the device itself can create a passkey (Touch ID, Windows Hello,
 * Android screen lock). A browser can support WebAuthn with only an external
 * security key, which is worth knowing before offering "Set up a passkey" as
 * though it were one tap.
 */
export async function platformAuthenticatorAvailable(): Promise<boolean> {
  if (!passkeysSupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// The server sends the spec's JSON form of the options, so the fields that are
// really buffers arrive as base64url strings.
interface JsonDescriptor {
  id: string;
  type: string;
  transports?: string[];
}
interface CreationOptionsJSON {
  challenge: string;
  user: { id: string; name: string; displayName: string };
  rp: { id?: string; name: string };
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  attestation?: AttestationConveyancePreference;
  excludeCredentials?: JsonDescriptor[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
}
interface RequestOptionsJSON {
  challenge: string;
  timeout?: number;
  rpId?: string;
  userVerification?: UserVerificationRequirement;
  allowCredentials?: JsonDescriptor[];
}

function toDescriptors(list?: JsonDescriptor[]): PublicKeyCredentialDescriptor[] {
  return (list ?? []).map((d) => ({
    id: base64UrlToBuffer(d.id),
    type: "public-key",
    transports: d.transports as AuthenticatorTransport[] | undefined,
  }));
}

/**
 * Runs the create ceremony and returns the attestation in the shape the server
 * parses. Rejects with an Error whose message is safe to show.
 */
export async function createPasskey(options: CreationOptionsJSON) {
  const publicKey: PublicKeyCredentialCreationOptions = {
    ...options,
    challenge: base64UrlToBuffer(options.challenge),
    user: { ...options.user, id: base64UrlToBuffer(options.user.id) },
    excludeCredentials: toDescriptors(options.excludeCredentials),
  };

  const credential = (await navigator.credentials.create({
    publicKey,
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("Passkey setup was cancelled.");

  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    // Present only where the browser reports it; the server treats it as a hint.
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      attestationObject: bufferToBase64Url(response.attestationObject),
      transports: response.getTransports?.() ?? [],
    },
  };
}

/**
 * Runs the get ceremony. `mediation: "conditional"` is not used here: this is
 * the explicit "Sign in with a passkey" button, so a modal prompt is what the
 * user just asked for.
 */
export async function getPasskeyAssertion(options: RequestOptionsJSON) {
  const publicKey: PublicKeyCredentialRequestOptions = {
    ...options,
    challenge: base64UrlToBuffer(options.challenge),
    allowCredentials: toDescriptors(options.allowCredentials),
  };

  const credential = (await navigator.credentials.get({
    publicKey,
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("Sign-in was cancelled.");

  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      signature: bufferToBase64Url(response.signature),
      // Absent for a non-discoverable credential; the server falls back to the
      // credential ID to find the account in that case.
      userHandle: response.userHandle
        ? bufferToBase64Url(response.userHandle)
        : null,
    },
  };
}

/**
 * Turns a DOMException from the WebAuthn API into something worth showing.
 *
 * The distinction that matters to a user is "you cancelled" versus "this went
 * wrong": the first needs no error banner at all, and treating it as a failure
 * is the fastest way to make a working feature feel broken.
 */
export function describePasskeyError(err: unknown): {
  message: string;
  cancelled: boolean;
} {
  const e = err as { name?: string; message?: string };
  switch (e?.name) {
    case "NotAllowedError":
      // Covers both an explicit dismissal and a timeout — the API does not
      // distinguish them, deliberately, so neither does this.
      return { message: "Passkey prompt dismissed.", cancelled: true };
    case "AbortError":
      return { message: "Passkey prompt cancelled.", cancelled: true };
    case "InvalidStateError":
      return {
        message: "This device already has a passkey for your account.",
        cancelled: false,
      };
    case "NotSupportedError":
      return {
        message: "This device cannot create a passkey.",
        cancelled: false,
      };
    case "SecurityError":
      return {
        message: "Passkeys are not available on this address.",
        cancelled: false,
      };
    default:
      return {
        message: e?.message || "Something went wrong with the passkey.",
        cancelled: false,
      };
  }
}

/** A friendly default name for a newly created passkey, from the platform. */
export function suggestPasskeyName(): string {
  if (typeof navigator === "undefined") return "Passkey";
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return "iPhone / iPad";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Android/.test(ua)) return "Android device";
  if (/Windows/.test(ua)) return "Windows Hello";
  return "Passkey";
}
