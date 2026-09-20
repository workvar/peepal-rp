"use client";

/**
 * Timetable page — role switch.
 *
 *   - Students  → StudentTimetable: read-only, auto-scoped to their own class.
 *   - Everyone else → AdminTimetable: filters + create/edit/bulk tools.
 */

import { useAppSelector } from "@/store/hooks";
import AdminTimetable from "./AdminTimetable";
import StudentTimetable from "./StudentTimetable";

export default function TimetablePage() {
  const role = useAppSelector((s) => s.auth.user?.role);

  if (role === "student") return <StudentTimetable />;
  return <AdminTimetable />;
}
