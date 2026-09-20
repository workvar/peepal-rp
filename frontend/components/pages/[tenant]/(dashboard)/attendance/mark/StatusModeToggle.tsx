"use client";

import type { MarkStatus } from "./types";

// The paint mode the user picks before clicking days. Each mode carries the
// active (filled) and idle styles so the calendar legend reads at a glance.
const MODES: { key: MarkStatus; label: string; active: string; idle: string }[] = [
  {
    key: "present",
    label: "Mark Present",
    active: "bg-emerald-500 text-white border-emerald-500 shadow-sm",
    idle: "bg-card text-emerald-700 dark:text-emerald-400 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
  },
  {
    key: "absent",
    label: "Mark Absent",
    active: "bg-red-500 text-white border-red-500 shadow-sm",
    idle: "bg-card text-red-700 dark:text-red-400 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20",
  },
  {
    key: "late",
    label: "Mark Late",
    active: "bg-amber-500 text-white border-amber-500 shadow-sm",
    idle: "bg-card text-amber-700 dark:text-amber-400 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20",
  },
];

interface Props {
  value: MarkStatus;
  onChange: (mode: MarkStatus) => void;
}

export default function StatusModeToggle({ value, onChange }: Props) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(m.key)}
            aria-pressed={value === m.key}
            className={[
              "py-2 rounded-lg text-sm font-semibold border transition-colors",
              value === m.key ? m.active : m.idle,
            ].join(" ")}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Pick a mode, then click days on the calendar. Clicking a day again with the
        same mode clears it.
      </p>
    </div>
  );
}
