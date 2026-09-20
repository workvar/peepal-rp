// Decorative dash field for the closing page: thin diagonal strokes near the
// top that gradually rotate and thicken into solid "bucket" marks at the
// bottom, echoing the printed brochure's motif.
export default function DashField() {
  const cols = 9;
  const rows = 11;
  const cellW = 100;
  const cellH = 70;
  const marks = [];

  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1); // 0 (top) → 1 (bottom)
    const angle = 60 - t * 60; // backslash-ish → vertical
    const weight = 2 + t * 5; // thin → thick
    const solid = t > 0.55; // lower rows become filled trapezoids
    for (let c = 0; c < cols; c++) {
      const cx = c * cellW + cellW / 2 + 40;
      const cy = r * cellH + cellH / 2 + 30;
      if (solid) {
        const w = 26 + t * 10;
        const h = 6 + t * 10;
        marks.push(
          <polygon
            key={`${r}-${c}`}
            points={`${cx - w / 2},${cy + h / 2} ${cx + w / 2},${cy + h / 2} ${
              cx + w / 2 - 5
            },${cy - h / 2} ${cx - w / 2 + 5},${cy - h / 2}`}
            fill="#13301c"
            opacity={0.55 + t * 0.4}
          />
        );
      } else {
        marks.push(
          <line
            key={`${r}-${c}`}
            x1={cx}
            y1={cy - 16}
            x2={cx}
            y2={cy + 16}
            stroke="#4f8a64"
            strokeWidth={weight}
            strokeLinecap="round"
            opacity={0.35 + t * 0.4}
            transform={`rotate(${angle} ${cx} ${cy})`}
          />
        );
      }
    }
  }

  return (
    <svg
      aria-hidden
      viewBox="0 0 980 830"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {marks}
    </svg>
  );
}
