"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { List, CalendarDays } from "lucide-react";
import { MY_PATIENT_APPOINTMENTS } from "@/graphql/queries/portal";
import {
  MonthGrid, MonthNav, DayAgenda, groupByDate, toISODate,
} from "@/components/ui/EventCalendar";
import type { CalendarEvent, EventTone } from "@/components/ui/EventCalendar";

type PortalAppointment = {
  id: string;
  date: string;
  startTime: string;
  clinicianName?: string | null;
  departmentName?: string | null;
  reason?: string | null;
  status: string;
};

const STATUS_TONE: Record<string, EventTone> = {
  scheduled: "blue",
  completed: "green",
  cancelled: "gray",
  no_show: "red",
};

function toEvents(rows: PortalAppointment[]): CalendarEvent[] {
  return rows.map((a) => ({
    id: a.id,
    date: a.date,
    time: a.startTime,
    title: a.clinicianName ?? "Appointment",
    subtitle: [a.departmentName, a.reason].filter(Boolean).join(" · ") || null,
    tone: STATUS_TONE[a.status] ?? "blue",
  }));
}

// The patient's own appointments, as a list or on a month calendar.
export default function AppointmentsTab() {
  const { data, loading } = useQuery(MY_PATIENT_APPOINTMENTS);
  const today = useMemo(() => new Date(), []);

  const [view, setView] = useState<"list" | "calendar">("list");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(toISODate(today));

  const rows: PortalAppointment[] = useMemo(() => data?.myPatientAppointments ?? [], [data]);
  const byDate = useMemo(() => groupByDate(toEvents(rows)), [rows]);

  if (loading) return <LoadingSpinner />;

  const toggle = (
    <div className="flex items-center gap-1 mb-3">
      <button onClick={() => setView("list")}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg ${
          view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}>
        <List size={14} /> List
      </button>
      <button onClick={() => setView("calendar")}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg ${
          view === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}>
        <CalendarDays size={14} /> Calendar
      </button>
    </div>
  );

  if (rows.length === 0) {
    return <div className="card text-center py-10 text-muted-foreground/70">No appointments.</div>;
  }

  return (
    <div>
      {toggle}

      {view === "list" ? (
        <div className="space-y-2">
          {rows.map((a) => (
            <div key={a.id} className="card flex items-center justify-between">
              <div>
                <div className="font-medium">{a.date} · {a.startTime}</div>
                <div className="text-xs text-muted-foreground/70">
                  {a.clinicianName}
                  {a.departmentName ? ` · ${a.departmentName}` : ""}
                  {a.reason ? ` · ${a.reason}` : ""}
                </div>
              </div>
              <Badge label={a.status}
                variant={a.status === "completed" ? "green" : a.status === "cancelled" ? "gray" : "blue"}
                className="capitalize" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <MonthNav year={year} month={month}
            onChange={(y, m) => { setYear(y); setMonth(m); }}
            onToday={() => {
              setYear(today.getFullYear());
              setMonth(today.getMonth());
              setSelected(toISODate(today));
            }} />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <MonthGrid year={year} month={month} byDate={byDate}
              selected={selected} onSelect={setSelected} />
            <DayAgenda date={selected}
              events={selected ? byDate[selected] ?? [] : []}
              emptyText="No appointments on this day." />
          </div>
        </>
      )}
    </div>
  );
}
