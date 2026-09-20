import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  /** Number of field placeholders. Defaults to 4. */
  fields?: number;
  /** Number of columns in the grid (1 or 2). Defaults to 2. */
  cols?: 1 | 2;
  /** Include a trailing submit-button-shaped block. */
  withSubmit?: boolean;
}

/** Form section skeleton: label + input per field, laid out in a 2-col grid. */
export default function FormSkeleton({ fields = 4, cols = 2, withSubmit = false }: Props) {
  const gridClass = cols === 2 ? "sm:grid-cols-2" : "";
  return (
    <div className="space-y-5">
      <div className={`grid grid-cols-1 ${gridClass} gap-3`}>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      {withSubmit && <Skeleton className="h-10 w-full rounded-xl" />}
    </div>
  );
}
