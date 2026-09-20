"use client";

// components/auth/PinDialog.tsx — the second step of a passkey login for
// accounts that added a PIN.
//
// The passkey already proved the device. This proves the person, which is the
// point on a shared or unattended machine. It is deliberately a plain focused
// field rather than six boxes: six boxes look tidier and behave worse on
// mobile, where paste, autofill and backspace all have to be reimplemented.

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { C, FONT } from "./theme";

interface Props {
  /** Shown above the field so the user knows which account they are finishing. */
  userName?: string;
  submitting: boolean;
  error: string;
  /** Remaining tries before the account locks; hidden until a miss happens. */
  attemptsRemaining?: number | null;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
}

export default function PinDialog({
  userName,
  submitting,
  error,
  attemptsRemaining,
  onSubmit,
  onCancel,
}: Props) {
  const [pin, setPin] = useState("");
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // The user just touched their authenticator; landing them on the field means
  // they can keep typing without hunting for it.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // A wrong PIN clears the field rather than leaving the rejected digits in
  // place to be edited — retyping six digits is faster than correcting them.
  useEffect(() => {
    if (error) setPin("");
  }, [error]);

  const complete = pin.length === 6;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (complete && !submitting) onSubmit(pin);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 44, height: 44, borderRadius: 14, margin: "0 auto 10px",
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "rgba(0,122,255,0.1)",
          }}
        >
          <ShieldCheck size={22} color={C.blue} />
        </div>
        <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: C.label }}>
          Enter your PIN
        </h2>
        <p style={{ margin: 0, fontSize: "14px", color: C.placeholder }}>
          {userName
            ? `Passkey verified for ${userName}. One more step.`
            : "Passkey verified. One more step."}
        </p>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "rgba(255,59,48,0.08)",
            border: "1px solid rgba(255,59,48,0.25)",
            borderRadius: "10px", padding: "10px 12px",
          }}
        >
          <p style={{ margin: 0, fontSize: "13px", color: C.red, lineHeight: 1.4 }}>
            {error}
            {typeof attemptsRemaining === "number" && attemptsRemaining > 0 && (
              <> {attemptsRemaining} attempt{attemptsRemaining === 1 ? "" : "s"} left.</>
            )}
          </p>
        </div>
      )}

      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          // A numeric keypad on mobile, and one-time-code autofill where the
          // platform offers it.
          type={visible ? "text" : "password"}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="••••••"
          disabled={submitting}
          aria-label="6-digit PIN"
          style={{
            width: "100%", padding: "14px 44px 14px 14px",
            fontSize: "24px", fontFamily: FONT, fontWeight: 600,
            letterSpacing: "10px", textAlign: "center",
            color: C.label,
            backgroundColor: focused ? C.surface : C.fill,
            border: `1.5px solid ${focused ? C.blue : C.separator}`,
            borderRadius: "12px", outline: "none", boxSizing: "border-box",
            boxShadow: focused ? "0 0 0 4px rgba(0,122,255,0.12)" : "none",
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide PIN" : "Show PIN"}
          style={{
            position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: C.placeholder, padding: 0,
          }}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <button
        type="submit"
        disabled={!complete || submitting}
        style={{
          width: "100%", padding: "13px", fontSize: "16px", fontWeight: 600,
          fontFamily: FONT, color: "#fff",
          backgroundColor: !complete || submitting ? "#aaa" : C.blue,
          border: "none", borderRadius: "12px",
          cursor: !complete || submitting ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitting ? "Verifying…" : "Continue"}
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        style={{
          background: "none", border: "none", fontSize: "14px", fontFamily: FONT,
          color: C.placeholder, cursor: submitting ? "not-allowed" : "pointer", padding: 0,
        }}
      >
        Use a different sign-in method
      </button>
    </form>
  );
}
