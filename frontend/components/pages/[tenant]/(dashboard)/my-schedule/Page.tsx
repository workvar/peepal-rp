"use client";

import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { MonthGrid, MonthNav, DayAgenda, groupByDate, toISODate } from "@/components/ui/EventCalendar";
import { useMyCalendar } from "./useMyCalendar";
import WindowSummary from "./WindowSummary";
import { toEvents, openWeekdays, windowsForDate } from "./types";

// My Schedule — what a clinician sees when they log in: their weekly consulting
// windows and every patient booked into them, on a month calendar.
export default function MySchedulePage() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(toISODate(today));

  const { calendar, loading, error } = useMyCalendar(year, month);

  const events = useMemo(() => toEvents(calendar?.appointments ?? []), [calendar]);
  const byDate = useMemo(() => groupByDate(events), [events]);
  const openDays = useMemo(() => openWeekdays(calendar?.windows ?? []), [calendar]);

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelected(toISODate(today));
  };

  if (error) {
    return (
      <div>
        <Header title="My Schedule" subtitle="Your consulting hours and booked patients" />
        <div className="card text-center py-12 text-muted-foreground/70">{error.message}</div>
      </div>
    );
  }

  const dayWindows = selected ? windowsForDate(calendar?.windows ?? [], selected) : [];

  return (
    <div>
      <Header
        title="My Schedule"
        subtitle={
          calendar?.clinicianName
            ? `${calendar.clinicianName} — patients booked into your consulting hours`
            : "Your consulting hours and booked patients"
        }
      />

      {loading && !calendar ? (
        <LoadingSpinner />
      ) : (
        <>
          <WindowSummary windows={calendar?.windows ?? []} />
          <MonthNav year={year} month={month}
            onChange={(y, m) => { setYear(y); setMonth(m); }} onToday={goToday} />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <MonthGrid
              year={year}
              month={month}
              byDate={byDate}
              selected={selected}
              onSelect={setSelected}
              openDays={openDays.size > 0 ? openDays : undefined}
            />
            <DayAgenda
              date={selected}
              events={selected ? byDate[selected] ?? [] : []}
              emptyText="No patients booked for this day."
              header={
                dayWindows.length > 0 ? (
                  <p className="text-xs text-muted-foreground/70 font-mono">
                    {dayWindows.map((w) => `${w.startTime}–${w.endTime}`).join(", ")}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/70">Not a consulting day.</p>
                )
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
