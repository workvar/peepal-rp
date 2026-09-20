"use client";

// Data for the Hall Tickets page. Tickets belong to an exam schedule, so the
// page is scoped by schedule rather than by course.

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { LIST_COURSES, LIST_EXAM_SCHEDULES } from "@/graphql/queries/academic";
import { HALL_TICKETS } from "@/graphql/queries/exam-cell";
import {
  ISSUE_HALL_TICKETS,
  REVOKE_HALL_TICKET,
  RELEASE_HALL_TICKET_HOLD,
} from "@/graphql/mutations/exam-cell";
import type { GqlCourseRef, GqlExamScheduleRef, GqlHallTicket } from "./types";

export function useHallTickets() {
  const [examScheduleId, setExamScheduleId] = useState("");
  const [status, setStatus] = useState("");

  const { data: courseData } = useQuery(LIST_COURSES);
  const courses: GqlCourseRef[] = courseData?.courses ?? [];

  const { data: scheduleData } = useQuery(LIST_EXAM_SCHEDULES, { variables: {} });
  const schedules: GqlExamScheduleRef[] = scheduleData?.examSchedules ?? [];

  const variables = { examScheduleId, status: status || null };
  const { data, loading, refetch } = useQuery(HALL_TICKETS, {
    variables,
    skip: !examScheduleId,
  });
  const tickets: GqlHallTicket[] = data?.hallTickets ?? [];

  const refetchQueries = [{ query: HALL_TICKETS, variables }];
  const [issueMut] = useMutation(ISSUE_HALL_TICKETS, { refetchQueries });
  const [revokeMut] = useMutation(REVOKE_HALL_TICKET, { refetchQueries });
  const [releaseMut] = useMutation(RELEASE_HALL_TICKET_HOLD, { refetchQueries });

  const selectedSchedule = schedules.find((s) => s.id === examScheduleId) ?? null;

  return {
    courses,
    schedules,
    tickets,
    selectedSchedule,
    loading,
    refetch,
    scope: { examScheduleId, status },
    setScope: { setExamScheduleId, setStatus },
    issueMut,
    revokeMut,
    releaseMut,
  };
}
