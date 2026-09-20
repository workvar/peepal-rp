import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  count?: number;
  lines?: number;
}

/** List of `Card`s, each with a title + short body — used for lists of notes,
 * announcements, leaves, notifications and other card-shaped feeds. */
export default function CardListSkeleton({ count = 4, lines = 2 }: Props) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4 space-y-2">
          <Skeleton className="h-4 w-2/5" />
          {Array.from({ length: lines }).map((_, l) => (
            <Skeleton
              key={l}
              className={`h-3 ${l === lines - 1 ? "w-3/5" : "w-full"}`}
            />
          ))}
        </Card>
      ))}
    </div>
  );
}
