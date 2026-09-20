import apiClient from "@/api/client";

export type ApproverType = "manager" | "user" | "role" | "department";
// ApprovalProcess used to be a fixed enum. It's now a free-form code that
// matches an ApprovalProcessType row in the tenant. Built-in codes
// (leave/holiday/payroll/…) still exist, but admins can add new ones.
export type ApprovalProcess = string;
export type ConditionOp = "=" | "!=" | "<" | "<=" | ">" | ">=";
export type FormFieldType = "text" | "number" | "date" | "textarea";

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
}

export interface ApprovalStep {
  id?: string;
  step_order: number;
  name: string;
  approver_type: ApproverType;
  approver_user_id?: string | null;
  approver_role?: string | null;
  approver_department_id?: string | null;
  manager_level?: number;
  condition_field?: string | null;
  condition_op?: ConditionOp | null;
  condition_value?: string | null;
}

export interface ApprovalProcessType {
  id: string;
  code: string;
  label: string;
  description?: string;
  is_builtin: boolean;
  is_active: boolean;
}

export interface ApprovalFlow {
  id: string;
  name: string;
  process: ApprovalProcess;
  is_active: boolean;
  form_fields?: string; // JSON stringified FormField[]
  steps: ApprovalStep[];
  created_at?: string;
  updated_at?: string;
}

export interface ApprovalRequest {
  id: string;
  flow_id: string;
  process: ApprovalProcess;
  reference_id: string;
  requester_id: string;
  title: string;
  current_step: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

// Admin-only flow CRUD.
export const approvalFlowsAPI = {
  list: (process?: ApprovalProcess) =>
    apiClient.get("/org/approval-flows", {
      params: process ? { process } : undefined,
    }),
  get: (id: string) => apiClient.get(`/org/approval-flows/${id}`),
  create: (data: Partial<ApprovalFlow>) =>
    apiClient.post("/org/approval-flows", data),
  update: (id: string, data: Partial<ApprovalFlow>) =>
    apiClient.put(`/org/approval-flows/${id}`, data),
  remove: (id: string) => apiClient.delete(`/org/approval-flows/${id}`),
};

// Process types — admin only.
export const approvalProcessTypesAPI = {
  list: (activeOnly = false) =>
    apiClient.get("/org/approval-process-types", {
      params: activeOnly ? { active: 1 } : undefined,
    }),
  create: (data: Partial<ApprovalProcessType>) =>
    apiClient.post("/org/approval-process-types", data),
  update: (id: string, data: Partial<ApprovalProcessType>) =>
    apiClient.put(`/org/approval-process-types/${id}`, data),
  remove: (id: string) =>
    apiClient.delete(`/org/approval-process-types/${id}`),
};

// Live request endpoints, available to any authenticated user.
export const approvalRequestsAPI = {
  pending: () => apiClient.get("/approval-requests/pending"),
  mine: () => apiClient.get("/approval-requests/mine"),
  activeFlows: () => apiClient.get("/approval-requests/active-flows"),
  // Same rows as approvalProcessTypesAPI.list, but readable by any role so
  // non-admins can render process labels on their own requests.
  processTypes: (activeOnly = false) =>
    apiClient.get("/approval-requests/process-types", {
      params: activeOnly ? { active: 1 } : undefined,
    }),
  get: (id: string) => apiClient.get(`/approval-requests/${id}`),
  raise: (data: { flow_id: string; title: string; payload: Record<string, unknown> }) =>
    apiClient.post("/approval-requests", data),
  approve: (id: string, comment?: string) =>
    apiClient.post(`/approval-requests/${id}/approve`, { comment }),
  reject: (id: string, comment?: string) =>
    apiClient.post(`/approval-requests/${id}/reject`, { comment }),
};
