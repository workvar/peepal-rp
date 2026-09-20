"use client";

import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { progressStats } from "@/types/pages/learning/page";
import { ArrowLeft, Lock } from "lucide-react";
import { useGoalDetail } from "./useGoalDetail";
import GoalSidebar from "./GoalSidebar";
import UnitContent from "./UnitContent";
import AssignmentContent from "./AssignmentContent";
import ItemNav from "./ItemNav";

export default function LearningGoalDetailPage() {
  const s = useGoalDetail();
  const { router, tenant, loading, refetch, row, goal, lockedMap, selectedItem, selectedProgress } = s;

  if (loading && !row) {
    return (
      <div>
        <Header title="Learning" subtitle="Loading your progress…" />
        <LoadingSpinner />
      </div>
    );
  }
  if (!row || !goal) {
    return (
      <div>
        <Header title="Learning" subtitle="Goal not found or not assigned to you" />
        <div className="card p-8 text-center text-muted-foreground">
          <button
            className="btn-secondary inline-flex items-center gap-2"
            onClick={() => router.push(`/${tenant}/learning/my-goals`)}
          >
            <ArrowLeft size={16} /> Back to My Learning
          </button>
        </div>
      </div>
    );
  }

  const stats = progressStats(row);
  const sections = [...(goal.sections ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div>
      <Header
        title={goal.title}
        subtitle={goal.description || "Work through each item in order."}
        action={
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={() => router.push(`/${tenant}/learning/my-goals`)}
          >
            <ArrowLeft size={16} /> Back
          </button>
        }
      />

      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge
                label={row.status.replace("_", " ")}
                variant={
                  row.status === "completed"
                    ? "green"
                    : row.status === "in_progress"
                      ? "yellow"
                      : "gray"
                }
              />
              {goal.isMandatory && <Badge label="Mandatory" variant="red" />}
              {goal.dueDate && (
                <span className="text-xs text-muted-foreground/70">
                  Due {new Date(goal.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground/80 mt-1">
              {stats.completed} of {stats.total} items complete ({stats.pct}%)
            </div>
          </div>
          <div className="w-48">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${stats.pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        {/* Sidebar: sections + items */}
        <GoalSidebar s={s} sections={sections} stats={stats} />

        {/* Detail */}
        <div className="card p-5">
          {!selectedItem ? (
            <div className="text-muted-foreground text-center py-8">
              Select an unlocked item from the left to begin.
            </div>
          ) : lockedMap[selectedItem.id] ? (
            <div className="flex flex-col items-center text-muted-foreground py-8">
              <Lock size={28} className="mb-2" />
              <p>Finish the previous item first to unlock this one.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{selectedItem.title}</h2>
                  {selectedItem.description && (
                    <p className="text-sm text-muted-foreground/80 mt-1 whitespace-pre-line">
                      {selectedItem.description}
                    </p>
                  )}
                </div>
                <Badge
                  label={selectedItem.itemType === "unit" ? "Unit" : "Assignment"}
                  variant={selectedItem.itemType === "unit" ? "blue" : "warning"}
                />
              </div>

              {selectedItem.itemType === "unit" && (
                <UnitContent item={selectedItem} progress={selectedProgress} onMarkUnit={s.handleMarkUnit} />
              )}

              {selectedItem.itemType === "assignment" && (
                <AssignmentContent
                  item={selectedItem}
                  progress={selectedProgress}
                  egpId={row.id}
                  onSubmitCompletion={s.handleSubmitCompletion}
                  onQuizSubmitted={async () => {
                    await refetch();
                  }}
                />
              )}

              <ItemNav s={s} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
