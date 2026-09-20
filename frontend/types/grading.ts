// GraphQL shapes for the grading scheme + computed academic results.

export type GradeMode = "cgpa" | "gpa" | "percentage" | "letter" | "pass_fail";

export const GRADE_MODE_LABELS: Record<GradeMode, string> = {
  cgpa: "CGPA (grade points)",
  gpa: "GPA (grade points)",
  percentage: "Percentage",
  letter: "Letter grade",
  pass_fail: "Pass / Fail",
};

/** Modes that report a numeric grade point (SGPA / CGPA). */
export const GPA_MODES: GradeMode[] = ["cgpa", "gpa"];

export type GqlGradeBand = {
  id?: string;
  letter: string;
  minPercent: number;
  maxPercent: number;
  gradePoint: number;
  isPass: boolean;
  sortOrder: number;
};

export type GqlGradingScheme = {
  id: string;
  mode: GradeMode;
  gpaMax: number;
  passThreshold: number;
  decimals: number;
  creditWeighted: boolean;
  weightedByExamType: boolean;
  bands: GqlGradeBand[];
};

export type GqlSubjectResult = {
  subjectId?: string | null;
  subject: string;
  credits: number;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  letter: string;
  gradePoint: number;
  isPass: boolean;
};

export type GqlSemesterResult = {
  semester: number;
  subjects: GqlSubjectResult[];
  totalCredits: number;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  sgpa: number;
  letter: string;
  isPass: boolean;
};

export type GqlAcademicResult = {
  studentId: string;
  studentName: string;
  rollNumber: string;
  courseName: string;
  mode: GradeMode;
  gpaMax: number;
  semesters: GqlSemesterResult[];
  totalCredits: number;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  cgpa: number;
  letter: string;
  isPass: boolean;
  generatedAt: string;
};

/** Payload for the saveGradingScheme mutation. */
export type SaveGradingSchemeInput = {
  mode: GradeMode;
  gpaMax: number;
  passThreshold: number;
  decimals: number;
  creditWeighted: boolean;
  weightedByExamType: boolean;
  bands: Omit<GqlGradeBand, "id">[];
};
