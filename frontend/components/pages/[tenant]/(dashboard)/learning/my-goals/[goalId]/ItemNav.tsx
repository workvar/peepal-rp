"use client";

import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import type { GoalDetailState } from "./useGoalDetail";

// Previous / Next navigation.
// - No neighbor at all (first / last item) → button is not rendered.
// - Neighbor exists but is locked → button is rendered disabled
//   (so the learner knows another page is coming, just not yet).
// - Neighbor exists and is unlocked → button is active.
export default function ItemNav({ s }: { s: GoalDetailState }) {
  const { prevItem, nextItem, prevLocked, nextLocked, selectedIndex, items } = s;
  if (!prevItem && !nextItem) return null;
  return (
    <div className="mt-8 pt-4 border-t border-border/60 flex items-center justify-between gap-3">
      {prevItem ? (
        <button
          type="button"
          onClick={s.goToPrev}
          disabled={prevLocked}
          className={[
            "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            prevLocked
              ? "bg-muted/40 text-muted-foreground/60 cursor-not-allowed"
              : "bg-muted/60 hover:bg-muted text-foreground",
          ].join(" ")}
          title={
            prevLocked
              ? `${prevItem.title} (locked)`
              : prevItem.title
          }
        >
          {prevLocked ? <Lock size={14} /> : <ArrowLeft size={14} />}
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[10px] uppercase tracking-wide opacity-70">
              Previous
            </span>
            <span className="max-w-[180px] truncate">{prevItem.title}</span>
          </span>
        </button>
      ) : (
        <span />
      )}

      <div className="text-xs text-muted-foreground/70">
        {selectedIndex + 1} of {items.length}
      </div>

      {nextItem ? (
        <button
          type="button"
          onClick={s.goToNext}
          disabled={nextLocked}
          className={[
            "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            nextLocked
              ? "bg-muted/40 text-muted-foreground/60 cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:opacity-90",
          ].join(" ")}
          title={
            nextLocked
              ? `${nextItem.title} (complete the current item to unlock)`
              : nextItem.title
          }
        >
          <span className="flex flex-col items-end leading-tight">
            <span className="text-[10px] uppercase tracking-wide opacity-70">
              Next
            </span>
            <span className="max-w-[180px] truncate">{nextItem.title}</span>
          </span>
          {nextLocked ? <Lock size={14} /> : <ArrowRight size={14} />}
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
