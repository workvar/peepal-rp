"use client";

import { Sparkles } from "lucide-react";
import { useTerminology } from "@/store/hooks/useTerminology";

export default function DashboardHero({
  firstName,
  isAdmin,
  onStartTour,
}: {
  firstName: string;
  isAdmin: boolean;
  onStartTour: () => void;
}) {
  const t = useTerminology();
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{today}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mt-1">
          Good day, {firstName || "there"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening across your {t.organization.toLowerCase()} today.
        </p>
      </div>
      {isAdmin && (
        <button
          onClick={onStartTour}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-border bg-card hover:bg-secondary transition-colors"
        >
          <Sparkles size={14} />
          <span className="hidden sm:inline">Take the tour</span>
        </button>
      )}
    </div>
  );
}
