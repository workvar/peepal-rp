// A labelled capacity bar: current vs limit. Turns red when over capacity.
// A limit of 0 means "unlimited" and renders an empty track.
export default function UsageBar({
  label,
  current,
  limit,
  color = "var(--color-category-blue)",
}: {
  label: string;
  current: number;
  limit: number;
  color?: string;
}) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const over = limit > 0 && current > limit;
  const barColor = over ? "var(--color-category-red)" : color;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-foreground">
          {current.toLocaleString()}
          {limit > 0 ? ` / ${limit.toLocaleString()}` : ""}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}
