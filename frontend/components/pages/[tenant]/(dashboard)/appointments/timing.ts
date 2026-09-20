// Small time helpers shared by the appointment calendar and the "now" strip.

import type { GqlAppointment } from "./types";

/** Minutes since midnight for an HH:MM string, or null when unparseable. */
export function toMinutes(hhmm?: string | null): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export type AppointmentTiming = "ongoing" | "upcoming" | "past";

/** Where an appointment sits relative to `now`. Assumes 30 min when no end. */
export function timingOf(a: GqlAppointment, now = new Date()): AppointmentTiming {
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  if (a.date > today) return "upcoming";
  if (a.date < today) return "past";

  const start = toMinutes(a.startTime);
  if (start === null) return "upcoming";
  const end = toMinutes(a.endTime) ?? start + 30;
  const mins = now.getHours() * 60 + now.getMinutes();

  if (mins < start) return "upcoming";
  if (mins <= end) return "ongoing";
  return "past";
}

/** Scheduled appointments from now onwards, soonest first. */
export function upcomingAppointments(list: GqlAppointment[], now = new Date()) {
  return list
    .filter((a) => a.status === "scheduled" && timingOf(a, now) !== "past")
    .sort((x, y) =>
      x.date === y.date
        ? (x.startTime ?? "").localeCompare(y.startTime ?? "")
        : x.date.localeCompare(y.date),
    );
}
