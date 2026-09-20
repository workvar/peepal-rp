// Shared types for the teacher-facing Assignments page (Phase 6a).

export type GqlAssignment = {
  id: string;
  title: string;
  description?: string | null;
  courseId?: string | null;
  courseName?: string | null;
  semester?: number | null;
  section?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  teacherId: string;
  teacherName: string;
  maxMarks: number;
  dueDate?: string | null;
  attachmentUrl?: string | null;
  status: string;
  submissionCount: number;
  gradedCount: number;
  createdAt?: string | null;
};

export type GqlSubmission = {
  id: string;
  assignmentId: string;
  assignmentTitle?: string | null;
  maxMarks: number;
  studentId: string;
  studentName: string;
  rollNumber?: string | null;
  submittedAt?: string | null;
  text?: string | null;
  attachmentUrl?: string | null;
  status: string;
  marksAwarded?: number | null;
  feedback?: string | null;
  gradedByName?: string | null;
};

export type PickerCourse = { id: string; name: string; code: string };
export type PickerSubject = { id: string; name: string; code?: string | null };

export type AssignmentForm = {
  title: string;
  description: string;
  course_id: string;
  semester: string;
  section: string;
  subject_id: string;
  max_marks: string;
  due_date: string;
  attachment_url: string;
};

export const emptyAssignmentForm: AssignmentForm = {
  title: "",
  description: "",
  course_id: "",
  semester: "",
  section: "",
  subject_id: "",
  max_marks: "10",
  due_date: "",
  attachment_url: "",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
};

export const STATUS_VARIANTS: Record<string, "gray" | "green" | "yellow"> = {
  draft: "gray",
  published: "green",
  closed: "yellow",
};

/** True once the due date has passed, used to flag overdue coursework. */
export function isOverdue(a: GqlAssignment): boolean {
  if (!a.dueDate || a.status !== "published") return false;
  return a.dueDate < new Date().toISOString().slice(0, 10);
}
