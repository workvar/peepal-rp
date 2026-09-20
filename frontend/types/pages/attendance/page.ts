// GraphQL response shapes for the attendance pages.
// Mirrors graphql/queries/attendance.ts (camelCase, gqlgen default).

export interface GqlAttendanceRecord {
  id: string;
  entityId: string;
  entityType: "student" | "employee";
  date: string;
  status: string;
  markedBy?: string | null;
  remarks?: string | null;
  subjectId?: string | null;
}

export interface GqlAttendanceSummaryRow {
  entityId: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  attendancePct: number;
}

export interface GqlShortageItem {
  total: number;
  present: number;
  attendancePct: number;
  student: {
    id: string;
    rollNumber: string;
    user?: { id: string; name: string } | null;
    course?: { id: string; name: string } | null;
  };
}
