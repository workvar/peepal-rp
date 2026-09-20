import { Skeleton } from "@/components/ui/skeleton";

export default function SectionLabelSkeleton({ width = "w-28" }: { width?: string }) {
  return <Skeleton className={`h-3 ${width} mb-3`} />;
}
