"use client";

import { DAYS, type DayOfWeek } from "@/store/slices/timetableSlice";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Clock, CalendarDays } from "lucide-react";
import { type TimetableSlot, DAY_COLORS, DAY_TEXT, formatTime } from "./types";

// ── Read-only slot card ──────────────────────────────────────────────────────

function ReadOnlySlotCard({ slot }: { slot: TimetableSlot }) {
  const day = slot.dayOfWeek;
  return (
    <div
      className="rounded-2xl p-3 text-sm"
      style={{ background: DAY_COLORS[day], border: `1px solid ${DAY_TEXT[day]}22` }}
    >
      <p className="font-semibold text-foreground text-xs leading-tight truncate">
        {slot.subject?.name ?? "—"}
      </p>
      {slot.subject?.code && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{slot.subject.code}</p>
      )}
      <div className="flex items-center gap-1 mt-2">
        <Clock size={10} style={{ color: DAY_TEXT[day] }} />
        <span className="text-[10px]" style={{ color: DAY_TEXT[day] }}>
          {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
        </span>
      </div>
      {slot.room && (
        <p className="text-[10px] text-muted-foreground mt-0.5">Room: {slot.room}</p>
      )}
    </div>
  );
}

// ── Read-only weekly grid ────────────────────────────────────────────────────

// Renders the caller's own timetable. The slots are already scoped to the
// student server-side, so this component just groups and displays them.
export default function StudentTimetableView({
  slots,
  loading,
}: {
  slots: TimetableSlot[];
  loading: boolean;
}) {
  if (loading && slots.length === 0) {
    return <div className="card"><LoadingSpinner text="Loading your timetable…" /></div>;
  }

  if (slots.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <CalendarDays size={40} className="text-muted-foreground opacity-30 mb-3" />
        <p className="text-muted-foreground text-sm font-medium">No classes scheduled yet</p>
        <p className="text-muted-foreground/70 text-xs mt-1">
          Your timetable will appear here once it has been published.
        </p>
      </div>
    );
  }

  const byDay = DAYS.reduce((acc, day) => {
    acc[day] = slots
      .filter((s) => s.dayOfWeek === day)
      .sort((a, b) => a.periodNumber - b.periodNumber);
    return acc;
  }, {} as Record<DayOfWeek, TimetableSlot[]>);

  // Only show days that actually have classes to keep the student view compact.
  const activeDays = DAYS.filter((d) => byDay[d].length > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
      {activeDays.map((day) => (
        <div key={day} className="card p-0 overflow-hidden">
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ background: DAY_COLORS[day], borderBottom: `1px solid ${DAY_TEXT[day]}22` }}
          >
            <span className="text-sm font-bold" style={{ color: DAY_TEXT[day] }}>{day}</span>
            <span className="badge badge-ghost text-[10px]">
              {byDay[day].length} {byDay[day].length === 1 ? "class" : "classes"}
            </span>
          </div>
          <div className="p-3 space-y-2">
            {byDay[day].map((slot) => (
              <ReadOnlySlotCard key={slot.id} slot={slot} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
