// Shared types for the Question Papers page.

export type GqlCourseRef = { id: string; name: string; code: string };

export type GqlCurriculumSubject = {
  id: string;
  courseId: string;
  semesterNumber: number;
  subject: { id: string; name: string; code: string; units?: { title: string }[] | null };
};

export type GqlExamTypeRef = { id: string; name: string; maxMarks: number };

export type GqlPaperItem = {
  id: string;
  seqNo: number;
  questionText: string;
  questionType: string;
  marks: number;
  options: string[];
  section?: string | null;
};

export type GqlQuestionPaper = {
  id: string;
  title: string;
  examTypeId?: string | null;
  curriculumSubjectId: string;
  subjectId?: string | null;
  totalMarks: number;
  durationMinutes?: number | null;
  instructions?: string | null;
  status: string;
  createdAt?: string | null;
  items: GqlPaperItem[];
};

/** The rule builder's form state. Marks per difficulty drive the generator. */
export type GenerateForm = {
  title: string;
  exam_type_id: string;
  total_marks: string;
  duration_minutes: string;
  instructions: string;
  easy_marks: string;
  medium_marks: string;
  hard_marks: string;
  /** Unit titles to draw from; empty = whole syllabus. */
  units: string[];
  mcq_count: string;
  short_count: string;
  long_count: string;
  numeric_count: string;
  /** Blank = random each run; set it to reproduce a paper exactly. */
  seed: string;
};

export const emptyGenerateForm: GenerateForm = {
  title: "",
  exam_type_id: "",
  total_marks: "100",
  duration_minutes: "180",
  instructions: "",
  easy_marks: "",
  medium_marks: "",
  hard_marks: "",
  units: [],
  mcq_count: "",
  short_count: "",
  long_count: "",
  numeric_count: "",
  seed: "",
};

export const SECTION_LABELS: Record<string, string> = {
  A: "Section A — Objective",
  B: "Section B — Short Answer",
  C: "Section C — Long Answer",
};
