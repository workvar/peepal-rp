"use client";

import { Clock, Radio } from "lucide-react";
import type { GqlAppointment } from "./types";
import { timingOf, upcomingAppointments } from "./timing";

// A one-line banner above the calendar: what is happening right now, or what
// is next. Kept separate so the calendar stays a pure month view.
export default function NowStrip({ appointments }: { appointments: GqlAppointment[] }) {
  const queue = upcomingAppointments(appointments);
  const ongoing = queue.find((a) => timingOf(a) === "ongoing");
  const next = queue.find((a) => timingOf(a) === "upcoming");
  const item = ongoing ?? next;

  if (!item) {
    return (
      <div className="card flex items-center gap-2 text-sm text-muted-foreground/70">
        <Clock size={15} /> Nothing scheduled ahead.
      </div>
    );
  }

  const live = Boolean(ongoing);

  return (
    <div
      className={`card flex flex-wrap items-center gap-x-3 gap-y-1 border-l-4 ${
        live ? "border-l-emerald-500" : "border-l-blue-500"
      }`}
    >
      <span
        className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
          live ? "text-emerald-600" : "text-blue-600"
        }`}
      >
        {live ? <Radio size={14} /> : <Clock size={14} />}
        {live ? "In progress" : "Up next"}
      </span>
      <span className="font-medium">{item.patientName}</span>
      <span className="text-xs text-muted-foreground/70">({item.patientMrn})</span>
      <span className="font-mono text-sm">
        {item.date} · {item.startTime}
        {item.endTime ? `–${item.endTime}` : ""}
      </span>
      {item.reason && (
        <span className="text-sm text-muted-foreground/70">{item.reason}</span>
      )}
    </div>
  );
}
