"use client";

/**
 * An admin's view of one user's sessions, with a single "sign out everywhere"
 * action.
 *
 * Deliberately coarser than the self-service card: an admin's question is "does
 * this person still have access?", not "which of these tabs is mine". There is
 * no per-session revoke here, because picking one device out of someone else's
 * list is not a decision an admin is equipped to make.
 */

import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import toast from "react-hot-toast";
import { MonitorSmartphone } from "lucide-react";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { USER_SESSIONS } from "@/graphql/queries/sessions";
import { REVOKE_USER_SESSIONS } from "@/graphql/mutations/sessions";
import SessionRow, { type SessionItem } from "./SessionRow";

interface Props {
  userId: string;
  userName: string;
}

export default function UserSessionsPanel({ userId, userName }: Props) {
  const { data, loading, refetch } = useQuery(USER_SESSIONS, {
    variables: { userId },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
    skip: !userId,
  });
  const [revokeAll, { loading: revoking }] = useMutation(REVOKE_USER_SESSIONS);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const sessions: SessionItem[] = data?.userSessions ?? [];

  const handleRevokeAll = () => {
    setConfirm({
      title: `Sign ${userName} out everywhere?`,
      message:
        "Every device they are signed in on will be signed out. They can log in again unless the account is also deactivated.",
      variant: "warning",
      confirmLabel: "Sign out everywhere",
      onConfirm: async () => {
        try {
          const res = await revokeAll({ variables: { userId } });
          await refetch();
          const n = res.data?.revokeUserSessions ?? 0;
          toast.success(`Signed out of ${n} session${n === 1 ? "" : "s"}`);
        } catch {
          toast.error("Could not sign the user out");
        }
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}
        >
          <MonitorSmartphone size={15} style={{ color: "#0891b2" }} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-foreground">Active Sessions</h4>
          <p className="text-xs text-muted-foreground">
            Devices {userName} is currently signed in on
          </p>
        </div>
        {sessions.length > 0 && (
          <button type="button" className="btn-ghost text-xs" style={{ color: "#dc2626" }} disabled={revoking} onClick={handleRevokeAll}>
            Sign out everywhere
          </button>
        )}
      </div>

      {loading && sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not signed in on any device.</p>
      ) : (
        <ul className="-my-1">
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </ul>
      )}

      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} loading={revoking} />
    </div>
  );
}
