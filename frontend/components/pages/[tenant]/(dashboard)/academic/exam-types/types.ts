// Shared types for the Exams (assessment definitions) page.

export type GqlDeptRef = { id: string; name: string };

export type GqlExamType = {
  id: string;
  name: string;
  departmentId?: string | null;
  department?: GqlDeptRef | null;
  maxMarks: number;
  weightage?: number | null;
  active: boolean;
  createdAt?: string | null;
};

export type ExamTypeForm = {
  name: string;
  department_id: string; // "" = org-wide
  max_marks: string;
  weightage: string;
  active: boolean;
};

export const emptyExamTypeForm: ExamTypeForm = {
  name: "",
  department_id: "",
  max_marks: "100",
  weightage: "",
  active: true,
};
