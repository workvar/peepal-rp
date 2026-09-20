export interface GroupedPoint {
  label: string;
  values: number[];
}

export interface GroupedSeries {
  name: string;
  color: string;
}

/** Grouped vertical bar chart (multi-series) as inline SVG, theme-aware. */
export default function GroupedBarChart({
  data,
  series,
  height = 220,
  formatValue,
}: {
  data: GroupedPoint[];
  series: GroupedSeries[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const W = 460;
  const H = height;
  const pad = { t: 28, r: 12, b: 28, l: 38 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;
  const maxV = Math.max(...data.flatMap((d) => d.values), 1);
  const groupGap = 16;
  const groupW = cw / data.length;
  const barGap = 3;
  const bw = Math.max(4, (groupW - groupGap) / series.length - barGap);
  const fmt = formatValue ?? ((v: number) => String(v));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      {[0, 0.5, 1].map((t) => {
        const y = pad.t + ch * t;
        return (
          <line key={t} x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="rgb(var(--border))" strokeDasharray="4 4" />
        );
      })}

      {/* Legend */}
      {series.map((s, i) => (
        <g key={s.name} transform={`translate(${pad.l + i * 92},10)`}>
          <rect width="10" height="10" rx="3" y="-9" fill={s.color} />
          <text x="15" y="0" fontSize="10" fill="rgb(var(--muted-foreground))">{s.name}</text>
        </g>
      ))}

      {data.map((d, gi) => {
        const groupX = pad.l + gi * groupW + groupGap / 2;
        return (
          <g key={gi}>
            {d.values.map((v, si) => {
              const barH = (v / maxV) * ch;
              const x = groupX + si * (bw + barGap);
              const y = pad.t + ch - barH;
              return (
                <rect
                  key={si}
                  x={x}
                  y={y}
                  width={bw}
                  height={barH}
                  rx="4"
                  fill={series[si].color}
                  fillOpacity="0.9"
                >
                  <title>{`${series[si].name}: ${fmt(v)}`}</title>
                </rect>
              );
            })}
            <text
              x={groupX + (d.values.length * (bw + barGap)) / 2 - barGap / 2}
              y={H - 8}
              textAnchor="middle"
              fontSize="9"
              fill="rgb(var(--muted-foreground))"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
