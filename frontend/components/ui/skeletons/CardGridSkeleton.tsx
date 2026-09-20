import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  count?: number;
  /** Tailwind grid-cols classes. Defaults to responsive 1/2/3. */
  cols?: string;
}

/** Grid of uniform cards, each with a title, thin sub-label, and two body
 * lines. Matches the "card tile" look used for templates, structures, goals,
 * transport routes, library items, etc. */
export default function CardGridSkeleton({
  count = 6,
  cols = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
}: Props) {
  return (
    <div className={`grid ${cols} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </Card>
      ))}
    </div>
  );
}
