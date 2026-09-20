import { Inbox } from "lucide-react";

/** Friendly placeholder shown inside a ChartCard when there is no data yet. */
export default function EmptyChart({
  message = "No data yet",
  hint,
  height = 180,
}: {
  message?: string;
  hint?: string;
  height?: number;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-center"
      style={{ height }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ background: "rgb(var(--secondary))", color: "rgb(var(--muted-foreground))" }}
      >
        <Inbox size={18} />
      </div>
      <p className="text-sm font-medium text-foreground">{message}</p>
      {hint && <p className="text-xs text-muted-foreground max-w-[220px]">{hint}</p>}
    </div>
  );
}
