import type { GradeMode, GqlGradingScheme } from "@/types/grading";

// Band rows hold string fields so the inputs stay easy to edit; they convert to
// numbers only on save.
export type BandRow = {
  letter: string;
  minPercent: string;
  maxPercent: string;
  gradePoint: string;
  isPass: boolean;
};

export type SchemeForm = {
  mode: GradeMode;
  gpaMax: string;
  passThreshold: string;
  decimals: string;
  creditWeighted: boolean;
  weightedByExamType: boolean;
  bands: BandRow[];
};

export const TEN_POINT_BANDS: BandRow[] = [
  { letter: "O", minPercent: "90", maxPercent: "100", gradePoint: "10", isPass: true },
  { letter: "A+", minPercent: "80", maxPercent: "89", gradePoint: "9", isPass: true },
  { letter: "A", minPercent: "70", maxPercent: "79", gradePoint: "8", isPass: true },
  { letter: "B+", minPercent: "60", maxPercent: "69", gradePoint: "7", isPass: true },
  { letter: "B", minPercent: "50", maxPercent: "59", gradePoint: "6", isPass: true },
  { letter: "C", minPercent: "40", maxPercent: "49", gradePoint: "5", isPass: true },
  { letter: "F", minPercent: "0", maxPercent: "39", gradePoint: "0", isPass: false },
];

export const FOUR_POINT_BANDS: BandRow[] = [
  { letter: "A", minPercent: "90", maxPercent: "100", gradePoint: "4", isPass: true },
  { letter: "B", minPercent: "80", maxPercent: "89", gradePoint: "3", isPass: true },
  { letter: "C", minPercent: "70", maxPercent: "79", gradePoint: "2", isPass: true },
  { letter: "D", minPercent: "60", maxPercent: "69", gradePoint: "1", isPass: true },
  { letter: "F", minPercent: "0", maxPercent: "59", gradePoint: "0", isPass: false },
];

export const emptyBand: BandRow = {
  letter: "",
  minPercent: "",
  maxPercent: "",
  gradePoint: "",
  isPass: true,
};

export const DEFAULT_FORM: SchemeForm = {
  mode: "cgpa",
  gpaMax: "10",
  passThreshold: "40",
  decimals: "2",
  creditWeighted: true,
  weightedByExamType: true,
  bands: TEN_POINT_BANDS.map((b) => ({ ...b })),
};

const num = (v: string): number => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export function schemeToForm(s: GqlGradingScheme): SchemeForm {
  return {
    mode: s.mode,
    gpaMax: String(s.gpaMax),
    passThreshold: String(s.passThreshold),
    decimals: String(s.decimals),
    creditWeighted: s.creditWeighted,
    weightedByExamType: s.weightedByExamType,
    bands: [...s.bands]
      .sort((a, b) => b.minPercent - a.minPercent)
      .map((b) => ({
        letter: b.letter,
        minPercent: String(b.minPercent),
        maxPercent: String(b.maxPercent),
        gradePoint: String(b.gradePoint),
        isPass: b.isPass,
      })),
  };
}

export function formToInput(f: SchemeForm) {
  return {
    mode: f.mode,
    gpaMax: num(f.gpaMax),
    passThreshold: num(f.passThreshold),
    decimals: parseInt(f.decimals, 10) || 0,
    creditWeighted: f.creditWeighted,
    weightedByExamType: f.weightedByExamType,
    bands: f.bands
      .filter((b) => b.letter.trim() !== "")
      .map((b, i) => ({
        letter: b.letter.trim(),
        minPercent: num(b.minPercent),
        maxPercent: num(b.maxPercent),
        gradePoint: num(b.gradePoint),
        isPass: b.isPass,
        sortOrder: i,
      })),
  };
}

// Resolve the band a percentage falls into (highest minPercent it still meets).
export function previewBand(bands: BandRow[], pct: number): BandRow | null {
  if (!Number.isFinite(pct) || pct < 0) return null;
  const sorted = [...bands]
    .map((b) => ({ row: b, min: num(b.minPercent) }))
    .sort((a, b) => b.min - a.min);
  for (const { row, min } of sorted) {
    if (pct >= min) return row;
  }
  return sorted.length ? sorted[sorted.length - 1].row : null;
}
