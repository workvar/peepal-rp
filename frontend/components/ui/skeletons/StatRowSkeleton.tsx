import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  count?: number;
  /** Tailwind grid-cols class. */
  cols?: string;
}

/** Horizontal strip of stat cards (icon + label + value). */
export default function StatRowSkeleton({
  count = 4,
  cols = "grid-cols-2 md:grid-cols-4",
}: Props) {
  return (
    <div className={`grid ${cols} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start justify-between gap-3 p-4 rounded-xl border border-border bg-card"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-14" />
          </div>
          <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}
