import { Skeleton } from "@/components/ui/skeleton";

export default function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start justify-between gap-3 p-4 rounded-xl border border-border bg-card"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-2.5 w-14" />
          </div>
          <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}
