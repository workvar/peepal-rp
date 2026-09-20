"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { Download } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { SYSTEM_UPDATE_STATUS } from "@/graphql/queries/systemUpdate";
import {
  APPLY_SYSTEM_UPDATE,
  SNOOZE_SYSTEM_UPDATE,
} from "@/graphql/mutations/systemUpdate";

const POLL_MS = 5 * 60 * 1000;

/**
 * Tenant-admin prompt when peepal-agent reports a newer release. Polls every
 * 5 minutes and on window focus; Update now confirms downtime, Remind later
 * snoozes the popup for this tenant for one hour.
 */
export default function SystemUpdatePrompt() {
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin";

  const { data, refetch } = useQuery(SYSTEM_UPDATE_STATUS, {
    skip: !isAdmin,
    fetchPolicy: "network-only",
    pollInterval: isAdmin ? POLL_MS : 0,
  });

  const [snoozeMut] = useMutation(SNOOZE_SYSTEM_UPDATE);
  const [applyMut] = useMutation(APPLY_SYSTEM_UPDATE);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [applying, setApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    const onFocus = () => {
      void refetch();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isAdmin, refetch]);

  const status = data?.systemUpdateStatus;
  const showPrompt =
    isAdmin &&
    !dismissed &&
    !!status &&
    status.updateAvailable &&
    !status.snoozed &&
    status.agentReachable;

  const handleRemindLater = useCallback(async () => {
    try {
      await snoozeMut();
      setDismissed(true);
    } catch {
      // Soft-fail: leave the prompt visible so the admin can retry.
    }
  }, [snoozeMut]);

  const handleUpdateNow = useCallback(() => {
    setConfirmState({
      title: "Apply update now?",
      message: "The app will be briefly unavailable while the update is applied.",
      variant: "warning",
      confirmLabel: "Update now",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        setApplying(true);
        try {
          await applyMut();
          setDismissed(true);
        } catch {
          // Soft-fail: agent may already be updating or unreachable.
        } finally {
          setApplying(false);
        }
      },
    });
  }, [applyMut]);

  if (!isAdmin) return null;

  return (
    <>
      {showPrompt && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 animate-overlay-in"
            style={{
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          />

          <div
            className="relative w-full max-w-sm animate-dialog-in flex flex-col overflow-hidden"
            style={{
              background: "rgb(var(--card))",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "1.5rem",
              boxShadow:
                "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
            }}
            role="dialog"
            aria-labelledby="system-update-title"
            aria-modal="true"
          >
            <div
              className="absolute top-0 left-0 right-0 h-[3px] z-10"
              style={{
                background: "#d97706",
                borderRadius: "1.5rem 1.5rem 0 0",
              }}
            />

            <div className="px-7 pt-8 pb-6 flex flex-col items-center text-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgba(245,158,11,0.12)",
                  border: "1px solid rgba(245,158,11,0.25)",
                }}
              >
                <Download size={26} style={{ color: "#d97706" }} />
              </div>

              <div>
                <h3
                  id="system-update-title"
                  className="text-lg font-bold text-foreground tracking-tight"
                >
                  New updates are available. Do you want to update?
                </h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {(status?.activeUsersInTenant ?? 0) === 1
                    ? "1 active user in this organisation"
                    : `${status?.activeUsersInTenant ?? 0} active users in this organisation`}
                </p>
              </div>
            </div>

            <div
              className="flex items-center gap-3 px-7 py-5"
              style={{
                borderTop: "1px solid rgb(var(--border) / 0.6)",
                background: "rgb(var(--muted) / 0.3)",
              }}
            >
              <button
                type="button"
                onClick={() => void handleRemindLater()}
                className="btn btn-secondary flex-1"
              >
                Remind later
              </button>
              <button
                type="button"
                onClick={handleUpdateNow}
                className="btn flex-1 text-white"
                style={{
                  background: "#d97706",
                  boxShadow: "0 4px 14px rgba(245,158,11,0.3)",
                }}
              >
                Update now
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        state={confirmState}
        onClose={() => setConfirmState(null)}
        loading={applying}
      />
    </>
  );
}
