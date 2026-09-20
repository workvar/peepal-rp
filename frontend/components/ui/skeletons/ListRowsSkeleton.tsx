import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  rows?: number;
  /** Render an avatar circle on the left. */
  withAvatar?: boolean;
  /** Render a trailing chip/badge-shaped placeholder. */
  withTrailing?: boolean;
}

/** Generic vertical list — each row has avatar? + title + subtitle +
 * optional trailing chip. Used for users, students, notifications, etc. */
export default function ListRowsSkeleton({
  rows = 6,
  withAvatar = false,
  withTrailing = false,
}: Props) {
  return (
    <div className="card divide-y divide-border/60 p-0 overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          {withAvatar && <Skeleton className="h-9 w-9 rounded-full shrink-0" />}
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          {withTrailing && <Skeleton className="h-6 w-16 rounded-full shrink-0" />}
        </div>
      ))}
    </div>
  );
}
