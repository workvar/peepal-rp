import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  rows?: number;
  /** Use the richer two-line layout (icon + title + description). */
  withIcon?: boolean;
}

export default function QuickListSkeleton({ rows = 3, withIcon = false }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {withIcon && <Skeleton className="h-9 w-9 rounded-lg shrink-0" />}
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              {withIcon && <Skeleton className="h-3 w-3/4" />}
            </div>
          </div>
          <Skeleton className="h-3 w-3 shrink-0" />
        </div>
      ))}
    </div>
  );
}
