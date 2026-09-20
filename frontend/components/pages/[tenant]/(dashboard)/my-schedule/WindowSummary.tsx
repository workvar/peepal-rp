"use client";

import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { useAccess } from "@/lib/useAccess";
import type { MyWindow } from "./types";
import { DAY_NAMES } from "../schedules/types";

interface Props {
  windows: MyWindow[];
}

// Link to the Schedules page. Everyone in a hospital can view it; only admin
// (and back-office staff) can actually add windows, so the wording changes and
// non-editors get an extra nudge to ask an admin.
function SetScheduleLink() {
  const { canViewModule, canDo } = useAccess();
  const tenantSlug = useAppSelector((s) => s.auth.tenantSlug);
  const slug =
    tenantSlug ??
    (typeof window !== "undefined" ? localStorage.getItem("tenantSlug") : "") ??
    "";

  if (!canViewModule("schedules")) {
    return <>Ask your administrator to set your consulting hours.</>;
  }

  const canEdit = canDo("schedules", "create");

  return (
    <>
      <Link
        href={slug ? `/${slug}/schedules` : "/schedules"}
        className="text-primary underline underline-offset-2 hover:opacity-80"
      >
        {canEdit ? "Set consulting hours" : "View clinician schedules"}
      </Link>
      {!canEdit && " — only an administrator can add windows."}
    </>
  );
}

// A compact read-only strip of the clinician's weekly consulting hours. Editing
// stays on the admin Schedules page — this is just so the doctor can see the
// shape of their week above the calendar.
export default function WindowSummary({ windows }: Props) {
  const active = windows.filter((w) => w.active);

  if (active.length === 0) {
    return (
      <div className="card mb-4 text-sm text-muted-foreground/70">
        You have no consulting windows set. Until one is added you can be booked at any time.{" "}
        <SetScheduleLink />
      </div>
    );
  }

  const byDay = DAY_NAMES.map((name, day) => ({
    name,
    slots: active.filter((w) => w.dayOfWeek === day),
  })).filter((d) => d.slots.length > 0);

  return (
    <div className="card mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Consulting hours</h3>
        <span className="text-xs text-muted-foreground/70">
          <SetScheduleLink />
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {byDay.map((d) => (
          <span key={d.name} className="rounded-lg border border-border/60 px-2 py-1 text-xs">
            <span className="font-medium">{d.name.slice(0, 3)}</span>{" "}
            <span className="font-mono text-muted-foreground">
              {d.slots.map((s) => `${s.startTime}–${s.endTime}`).join(", ")}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
