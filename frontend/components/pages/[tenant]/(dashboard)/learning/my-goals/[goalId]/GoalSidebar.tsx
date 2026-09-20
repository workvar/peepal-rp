"use client";

import { LearningSection } from "@/types/pages/learning/page";
import { CheckCircle2, Lock, PlayCircle, FileCheck2 } from "lucide-react";
import type { GoalDetailState } from "./useGoalDetail";

// Sidebar: overall progress plus the section/item list with lock and
// completion indicators.
export default function GoalSidebar({
  s,
  sections,
  stats,
}: {
  s: GoalDetailState;
  sections: LearningSection[];
  stats: { completed: number; total: number; pct: number };
}) {
  const { lockedMap, selectedItemId, itemDone, selectItem } = s;
  return (
    <div className="card p-3 space-y-4">
      {/* Progress bar inside sidebar */}
      <div className="px-1 pt-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
            Progress
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {stats.completed}/{stats.total} · {stats.pct}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${stats.pct}%` }}
          />
        </div>
      </div>

      <div className="h-px bg-border/60" />

      {sections.map((sec: LearningSection, sIdx: number) => {
        const sItems = [...(sec.items ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
        const sectionDoneCount = sItems.filter((it) => itemDone(it)).length;
        return (
          <div key={sec.id}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                {sec.title}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground/70">
                {sectionDoneCount}/{sItems.length}
              </span>
            </div>
            <ul className="space-y-1">
              {sItems.map((it) => {
                const done = itemDone(it);
                const locked = lockedMap[it.id];
                const isActive = selectedItemId === it.id;
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => selectItem(it.id)}
                      disabled={locked}
                      aria-current={isActive ? "page" : undefined}
                      className={[
                        "w-full text-left flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors border",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
                          : "border-transparent hover:bg-muted/60 text-foreground",
                        locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                      ].join(" ")}
                    >
                      {locked ? (
                        <Lock size={14} className={isActive ? "text-primary-foreground/80" : "text-muted-foreground/60"} />
                      ) : done ? (
                        <CheckCircle2
                          size={14}
                          className={isActive ? "text-primary-foreground" : "text-emerald-600"}
                        />
                      ) : it.itemType === "unit" ? (
                        <PlayCircle
                          size={14}
                          className={isActive ? "text-primary-foreground" : "text-primary"}
                        />
                      ) : (
                        <FileCheck2
                          size={14}
                          className={isActive ? "text-primary-foreground" : "text-amber-600"}
                        />
                      )}
                      <span className="truncate flex-1">{it.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {sIdx < sections.length - 1 && (
              <div className="h-px bg-border/40 mt-3" />
            )}
          </div>
        );
      })}
    </div>
  );
}
