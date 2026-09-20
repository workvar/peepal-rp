import { PIE_COLORS, type ChartPoint } from "./types";

/** Donut chart with centered total + legend, inline SVG. */
export default function DonutChart({ data, height = 200 }: { data: ChartPoint[]; height?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 100;
  const cy = height / 2;
  const r = Math.min(cy, 80);
  const innerR = r * 0.62;
  let startAngle = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const slice = (d.value / total) * 2 * Math.PI;
    const endAngle = startAngle + slice;
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(startAngle), iy1 = cy + innerR * Math.sin(startAngle);
    const ix2 = cx + innerR * Math.cos(endAngle), iy2 = cy + innerR * Math.sin(endAngle);
    const large = slice > Math.PI ? 1 : 0;
    const path = `M${ix1.toFixed(2)},${iy1.toFixed(2)} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} L${ix2.toFixed(2)},${iy2.toFixed(2)} A${innerR},${innerR} 0 ${large} 0 ${ix1.toFixed(2)},${iy1.toFixed(2)} Z`;
    const color = PIE_COLORS[i % PIE_COLORS.length];
    startAngle = endAngle;
    return { path, color, label: d.label, value: d.value };
  });

  return (
    <svg viewBox={`0 0 460 ${height}`} className="w-full" style={{ height }}>
      {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity="0.92" />)}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill="rgb(var(--foreground))">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="rgb(var(--muted-foreground))">Total</text>
      <g>
        {slices.map((s, i) => (
          <g key={i} transform={`translate(220,${24 + i * 22})`}>
            <rect width="11" height="11" rx="3" fill={s.color} />
            <text x="17" y="10" fontSize="11" fill="rgb(var(--muted-foreground))">
              {s.label} ({s.value})
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
