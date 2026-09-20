"use client";

import { Lock, Shield, Sparkles } from "lucide-react";
import { subjectKeyOf } from "@/store/slices/accessSlice";
import type { RoleAccess } from "@/types";

// Horizontal pills to pick which role's access to edit. The selected pill is
// highlighted; the Admin pill is marked locked (always full access).
export default function RoleSelector({
  roles,
  selected,
  dirtyKey,
  onSelect,
}: {
  roles: RoleAccess[];
  selected: string;
  dirtyKey: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((r) => {
        const key = subjectKeyOf(r.subjectType, r.subjectKey);
        const isAdmin = r.subjectType === "system" && r.subjectKey === "admin";
        const active = key === selected;
        const dirty = key === dirtyKey;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              active
                ? "bg-primary text-white border-primary"
                : "bg-card text-foreground border-border hover:border-primary/50"
            }`}
          >
            {r.isCustom ? <Sparkles size={13} /> : <Shield size={13} />}
            {r.label}
            {isAdmin && <Lock size={12} className="opacity-70" />}
            {dirty && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-400"
                title="Unsaved changes"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
