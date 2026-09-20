"use client";

import { CalendarDays, List } from "lucide-react";

export type AppointmentView = "list" | "calendar";

const TABS: { key: AppointmentView; label: string; Icon: typeof List }[] = [
  { key: "list", label: "List", Icon: List },
  { key: "calendar", label: "Calendar", Icon: CalendarDays },
];

// List / Calendar switch for the Appointments page.
export default function ViewToggle({
  view,
  onChange,
}: {
  view: AppointmentView;
  onChange: (v: AppointmentView) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border/60 p-0.5">
      {TABS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
            view === key ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <Icon size={15} /> {label}
        </button>
      ))}
    </div>
  );
}
