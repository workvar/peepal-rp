// Shared types for the Referrals page (healthcare industry).

export type GqlReferral = {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  fromClinicianId?: string | null;
  fromClinicianName?: string | null;
  referredTo: string;
  specialty?: string | null;
  reason?: string | null;
  urgency: string;
  referralDate?: string | null;
  status: string;
  notes?: string | null;
  commissionType: string;
  commissionValue: number;
  commissionBase: number;
  commissionAmount: number;
  payeeType?: string | null;
  payeeName?: string | null;
  payeeEmployeeId?: string | null;
  payeeEmployeeName?: string | null;
  settlementStatus: string;
  settledOn?: string | null;
};

export const URGENCIES = ["routine", "urgent", "emergency"];
export const COMMISSION_TYPES = ["none", "flat", "percent"];
export const PAYEE_TYPES = ["doctor", "centre"];

export const urgencyVariant = (u: string): "gray" | "yellow" | "red" =>
  u === "emergency" ? "red" : u === "urgent" ? "yellow" : "gray";

export const statusVariant = (s: string): "yellow" | "blue" | "green" | "gray" =>
  s === "completed" ? "green" : s === "accepted" ? "blue" : s === "declined" ? "gray" : "yellow";

export const settlementVariant = (s: string): "green" | "yellow" =>
  s === "settled" ? "green" : "yellow";

export type CommissionForm = {
  commission_type: string;
  commission_value: string;
  commission_base: string;
  payee_type: string;
  payee_name: string;
  payee_employee_id: string;
};

export const emptyCommissionForm: CommissionForm = {
  commission_type: "none",
  commission_value: "",
  commission_base: "",
  payee_type: "",
  payee_name: "",
  payee_employee_id: "",
};

export function commissionFormFromReferral(r: GqlReferral): CommissionForm {
  return {
    commission_type: r.commissionType || "none",
    commission_value: r.commissionValue ? String(r.commissionValue) : "",
    commission_base: r.commissionBase ? String(r.commissionBase) : "",
    payee_type: r.payeeType ?? "",
    payee_name: r.payeeName ?? "",
    payee_employee_id: r.payeeEmployeeId ?? "",
  };
}
