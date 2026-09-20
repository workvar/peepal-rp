// Shared types for the clinician's own calendar page.

import type { CalendarEvent, EventTone } from "@/components/ui/EventCalendar";

export type MyWindow = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  active: boolean;
};

export type MyAppointment = {
  id: string;
  patientName: string;
  patientMrn: string;
  departmentName?: string | null;
  date: string;
  startTime: string;
  endTime?: string | null;
  reason?: string | null;
  status: string;
};

export type MyCalendar = {
  clinicianId: string;
  clinicianName: string;
  windows: MyWindow[];
  appointments: MyAppointment[];
};

const STATUS_TONE: Record<string, EventTone> = {
  scheduled: "blue",
  completed: "green",
  cancelled: "gray",
  no_show: "red",
};

/** Turn appointments into calendar events for the month grid / agenda. */
export function toEvents(appointments: MyAppointment[]): CalendarEvent[] {
  return appointments.map((a) => ({
    id: a.id,
    date: a.date,
    time: a.startTime,
    title: a.patientName,
    subtitle: [a.patientMrn, a.departmentName, a.reason].filter(Boolean).join(" · ") || null,
    tone: STATUS_TONE[a.status] ?? "blue",
  }));
}

/** Weekday numbers the clinician actually consults on. */
export function openWeekdays(windows: MyWindow[]): Set<number> {
  return new Set(windows.filter((w) => w.active).map((w) => w.dayOfWeek));
}

/** The consulting windows that apply to a given YYYY-MM-DD. */
export function windowsForDate(windows: MyWindow[], iso: string): MyWindow[] {
  const weekday = new Date(`${iso}T00:00:00`).getDay();
  return windows.filter((w) => w.active && w.dayOfWeek === weekday);
}
