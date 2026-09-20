import type { ChartPoint } from "./types";

/** Rounded vertical bar chart as inline SVG. */
export default function BarChart({
  data,
  color,
  unit = "",
  formatValue,
  height = 200,
}: {
  data: ChartPoint[];
  color: string;
  unit?: string;
  formatValue?: (v: number) => string;
  height?: number;
}) {
  const W = 460;
  const H = height;
  const pad = { t: 18, r: 12, b: 28, l: 34 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;
  const maxV = Math.max(...data.map((d) => d.value), 1);
  const gap = 10;
  const bw = Math.max(6, cw / data.length - gap);
  const fmt = formatValue ?? ((v: number) => `${v}${unit}`);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      {[0, 0.5, 1].map((t) => {
        const y = pad.t + ch * t;
        return <line key={t} x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="rgb(var(--border))" strokeDasharray="4 4" />;
      })}
      {data.map((d, i) => {
        const barH = (d.value / maxV) * ch;
        const x = pad.l + i * (bw + gap) + gap / 2;
        const y = pad.t + ch - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={barH} rx="5" fill={color} fillOpacity="0.9" />
            <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="rgb(var(--muted-foreground))">{d.label}</text>
            {barH > 14 && (
              <text x={x + bw / 2} y={y - 5} textAnchor="middle" fontSize="9" fill={color} fontWeight="600">{fmt(d.value)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
