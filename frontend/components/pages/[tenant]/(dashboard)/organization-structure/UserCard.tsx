"use client";

import type { OrgUser } from "./types";

interface Props {
  user: OrgUser;
  highlighted?: boolean;
  onClick?: () => void;
}

// UserCard renders a single person tile inside the org tree.
export default function UserCard({ user, highlighted, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card flex items-center gap-3 px-3 py-2 text-left w-full hover:bg-secondary/40 transition"
      style={{
        borderColor: highlighted ? "rgb(var(--primary))" : undefined,
        background: highlighted ? "rgb(var(--primary) / 0.06)" : undefined,
      }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0"
        style={{ background: "rgb(var(--primary) / 0.12)", color: "rgb(var(--primary))" }}
      >
        {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {user.designation || user.role}
          {user.email ? ` · ${user.email}` : ""}
        </p>
      </div>
    </button>
  );
}
