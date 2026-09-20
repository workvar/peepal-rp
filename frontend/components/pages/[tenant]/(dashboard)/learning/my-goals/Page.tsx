"use client";

import { useRouter, useParams } from "next/navigation";
import { MY_LEARNING_GOALS } from "@/graphql/queries/learning";
import { useListQuery } from "@/lib/hooks/useQueryState";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import QueryError from "@/components/ui/QueryError";
import { Badge } from "@/components/ui/badge";
import {
  EmployeeGoalProgress,
  progressStats,
} from "@/types/pages/learning/page";
import { ChevronRight, BookOpen } from "lucide-react";

const statusVariant: Record<string, "green" | "yellow" | "gray"> = {
  completed: "green",
  in_progress: "yellow",
  not_started: "gray",
};

export default function MyLearningGoalsPage() {
  const router = useRouter();
  const params = useParams();
  const tenant = (params?.tenant as string) ?? "";

  const { rows: progress, loading, errorMessage, refetch } =
    useListQuery<EmployeeGoalProgress>(MY_LEARNING_GOALS, "myLearningGoals");

  const mandatory = progress.filter((p) => p.goal?.isMandatory);
  const optional = progress.filter((p) => !p.goal?.isMandatory);

  const renderCard = (p: EmployeeGoalProgress) => {
    const { completed, total, pct } = progressStats(p);
    const dueSoon =
      p.goal?.dueDate &&
      new Date(p.goal.dueDate).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 7;
    return (
      <button
        key={p.id}
        onClick={() => router.push(`/${tenant}/learning/my-goals/${p.goalId}`)}
        className="card p-4 text-left hover:border-primary/40 hover:shadow-sm transition"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-primary" />
            <h3 className="font-semibold text-foreground">{p.goal?.title ?? "—"}</h3>
          </div>
          <Badge
            label={p.status.replace("_", " ")}
            variant={statusVariant[p.status] ?? "gray"}
          />
        </div>
        {p.goal?.description && (
          <p className="text-sm text-muted-foreground/80 mb-3 line-clamp-2">
            {p.goal.description}
          </p>
        )}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-muted-foreground/80 tabular-nums">
            {completed}/{total}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground/70">
          <span>
            {p.goal?.dueDate
              ? `Due ${new Date(p.goal.dueDate).toLocaleDateString()}`
              : "No due date"}
            {dueSoon && (
              <span className="ml-1 text-amber-600 font-medium">(soon)</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1">
            Continue <ChevronRight size={12} />
          </span>
        </div>
      </button>
    );
  };

  return (
    <div>
      <Header
        title="My Learning"
        subtitle="Goals assigned to you — work through them in order."
      />

      {errorMessage && <QueryError message={errorMessage} onRetry={refetch} />}

      {loading ? (
        <LoadingSpinner />
      ) : progress.length === 0 ? (
        <div className="card p-8 text-center text-muted-foreground/70">
          You have no learning goals assigned yet.
        </div>
      ) : (
        <div className="space-y-6">
          {mandatory.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Mandatory
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {mandatory.map(renderCard)}
              </div>
            </section>
          )}
          {optional.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Optional
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {optional.map(renderCard)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
