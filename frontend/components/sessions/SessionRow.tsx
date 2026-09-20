"use client";

/**
 * One signed-in session in a list.
 *
 * Presentational only: it knows nothing about who owns the session or what
 * revoking means, so the same row serves the user's own list and the admin's
 * view of somebody else's.
 */

import { Monitor, Smartphone, Tablet, Globe } from "lucide-react";
import { relativeTime, absoluteTime } from "./formatting";

export interface SessionItem {
  id: string;
  current: boolean;
  activeRole: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  deviceLabel: string;
  userAgent: string | null;
  ip: string | null;
}

function DeviceIcon({ label }: { label: string }) {
  const l = label.toLowerCase();
  const Icon = /iphone|android/.test(l)
    ? Smartphone
    : /ipad|tablet/.test(l)
      ? Tablet
      : /windows|macos|linux|chromeos/.test(l)
        ? Monitor
        : Globe;
  return <Icon size={15} className="text-muted-foreground" />;
}

interface Props {
  session: SessionItem;
  /** Omit to render the row without a revoke control (read-only lists). */
  onRevoke?: (session: SessionItem) => void;
  busy?: boolean;
}

export default function SessionRow({ session, onRevoke, busy }: Props) {
  return (
    <li className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "rgb(var(--muted))" }}
      >
        <DeviceIcon label={session.deviceLabel} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">
            {session.deviceLabel}
          </span>
          {session.current && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(5,150,105,0.12)", color: "#059669" }}
            >
              This device
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {/* The raw UA is the title so support can read it without a UI for it. */}
          <span title={session.userAgent ?? undefined}>
            Last active {relativeTime(session.lastUsedAt)}
          </span>
          {session.ip ? ` · ${session.ip}` : ""}
          {session.activeRole ? ` · ${session.activeRole}` : ""}
        </p>
        <p className="text-[11px] text-muted-foreground/70" title={absoluteTime(session.createdAt)}>
          Signed in {relativeTime(session.createdAt)}
        </p>
      </div>

      {onRevoke && (
        <button
          type="button"
          className="btn-ghost text-xs shrink-0"
          style={{ color: "#dc2626" }}
          disabled={busy}
          onClick={() => onRevoke(session)}
        >
          {session.current ? "Sign out here" : "Sign out"}
        </button>
      )}
    </li>
  );
}
