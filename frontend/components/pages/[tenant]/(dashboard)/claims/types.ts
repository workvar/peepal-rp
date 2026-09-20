// Shared types for the Insurance / TPA claims page.

export type GqlPayer = {
  id: string;
  code: string;
  name: string;
  payerType: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  active: boolean;
};

export type GqlClaim = {
  id: string;
  claimNumber: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  payerId?: string | null;
  payerName?: string | null;
  policyNumber?: string | null;
  diagnosis?: string | null;
  claimAmount: number;
  approvedAmount: number;
  status: string;
  notes?: string | null;
  submittedAt?: string | null;
  settledAt?: string | null;
  createdAt?: string | null;
};

export const PAYER_TYPES = ["insurer", "tpa", "government", "corporate"];

export type PayerForm = {
  code: string; name: string; payer_type: string;
  contact_name: string; phone: string; email: string; active: boolean;
};

export const emptyPayerForm: PayerForm = {
  code: "", name: "", payer_type: "insurer", contact_name: "", phone: "", email: "", active: true,
};

export type ClaimForm = {
  patient_id: string; payer_id: string; policy_number: string;
  diagnosis: string; claim_amount: string; notes: string;
};

export const emptyClaimForm: ClaimForm = {
  patient_id: "", payer_id: "", policy_number: "", diagnosis: "", claim_amount: "", notes: "",
};

export const claimStatusVariant = (s: string): "gray" | "blue" | "yellow" | "green" | "red" => {
  if (s === "approved" || s === "settled") return "green";
  if (s === "rejected") return "red";
  if (s === "under_review" || s === "submitted") return "yellow";
  if (s === "draft") return "gray";
  return "blue";
};
