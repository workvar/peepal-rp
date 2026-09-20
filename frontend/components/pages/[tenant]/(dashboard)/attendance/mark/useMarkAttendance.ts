"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { LIST_ATTENDANCE } from "@/graphql/queries/attendance";
import { BULK_MARK_ATTENDANCE } from "@/graphql/mutations/attendance";
import type { GqlAttendanceRecord } from "@/types/pages/attendance/page";
import { currentYearMonth, shiftMonth, todayISO } from "./calendarDays";
import type { EntityType, MarksMap, MarkStatus } from "./types";

const VALID: MarkStatus[] = ["present", "absent", "late"];

// Owns all calendar state for one entity: the visible month, the active paint
// mode, and the painted/loaded marks. Loads existing attendance once on mount
// and saves everything back through the idempotent bulk mutation.
export function useMarkAttendance(entityType: EntityType, entityId: string) {
  const [cursor, setCursor] = useState(currentYearMonth);
  const [mode, setMode] = useState<MarkStatus>("present");
  const [marks, setMarks] = useState<MarksMap>({});
  const seeded = useRef(false);

  const { data, loading, refetch } = useQuery(LIST_ATTENDANCE, {
    variables: { entityId, entityType },
    skip: !entityId,
    fetchPolicy: "cache-and-network",
  });

  // Seed the calendar from existing records exactly once, after the first
  // network result lands. The component is keyed by entity, so a fresh mount
  // (and fresh seed) happens whenever the selected person changes.
  useEffect(() => {
    if (seeded.current || loading || !data) return;
    const next: MarksMap = {};
    for (const r of (data.attendance ?? []) as GqlAttendanceRecord[]) {
      const iso = r.date.slice(0, 10);
      if ((VALID as string[]).includes(r.status)) next[iso] = r.status as MarkStatus;
    }
    setMarks(next);
    seeded.current = true;
  }, [data, loading]);

  function toggleDay(iso: string) {
    setMarks((prev) => {
      const copy = { ...prev };
      if (copy[iso] === mode) delete copy[iso]; // same mode clears the day
      else copy[iso] = mode;
      return copy;
    });
  }

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0 };
    for (const s of Object.values(marks)) c[s]++;
    return c;
  }, [marks]);

  const [bulkMark, { loading: saving }] = useMutation(BULK_MARK_ATTENDANCE);

  async function save() {
    const inputs = Object.entries(marks).map(([date, status]) => ({
      entityId, entityType, date, status,
    }));
    await bulkMark({
      variables: { inputs },
      // Refresh the page-level table (queried with no variables).
      refetchQueries: [{ query: LIST_ATTENDANCE }],
    });
    await refetch();
  }

  return {
    cursor,
    goToMonth: (delta: number) => setCursor((c) => shiftMonth(c.year, c.month, delta)),
    mode, setMode,
    marks, toggleDay,
    counts,
    today: todayISO(),
    loading,
    saving,
    save,
    total: Object.keys(marks).length,
  };
}
