"use client";

import { useMemo, useState } from "react";
import {
  MonthGrid,
  MonthNav,
  DayAgenda,
  groupByDate,
  toISODate,
  type CalendarEvent,
  type EventTone,
} from "@/components/ui/EventCalendar";
import NowStrip from "./NowStrip";
import { timingOf } from "./timing";
import type { GqlAppointment } from "./types";

const STATUS_TONE: Record<string, EventTone> = {
  scheduled: "blue",
  completed: "green",
  no_show: "amber",
};

/** Declined/cancelled bookings are noise on a diary, so the calendar drops them. */
const CALENDAR_STATUSES = new Set(["scheduled", "completed", "no_show"]);

// Month view of the bookings the caller is allowed to see. For a clinician the
// backend has already narrowed the list to their own diary, so this is simply
// "my calendar"; for admins and front desk it is the whole tenant's.
export default function AppointmentCalendar({
  appointments: all,
  showClinician,
}: {
  appointments: GqlAppointment[];
  showClinician: boolean;
}) {
  const appointments = useMemo(
    () => all.filter((a) => CALENDAR_STATUSES.has(a.status)),
    [all],
  );
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(toISODate(today));

  const events: CalendarEvent[] = useMemo(
    () =>
      appointments.map((a) => {
        const live = a.status === "scheduled" && timingOf(a) === "ongoing";
        const parts = [
          showClinician ? a.clinicianName : null,
          a.reason,
          live ? "in progress" : null,
        ].filter(Boolean);
        return {
          id: a.id,
          date: a.date,
          time: a.startTime,
          title: `${a.patientName}${a.patientMrn ? ` (${a.patientMrn})` : ""}`,
          subtitle: parts.join(" · ") || null,
          tone: live ? "green" : STATUS_TONE[a.status] ?? "gray",
        };
      }),
    [appointments, showClinician],
  );

  const byDate = useMemo(() => groupByDate(events), [events]);

  const goToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelected(toISODate(now));
  };

  return (
    <div className="space-y-4">
      <NowStrip appointments={appointments} />
      <MonthNav
        year={year}
        month={month}
        onChange={(y, m) => { setYear(y); setMonth(m); }}
        onToday={goToday}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <MonthGrid
          year={year}
          month={month}
          byDate={byDate}
          selected={selected}
          onSelect={setSelected}
        />
        <DayAgenda
          date={selected}
          events={selected ? byDate[selected] ?? [] : []}
          emptyText="No appointments on this day."
        />
      </div>
    </div>
  );
}
