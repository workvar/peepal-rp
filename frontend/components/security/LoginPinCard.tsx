"use client";

// components/security/LoginPinCard.tsx — the optional 6-digit PIN that a
// passkey login asks for.
//
// It is second-factor only: the PIN never signs anyone in on its own, and it is
// only offered once a passkey exists, because there would otherwise be no login
// for it to be the second step of.
//
// Every change re-proves the account — with the current PIN if there is one, or
// the account password if there is not. That is not ceremony for its own sake:
// an unlocked, unattended session is exactly where someone would quietly set a
// PIN only they know.

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Lock, ShieldCheck } from "lucide-react";
import { passkeyAPI, type PINStatus } from "@/api/services/passkeys";

type Mode = "idle" | "set" | "remove";

interface Props {
  /** Bumped by the passkeys card so this one re-reads whether a PIN is possible. */
  refreshKey?: number;
}

export default function LoginPinCard({ refreshKey = 0 }: Props) {
  const [status, setStatus] = useState<PINStatus | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await passkeyAPI.pinStatus();
      setStatus(res.data.data);
    } catch {
      // Non-fatal: the card simply shows nothing rather than an alarming error
      // on a page whose main job is something else.
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const reset = () => {
    setMode("idle");
    setPin("");
    setConfirmPin("");
    setCurrentPin("");
    setPassword("");
  };

  // Which proof this account can offer: an existing PIN, or the password.
  const proof = () =>
    status?.enabled ? { currentPin } : { password };

  const digits = (value: string) => value.replace(/\D/g, "").slice(0, 6);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) {
      toast.error("Your PIN must be 6 digits");
      return;
    }
    if (pin !== confirmPin) {
      toast.error("The two PINs do not match");
      return;
    }
    setSaving(true);
    try {
      await passkeyAPI.setPin(pin, proof());
      toast.success(status?.enabled ? "PIN changed" : "PIN set");
      reset();
      await load();
    } catch (err) {
      const e2 = err as { response?: { data?: { error?: string } } };
      toast.error(e2.response?.data?.error || "Could not save your PIN");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await passkeyAPI.removePin(proof());
      toast.success("PIN removed");
      reset();
      await load();
    } catch (err) {
      const e2 = err as { response?: { data?: { error?: string } } };
      toast.error(e2.response?.data?.error || "Could not remove your PIN");
    } finally {
      setSaving(false);
    }
  };

  if (!status) return null;

  const proofField = status.enabled ? (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">Current PIN</label>
      <input
        className="input-field"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        value={currentPin}
        onChange={(e) => setCurrentPin(digits(e.target.value))}
        placeholder="••••••"
        required
      />
    </div>
  ) : (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">Account password</label>
      <input
        className="input-field"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
      />
    </div>
  );

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(52,199,89,0.1)", border: "1px solid rgba(52,199,89,0.25)" }}
        >
          {status.enabled ? (
            <ShieldCheck size={15} style={{ color: "#059669" }} />
          ) : (
            <Lock size={15} style={{ color: "#059669" }} />
          )}
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Sign-in PIN</h3>
          <p className="text-xs text-muted-foreground">
            {status.enabled
              ? "Asked for after your passkey, every time you sign in"
              : "An extra step after your passkey, for shared or unattended devices"}
          </p>
        </div>
      </div>

      {!status.has_passkeys && (
        <p className="text-sm text-muted-foreground">
          Add a passkey first. The PIN is the second step of a passkey sign-in,
          so on its own it would have nothing to protect.
        </p>
      )}

      {status.has_passkeys && mode === "idle" && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {status.enabled ? "PIN is on." : "PIN is off."}
          </span>
          <button type="button" className="btn-primary" onClick={() => setMode("set")}>
            {status.enabled ? "Change PIN" : "Set a PIN"}
          </button>
          {status.enabled && (
            <button
              type="button"
              className="text-sm font-medium text-destructive"
              onClick={() => setMode("remove")}
            >
              Turn off
            </button>
          )}
        </div>
      )}

      {status.has_passkeys && mode === "set" && (
        <form onSubmit={handleSave} className="space-y-4">
          {proofField}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">New PIN</label>
              <input
                className="input-field"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={pin}
                onChange={(e) => setPin(digits(e.target.value))}
                placeholder="6 digits"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Confirm PIN</label>
              <input
                className="input-field"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(digits(e.target.value))}
                placeholder="6 digits"
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Avoid repeated digits and simple runs (111111, 123456). Five wrong
            attempts locks PIN sign-in for 15 minutes.
          </p>
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save PIN"}
            </button>
            <button type="button" className="text-sm text-muted-foreground" onClick={reset}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {status.has_passkeys && mode === "remove" && (
        <form onSubmit={handleRemove} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your passkey alone will sign you in after this.
          </p>
          {proofField}
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-error" disabled={saving}>
              {saving ? "Removing…" : "Turn off PIN"}
            </button>
            <button type="button" className="text-sm text-muted-foreground" onClick={reset}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
