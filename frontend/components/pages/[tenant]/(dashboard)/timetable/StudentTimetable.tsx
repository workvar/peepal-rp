"use client";

/**
 * Student timetable view.
 *
 * Read-only and auto-scoped: no course / semester / section pickers. The
 * backend returns only the slots for the signed-in student's own enrolment,
 * so a student can never load another class's schedule.
 */

import PageHeader from "@/components/ui/PageHeader";
import { useMyTimetable } from "./useMyTimetable";
import StudentTimetableView from "./StudentTimetableView";

export default function StudentTimetable() {
  const { slots, loading } = useMyTimetable();

  // Course + semester context, derived from the student's own slots.
  const first = slots[0];
  const subtitle = first?.course?.name
    ? `${first.course.name} · Semester ${first.semester}`
    : "Your weekly class schedule";

  return (
    <div className="space-y-6">
      <PageHeader title="My Timetable" subtitle={subtitle} />
      <StudentTimetableView slots={slots} loading={loading} />
    </div>
  );
}
