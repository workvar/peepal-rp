"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { useTerminology } from "@/store/hooks/useTerminology";
import {
  hasMultipleWorkspaces,
  workspaceHint,
  workspaceIcon,
  workspaceLabel,
} from "@/lib/workspaces";
import { useWorkspaceSwitch } from "./useWorkspaceSwitch";

/**
 * Workspace picker pinned at the top of the sidebar.
 *
 * Users who hold a single role never see it — it collapses to a plain identity
 * chip, so nothing changes for the vast majority of accounts.
 */
export default function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const user = useAppSelector((s) => s.auth.user);
  const terms = useTerminology();
  const { switchTo, switching, error } = useWorkspaceSwitch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape so the panel never traps focus.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const workspaces = user.workspaces ?? [];
  const active = workspaces.find((w) => w.role === user.role);
  const multi = hasMultipleWorkspaces(workspaces);
  const ActiveIcon = workspaceIcon(user.role);
  const activeLabel = active ? workspaceLabel(active, terms) : user.role.replace("_", " ");

  // Collapsed rail: just the workspace icon, still clickable when multi-role.
  if (collapsed) {
    return (
      <div className="flex justify-center mt-3 mb-1" ref={ref}>
        <button
          onClick={() => multi && setOpen((o) => !o)}
          title={multi ? `${activeLabel} — switch workspace` : activeLabel}
          aria-label={multi ? "Switch workspace" : activeLabel}
          disabled={!multi}
          className="p-2 rounded-lg bg-card border border-border text-primary hover:bg-primary/10 transition-colors disabled:cursor-default"
        >
          <ActiveIcon size={16} />
        </button>
        {open && (
          <WorkspaceMenu
            className="fixed left-[4.75rem] z-50 w-64"
            activeRole={user.role}
            switching={switching}
            error={error}
            onPick={switchTo}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative mx-3 mt-3 mb-1" ref={ref}>
      <button
        onClick={() => multi && setOpen((o) => !o)}
        disabled={!multi}
        aria-haspopup={multi ? "listbox" : undefined}
        aria-expanded={multi ? open : undefined}
        className={`w-full text-left px-3 py-2.5 rounded-xl bg-card border border-border transition-colors ${
          multi ? "hover:border-primary/40 cursor-pointer" : "cursor-default"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate leading-tight text-foreground">
              {user.name}
            </p>
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
              <ActiveIcon size={11} />
              {activeLabel}
            </span>
          </div>
          {multi &&
            (switching ? (
              <Loader2 size={15} className="shrink-0 text-muted-foreground animate-spin" />
            ) : (
              <ChevronsUpDown size={15} className="shrink-0 text-muted-foreground" />
            ))}
        </div>
      </button>

      {open && (
        <WorkspaceMenu
          className="absolute left-0 right-0 top-full mt-1 z-50"
          activeRole={user.role}
          switching={switching}
          error={error}
          onPick={switchTo}
        />
      )}
    </div>
  );
}

/** The dropdown body. Split out so the collapsed and expanded rails share it. */
function WorkspaceMenu({
  className,
  activeRole,
  switching,
  error,
  onPick,
}: {
  className: string;
  activeRole: string;
  switching: string | null;
  error: string | null;
  onPick: (role: string) => void;
}) {
  const user = useAppSelector((s) => s.auth.user);
  const terms = useTerminology();
  const workspaces = user?.workspaces ?? [];

  return (
    <div
      role="listbox"
      className={`${className} rounded-xl border border-border bg-card shadow-lg overflow-hidden`}
    >
      <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Switch workspace
      </p>
      {workspaces.map((w) => {
        const Icon = workspaceIcon(w.role);
        const isActive = w.role === activeRole;
        return (
          <button
            key={w.role}
            role="option"
            aria-selected={isActive}
            disabled={isActive || !!switching}
            onClick={() => onPick(w.role)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors disabled:cursor-default ${
              isActive ? "bg-primary/5" : "hover:bg-secondary"
            }`}
          >
            <Icon size={15} className={isActive ? "text-primary" : "text-muted-foreground"} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium truncate text-foreground">
                {workspaceLabel(w, terms)}
              </span>
              <span className="block text-[11px] truncate text-muted-foreground">
                {workspaceHint(w.role, terms)}
              </span>
            </span>
            {switching === w.role ? (
              <Loader2 size={14} className="shrink-0 text-muted-foreground animate-spin" />
            ) : (
              isActive && <Check size={14} className="shrink-0 text-primary" />
            )}
          </button>
        );
      })}
      {error && <p className="px-3 py-2 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
