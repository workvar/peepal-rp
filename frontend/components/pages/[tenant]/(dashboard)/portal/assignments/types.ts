// Shared types for the student-facing assignments portal (Phase 6a).

export type PortalAssignment = {
  id: string;
  title: string;
  description?: string | null;
  subjectName?: string | null;
  teacherName?: string | null;
  maxMarks: number;
  dueDate?: string | null;
  attachmentUrl?: string | null;
  status: string;
};

export type PortalSubmission = {
  id: string;
  submittedAt?: string | null;
  text?: string | null;
  attachmentUrl?: string | null;
  status: string;
  marksAwarded?: number | null;
  feedback?: string | null;
};

export type MyAssignment = {
  assignment: PortalAssignment;
  submission?: PortalSubmission | null;
  canSubmit: boolean;
  late: boolean;
};

/**
 * The single label a student cares about: graded beats submitted, and an open
 * assignment past its due date is overdue rather than merely pending.
 */
export function statusLabel(entry: MyAssignment): { text: string; tone: "green" | "blue" | "red" | "gray" } {
  const { assignment, submission } = entry;
  if (submission?.status === "graded") return { text: "Graded", tone: "green" };
  if (submission) return { text: entry.late ? "Submitted late" : "Submitted", tone: "blue" };
  if (assignment.status === "closed") return { text: "Missed", tone: "red" };
  if (assignment.dueDate && assignment.dueDate < new Date().toISOString().slice(0, 10)) {
    return { text: "Overdue", tone: "red" };
  }
  return { text: "Pending", tone: "gray" };
}
