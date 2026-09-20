import type { ChartPoint } from "./types";

/** Smooth area + line chart rendered as inline SVG, theme-aware via CSS vars. */
export default function LineChart({
  data,
  color,
  unit = "",
  height = 200,
}: {
  data: ChartPoint[];
  color: string;
  unit?: string;
  height?: number;
}) {
  const W = 460;
  const H = height;
  const pad = { t: 14, r: 18, b: 28, l: 34 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;
  const maxV = Math.max(...data.map((d) => d.value), 1);
  const xs = data.map((_, i) => pad.l + (i / Math.max(data.length - 1, 1)) * cw);
  const ys = data.map((d) => pad.t + ch - (d.value / maxV) * ch);
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const area = `${line} L${xs[xs.length - 1].toFixed(1)},${(pad.t + ch).toFixed(1)} L${xs[0].toFixed(1)},${(pad.t + ch).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => {
        const y = pad.t + ch * t;
        return <line key={t} x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="rgb(var(--border))" strokeDasharray="4 4" />;
      })}
      <path d={area} fill="url(#lc-fill)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xs[i]} cy={ys[i]} r="3.5" fill={color} stroke="rgb(var(--card))" strokeWidth="1.5" />
          <text x={xs[i]} y={H - 6} textAnchor="middle" fontSize="9" fill="rgb(var(--muted-foreground))">{d.label}</text>
          <text x={xs[i]} y={ys[i] - 9} textAnchor="middle" fontSize="9" fill={color} fontWeight="600">
            {d.value.toFixed(0)}{unit}
          </text>
        </g>
      ))}
    </svg>
  );
}
