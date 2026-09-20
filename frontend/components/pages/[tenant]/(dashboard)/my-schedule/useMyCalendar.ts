"use client";

import { useQuery } from "@apollo/client";
import { MY_CLINICIAN_CALENDAR } from "@/graphql/queries/clinical";
import { monthRange } from "@/components/ui/EventCalendar";
import type { MyCalendar } from "./types";

/** Loads the caller's own consulting windows + bookings for one month. */
export function useMyCalendar(year: number, month: number) {
  const { from, to } = monthRange(year, month);
  const { data, loading, error, refetch } = useQuery(MY_CLINICIAN_CALENDAR, {
    variables: { from, to },
    fetchPolicy: "cache-and-network",
  });

  const calendar: MyCalendar | null = data?.myClinicianCalendar ?? null;
  return { calendar, loading, error, refetch };
}
