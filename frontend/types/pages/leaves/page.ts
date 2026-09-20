// GraphQL response shapes for the leaves and leave-types pages.
// Mirrors graphql/queries/leaves.ts (camelCase, gqlgen default).

export interface GqlLeaveType {
  id: string;
  name: string;
  code: string;
  daysPerYear: number;
  carryForward: boolean;
  maxCarryForward: number;
  applicableTo: string;
  isActive?: boolean | null;
}

export interface GqlLeave {
  id: string;
  applicantId: string;
  leaveTypeName?: string | null;
  leaveTypeId?: string | null;
  fromDate: string;
  toDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string | null;
  reviewNote?: string | null;
  applicant?: { id: string; name: string; email: string; role: string; isActive: boolean } | null;
}

export interface GqlLeaveBalance {
  id: string;
  userId: string;
  leaveTypeId: string;
  year: number;
  total: number;
  used: number;
  pending: number;
  leaveType?: GqlLeaveType | null;
}
