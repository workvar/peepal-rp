"use client";

// components/security/PasskeysCard.tsx — "your passkeys", and the button that
// adds one.
//
// The list is refetched after every change rather than patched locally, for the
// same reason the session list is: removing the last passkey also removes the
// PIN server-side, so the state after a delete is not always the state the
// client predicted.

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Check, Fingerprint, KeyRound, Loader2, Pencil, Trash2, X } from "lucide-react";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { passkeyAPI, type PasskeySummary } from "@/api/services/passkeys";
import {
  createPasskey,
  describePasskeyError,
  passkeysSupported,
  suggestPasskeyName,
} from "@/lib/webauthn";

interface Props {
  /** Told when the passkey count changes, so the PIN card can re-read its state. */
  onChanged?: () => void;
}

export default function PasskeysCard({ onChanged }: Props) {
  const [supported, setSupported] = useState(true);
  const [passkeys, setPasskeys] = useState<PasskeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await passkeyAPI.list();
      setPasskeys(res.data.data.passkeys ?? []);
    } catch {
      toast.error("Could not load your passkeys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSupported(passkeysSupported());
    load();
  }, [load]);

  const handleAdd = async () => {
    setAdding(true);
    try {
      const begin = await passkeyAPI.beginRegistration();
      const { challenge_id, options } = begin.data.data;
      const credential = await createPasskey(options);
      await passkeyAPI.finishRegistration(challenge_id, credential, suggestPasskeyName());
      toast.success("Passkey added");
      await load();
      onChanged?.();
    } catch (err) {
      const server = (err as { response?: { data?: { error?: string } } }).response;
      if (server?.data?.error) {
        toast.error(server.data.error);
      } else {
        const { message, cancelled } = describePasskeyError(err);
        // A dismissed prompt is a decision, not a failure.
        if (!cancelled) toast.error(message);
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRename = async (id: string) => {
    const name = draftName.trim();
    if (!name) return;
    try {
      await passkeyAPI.rename(id, name);
      setEditing(null);
      await load();
    } catch {
      toast.error("Could not rename that passkey");
    }
  };

  const handleDelete = (passkey: PasskeySummary) => {
    const last = passkeys.length === 1;
    setConfirm({
      title: "Remove this passkey?",
      message: last
        ? `${passkey.name} is your only passkey. Removing it also turns off your sign-in PIN, and you will sign in with your password until you add another.`
        : `${passkey.name} will no longer be able to sign you in.`,
      variant: "warning",
      confirmLabel: "Remove",
      onConfirm: async () => {
        try {
          await passkeyAPI.remove(passkey.id);
          toast.success("Passkey removed");
          await load();
          onChanged?.();
        } catch {
          toast.error("Could not remove that passkey");
        }
      },
    });
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(0,122,255,0.1)", border: "1px solid rgba(0,122,255,0.2)" }}
          >
            <Fingerprint size={15} style={{ color: "#007AFF" }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Passkeys</h3>
            <p className="text-xs text-muted-foreground">
              Sign in with your fingerprint, face, or device PIN instead of a password
            </p>
          </div>
        </div>
        {supported && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="btn-primary flex items-center gap-2 shrink-0"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            {adding ? "Waiting…" : "Add passkey"}
          </button>
        )}
      </div>

      {!supported && (
        <p className="text-sm text-muted-foreground">
          This browser does not support passkeys. Try a current version of Chrome,
          Safari, Edge, or Firefox.
        </p>
      )}

      {supported && loading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {supported && !loading && passkeys.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No passkeys yet. Adding one lets you sign in without typing a password,
          and it cannot be phished — the key only works on this site.
        </p>
      )}

      {supported && passkeys.length > 0 && (
        <ul className="divide-y" style={{ borderColor: "rgb(var(--border))" }}>
          {passkeys.map((pk) => (
            <li key={pk.id} className="flex items-center gap-3 py-3">
              <Fingerprint size={16} className="text-muted-foreground shrink-0" />

              <div className="flex-1 min-w-0">
                {editing === pk.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="input-field py-1"
                      value={draftName}
                      autoFocus
                      maxLength={60}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(pk.id);
                        if (e.key === "Escape") setEditing(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRename(pk.id)}
                      aria-label="Save name"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      aria-label="Cancel"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground truncate">{pk.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(pk.created_at).toLocaleDateString()}
                      {pk.last_used_at
                        ? ` · Last used ${new Date(pk.last_used_at).toLocaleDateString()}`
                        : " · Not used yet"}
                      {/* Worth saying: a device-bound key is gone with the
                          device, which is the case for adding a second one. */}
                      {pk.synced ? " · Synced across your devices" : " · This device only"}
                    </p>
                    {pk.clone_warning && (
                      <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
                        This passkey&rsquo;s security counter went backwards, which can mean it
                        was copied. Remove it and add a new one.
                      </p>
                    )}
                  </>
                )}
              </div>

              {editing !== pk.id && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(pk.id);
                      setDraftName(pk.name);
                    }}
                    aria-label={`Rename ${pk.name}`}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(pk)}
                    aria-label={`Remove ${pk.name}`}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {confirm && (
        <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
      )}
    </div>
  );
}
