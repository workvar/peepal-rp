import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  /** Column header labels — renders a matching cell skeleton per column. */
  columns: string[];
  rows?: number;
  /** Optional per-column width classes (tailwind) aligned to `columns`. */
  colWidths?: string[];
}

/**
 * Content-shaped table skeleton. Mirrors the `.card` + table layout used
 * across list pages (employees, students, users, leaves, etc.).
 */
export default function TableSkeleton({ columns, rows = 6, colWidths }: Props) {
  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            {columns.map((c) => (
              <th key={c} className="table-th">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {columns.map((c, i) => (
                <td key={c} className="table-td">
                  <Skeleton className={`h-4 ${colWidths?.[i] ?? "w-24"}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
