// Shared types for the Hall Tickets page.

export type GqlCourseRef = { id: string; name: string; code: string };

export type GqlExamScheduleRef = {
  id: string;
  name: string;
  examType: string;
  semesterNumber?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  published: boolean;
};

export type GqlHallTicket = {
  id: string;
  examScheduleId: string;
  studentId: string;
  ticketNumber: string;
  seatNumber?: string | null;
  examCenter?: string | null;
  eligible: boolean;
  holdReason?: string | null;
  issuedOn?: string | null;
  status: string;
  qrPayload: string;
  student?: {
    id: string;
    rollNumber: string;
    semester?: number | null;
    section?: string | null;
    user?: { id: string; name: string } | null;
    course?: { id: string; name: string; code: string } | null;
  } | null;
};

export type IssueForm = {
  course_id: string;
  semester_number: string;
  exam_center: string;
  seat_prefix: string;
  check_fee_dues: boolean;
  /** Blank = skip the attendance gate entirely. */
  min_attendance: string;
};

export const emptyIssueForm: IssueForm = {
  course_id: "",
  semester_number: "",
  exam_center: "",
  seat_prefix: "",
  check_fee_dues: false,
  min_attendance: "",
};

export const statusVariant: Record<string, "green" | "yellow" | "red" | "gray"> = {
  issued: "green",
  held: "yellow",
  revoked: "red",
};
