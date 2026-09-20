import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChartsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div>
      <Skeleton className="h-5 w-48 mb-4" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="p-4 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </Card>
        ))}
      </div>
    </div>
  );
}
