"use client";

// components/auth/PasskeySignIn.tsx — the passkey half of the login screens.
// Shared by the tenant login page and the super-admin one, which differ only in
// whether a tenant scopes the ceremony.
//
// Two entry points, one button. Normally the ceremony runs discoverable: the
// authenticator knows which account it holds a key for, so nothing is typed.
// When the browser finds no credential it can offer — a key that is not
// resident, or a device the user has not enrolled — the component falls back to
// asking for the identifier and trying again with the server naming that
// account's credentials.
//
// A dismissed prompt is not an error. People open the sheet and change their
// mind constantly, and painting a red banner every time makes a working feature
// feel broken, so cancellation just returns the button to rest — and offers the
// identifier fallback, because the API reports "you cancelled" and "this device
// has nothing to offer" as the same NotAllowedError and cannot tell us which
// one happened.

import { useEffect, useState } from "react";
import { Fingerprint, KeyRound, Loader2 } from "lucide-react";
import { passkeyAPI } from "@/api/services/passkeys";
import { describePasskeyError, getPasskeyAssertion, passkeysSupported } from "@/lib/webauthn";
import type { AuthUser } from "@/types";
import PinDialog from "./PinDialog";
import { C, FONT, inputStyle } from "./theme";

type Stage = "idle" | "identifier" | "pin";

const linkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  fontSize: "13px",
  fontFamily: FONT,
  color: C.placeholder,
  cursor: "pointer",
  padding: 0,
  textAlign: "center",
};

interface Props {
  tenantSubdomain?: string;
  /** Prefilled from the password form's identifier field, when the user typed one. */
  identifierHint?: string;
  disabled?: boolean;
  /** Fires once the session cookies are set and the user object is known. */
  onSuccess: (user: AuthUser) => void;
  /** Lets the parent hide the password form while the PIN step is up. */
  onStageChange?: (stage: Stage) => void;
}

export default function PasskeySignIn({
  tenantSubdomain,
  identifierHint,
  disabled,
  onSuccess,
  onStageChange,
}: Props) {
  const [supported, setSupported] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [identifierFocused, setIdentifierFocused] = useState(false);
  // Shown after a discoverable attempt came back empty-handed.
  const [fallbackOffered, setFallbackOffered] = useState(false);

  // The PIN step's state. pinToken is the server's handle on the half-finished
  // login; it is opaque and short-lived, and it is the only thing the PIN can
  // be spent against.
  const [pinToken, setPinToken] = useState("");
  const [pinUserName, setPinUserName] = useState<string | undefined>();
  const [pinError, setPinError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  // Feature detection has to run in the browser, so the button is absent during
  // SSR rather than flashing in and out.
  useEffect(() => setSupported(passkeysSupported()), []);

  useEffect(() => onStageChange?.(stage), [stage, onStageChange]);

  if (!supported) return null;

  const goTo = (next: Stage) => setStage(next);

  const runCeremony = async (withIdentifier?: string) => {
    setBusy(true);
    setError("");
    try {
      const begin = await passkeyAPI.beginLogin(tenantSubdomain, withIdentifier);
      const { challenge_id, options } = begin.data.data;

      const assertion = await getPasskeyAssertion(options);
      const finish = await passkeyAPI.finishLogin(challenge_id, assertion);
      const payload = finish.data.data;

      if (payload?.pin_required) {
        setPinToken(payload.pin_token);
        setPinUserName(payload.user?.name);
        setPinError("");
        setAttemptsLeft(null);
        goTo("pin");
        return;
      }
      onSuccess(payload.user as AuthUser);
    } catch (err) {
      const server = (err as { response?: { data?: { error?: string } } }).response;
      if (server?.data?.error) {
        // A rejection from our own API — a wrong tenant, a suspended
        // organisation, an expired challenge — says something specific.
        setError(server.data.error);
      } else {
        const { message, cancelled } = describePasskeyError(err);
        // Cancellation and "nothing to offer" are the same error from the
        // browser, so the quiet path covers both: no banner, and the fallback
        // link below becomes the way forward.
        setError(cancelled ? "" : message);
        if (cancelled && !withIdentifier) setFallbackOffered(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const submitPin = async (pin: string) => {
    setBusy(true);
    setPinError("");
    try {
      const res = await passkeyAPI.verifyPin(pinToken, pin);
      onSuccess(res.data.data.user as AuthUser);
    } catch (err) {
      const e = err as {
        response?: { status?: number; data?: { error?: string; data?: { attempts_remaining?: number } } };
      };
      const message = e.response?.data?.error || "Incorrect PIN";
      // A lockout (429) or a dead pending token (401) ends this attempt: the
      // PIN cannot be retried, so returning to the passkey button is the
      // honest state rather than leaving a field that will keep failing.
      if (e.response?.status === 429 || e.response?.status === 401) {
        setPinToken("");
        setPinError("");
        setError(message);
        goTo("idle");
      } else {
        setPinError(message);
        setAttemptsLeft(e.response?.data?.data?.attempts_remaining ?? null);
      }
    } finally {
      setBusy(false);
    }
  };

  if (stage === "pin") {
    return (
      <PinDialog
        userName={pinUserName}
        submitting={busy}
        error={pinError}
        attemptsRemaining={attemptsLeft}
        onSubmit={submitPin}
        onCancel={() => {
          setPinToken("");
          setPinError("");
          goTo("idle");
        }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {error && (
        <p style={{ margin: 0, fontSize: "13px", color: C.red, lineHeight: 1.4 }}>{error}</p>
      )}

      {stage === "identifier" && (
        <div>
          <label
            style={{ display: "block", fontSize: "13px", fontWeight: 600, color: C.label, marginBottom: "6px" }}
          >
            Which account?
          </label>
          <input
            type="text"
            value={identifier}
            autoFocus
            onChange={(e) => setIdentifier(e.target.value)}
            onFocus={() => setIdentifierFocused(true)}
            onBlur={() => setIdentifierFocused(false)}
            placeholder={identifierHint || "you@example.com"}
            autoComplete="username webauthn"
            style={inputStyle(identifierFocused)}
          />
          <p style={{ margin: "6px 0 0", fontSize: "12px", color: C.placeholder, lineHeight: 1.4 }}>
            Your device did not offer a passkey. Naming the account lets it look
            for a matching one.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={disabled || busy || (stage === "identifier" && !identifier.trim())}
        onClick={() =>
          runCeremony(
            stage === "identifier"
              ? identifier.trim() || identifierHint?.trim()
              : undefined
          )
        }
        style={{
          width: "100%", padding: "13px", fontSize: "16px", fontWeight: 600, fontFamily: FONT,
          color: C.blue, backgroundColor: C.surface,
          border: `1.5px solid ${C.blue}`, borderRadius: "12px",
          cursor: disabled || busy ? "not-allowed" : "pointer",
          opacity: disabled || busy ? 0.6 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {busy ? (
          <Loader2 size={18} className="animate-spin" />
        ) : stage === "identifier" ? (
          <KeyRound size={18} />
        ) : (
          <Fingerprint size={18} />
        )}
        {busy ? "Waiting for your device…" : "Sign in with a passkey"}
      </button>

      {stage === "identifier" ? (
        <button
          type="button"
          onClick={() => {
            setIdentifier("");
            setError("");
            goTo("idle");
          }}
          style={linkStyle}
        >
          Back
        </button>
      ) : (
        fallbackOffered && (
          <button
            type="button"
            onClick={() => {
              setIdentifier(identifierHint?.trim() || "");
              goTo("identifier");
            }}
            style={linkStyle}
          >
            Didn&rsquo;t see your passkey? Enter your account ID
          </button>
        )
      )}
    </div>
  );
}
