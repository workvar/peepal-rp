"use client";

import { useQuery } from "@apollo/client";
import { LIST_TIMETABLE } from "@/graphql/queries/timetable";
import type { TimetableSlot } from "./types";

// Self-service timetable feed for students. It sends no course/semester/section
// filters on purpose: the backend scopes the result to the caller's own
// enrolment, so a student can only ever load their own class schedule.
export function useMyTimetable() {
  const { data, loading } = useQuery<{ timetable: TimetableSlot[] }>(LIST_TIMETABLE, {
    fetchPolicy: "cache-and-network",
  });
  return { slots: data?.timetable ?? [], loading };
}
