import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnnouncementsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
              <Skeleton className="h-3 w-12 shrink-0" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
