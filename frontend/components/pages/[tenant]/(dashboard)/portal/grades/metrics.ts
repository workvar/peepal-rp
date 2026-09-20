import { GPA_MODES, type GradeMode } from "@/types/grading";

// Percentage → colour tier for the small grade chip (display only, independent
// of the configured letters).
export function pctTier(pct: number): string {
  if (pct >= 85) return "bg-emerald-500";
  if (pct >= 70) return "bg-green-500";
  if (pct >= 60) return "bg-lime-500";
  if (pct >= 50) return "bg-amber-500";
  if (pct >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export type Metric = { value: string; label: string };

export function overallPrimary(
  mode: GradeMode,
  r: { cgpa: number; percentage: number; letter: string; isPass: boolean; gpaMax: number },
): Metric {
  if (GPA_MODES.includes(mode)) return { value: r.cgpa.toFixed(2), label: `CGPA / ${r.gpaMax}` };
  if (mode === "percentage") return { value: `${r.percentage}%`, label: "Overall %" };
  if (mode === "letter") return { value: r.letter || "—", label: "Overall grade" };
  return { value: r.isPass ? "Pass" : "Fail", label: "Result" };
}

export function semesterPrimary(
  mode: GradeMode,
  s: { sgpa: number; percentage: number; letter: string; isPass: boolean },
  gpaMax: number,
): Metric {
  if (GPA_MODES.includes(mode)) return { value: s.sgpa.toFixed(2), label: `SGPA / ${gpaMax}` };
  if (mode === "percentage") return { value: `${s.percentage}%`, label: "Percentage" };
  if (mode === "letter") return { value: s.letter || "—", label: "Grade" };
  return { value: s.isPass ? "Pass" : "Fail", label: "Result" };
}
