"use client";

/**
 * "Where you're signed in" — the user's own session list, with the controls to
 * end them.
 *
 * Two things make this more than a list. First, signing out of the current
 * device is allowed: it is a legitimate thing to ask for, and the app simply
 * lands back on the login screen at its next request, so it is confirmed
 * separately rather than hidden. Second, the list is refetched after every
 * revoke instead of being patched locally — a revoke can end more rows than the
 * one clicked, and re-reading is the only way to show what is actually left.
 */

import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import toast from "react-hot-toast";
import { MonitorSmartphone } from "lucide-react";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { MY_SESSIONS } from "@/graphql/queries/sessions";
import {
  REVOKE_MY_OTHER_SESSIONS,
  REVOKE_MY_SESSION,
} from "@/graphql/mutations/sessions";
import SessionRow, { type SessionItem } from "./SessionRow";

export default function ActiveSessionsCard() {
  const { data, loading, refetch } = useQuery(MY_SESSIONS, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const [revokeOne, { loading: revokingOne }] = useMutation(REVOKE_MY_SESSION);
  const [revokeOthers, { loading: revokingOthers }] = useMutation(REVOKE_MY_OTHER_SESSIONS);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const sessions: SessionItem[] = data?.mySessions ?? [];
  const others = sessions.filter((s) => !s.current);
  const busy = revokingOne || revokingOthers;

  const handleRevoke = (session: SessionItem) => {
    setConfirm({
      title: session.current ? "Sign out of this device?" : "Sign out that device?",
      message: session.current
        ? "You will be returned to the login screen on this device."
        : `${session.deviceLabel} will be signed out immediately and will need to log in again.`,
      variant: "warning",
      confirmLabel: "Sign out",
      onConfirm: async () => {
        try {
          await revokeOne({ variables: { sessionId: session.id } });
          if (session.current) {
            // Nothing to refetch: the credential this page holds is gone, so
            // send the browser through the login flow rather than letting it
            // discover the 401 on some unrelated click.
            window.location.href = "/login";
            return;
          }
          await refetch();
          toast.success("Signed out");
        } catch {
          toast.error("Could not sign out that session");
        }
      },
    });
  };

  const handleRevokeOthers = () => {
    setConfirm({
      title: "Sign out everywhere else?",
      message: `This ends ${others.length} other session${others.length === 1 ? "" : "s"}. This device stays signed in.`,
      variant: "warning",
      confirmLabel: "Sign out others",
      onConfirm: async () => {
        try {
          const res = await revokeOthers();
          await refetch();
          const n = res.data?.revokeMyOtherSessions ?? 0;
          toast.success(`Signed out of ${n} other device${n === 1 ? "" : "s"}`);
        } catch {
          toast.error("Could not sign out the other sessions");
        }
      },
    });
  };

  return (
    <div id="sessions" className="card scroll-mt-24">
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}
        >
          <MonitorSmartphone size={15} style={{ color: "#0891b2" }} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground">Where You&apos;re Signed In</h3>
          <p className="text-xs text-muted-foreground">
            Sign out any device you don&apos;t recognise, or no longer have
          </p>
        </div>
        {others.length > 0 && (
          <button type="button" className="btn-ghost text-xs" disabled={busy} onClick={handleRevokeOthers}>
            Sign out everywhere else
          </button>
        )}
      </div>

      {loading && sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Loading sessions…</p>
      ) : sessions.length === 0 ? (
        // Reachable when the list is served to a client holding only an access
        // token (no refresh family), so it says nothing alarming.
        <p className="text-sm text-muted-foreground py-2">No other active sessions.</p>
      ) : (
        <ul className="-my-1">
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} onRevoke={handleRevoke} busy={busy} />
          ))}
        </ul>
      )}

      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} loading={busy} />
    </div>
  );
}
