// Shared types for the Question Bank page.

export type GqlCourseRef = { id: string; name: string; code: string };

export type GqlSubjectRef = {
  id: string;
  name: string;
  code: string;
  units?: { title: string }[] | null;
};

/** A row from the curriculum query: subject assigned to a course-semester. */
export type GqlCurriculumSubject = {
  id: string;
  courseId: string;
  semesterNumber: number;
  subject: GqlSubjectRef;
};

export type GqlQuestion = {
  id: string;
  curriculumSubjectId: string;
  subjectId?: string | null;
  unit?: string | null;
  questionText: string;
  questionType: string;
  difficulty: string;
  marks: number;
  options: string[];
  answer?: string | null;
  courseOutcome?: string | null;
  active: boolean;
  createdAt?: string | null;
};

export type QuestionForm = {
  unit: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  marks: string;
  /** One option per line in the textarea; split on save. */
  options: string;
  answer: string;
  course_outcome: string;
  active: boolean;
};

export const emptyQuestionForm: QuestionForm = {
  unit: "",
  question_text: "",
  question_type: "long",
  difficulty: "medium",
  marks: "1",
  options: "",
  answer: "",
  course_outcome: "",
  active: true,
};

export const QUESTION_TYPES = [
  { value: "mcq", label: "Multiple Choice" },
  { value: "short", label: "Short Answer" },
  { value: "long", label: "Long Answer" },
  { value: "numeric", label: "Numeric" },
];

export const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

/** Badge colour per difficulty, so the table reads at a glance. */
export const difficultyVariant: Record<string, "green" | "yellow" | "red" | "gray"> = {
  easy: "green",
  medium: "yellow",
  hard: "red",
};
