export type EmployeeTab = "personal" | "bank" | "pf_esi" | "tax_nps" | "salary";

/**
 * Salary template selection captured during CREATE (before the employee row
 * exists). Page.tsx replays this as a salary-assignment POST once the
 * employee is saved. During EDIT the Salary tab writes to the backend
 * directly, so this draft is unused.
 */
export interface DraftSalary {
  template_id: string;
  extra_allowance: number;
  extra_deduction: number;
  effective_from: string;
  notes: string;
}

export interface EmployeeFormState {
  name: string;
  email: string;
  password: string;
  role: string;
  department_id: string;
  designation: string;
  phone: string;
  join_date: string;
  employee_id: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  photo_url: string;
  employment_type: string;
  emergency_name: string;
  emergency_phone: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  ifsc_code: string;
  branch_name: string;
  pf_number: string;
  uan_number: string;
  pf_employee_percent: number;
  pf_employer_percent: number;
  esi_number: string;
  esi_dispensary: string;
  pan_number: string;
  tax_regime: string;
  form16_ref: string;
  nps_account_number: string;
  nps_tier: string;
  gratuity_eligible: boolean;
  manager_id: string;
  // Optional tenant-defined custom role (permissions overlay). Empty = none.
  custom_role_id: string;
}

export interface GqlEmployeePaymentDetails {
  bankName?: string | null;
  accountNumber?: string | null;
  accountType?: string | null;
  ifscCode?: string | null;
  branchName?: string | null;
  pfNumber?: string | null;
  uanNumber?: string | null;
  pfEmployeePercent?: number | null;
  pfEmployerPercent?: number | null;
  esiNumber?: string | null;
  esiDispensary?: string | null;
  panNumber?: string | null;
  taxRegime?: string | null;
  form16Ref?: string | null;
  npsAccountNumber?: string | null;
  npsTier?: string | null;
  gratuityEligible?: boolean | null;
}

export interface GqlEmployee {
  id: string;
  employeeId: string;
  designation?: string | null;
  phone?: string | null;
  joinDate?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  dateOfBirth?: string | null;
  photoUrl?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  employmentType?: string | null;
  user: { id: string; name: string; email: string; role?: string | null };
  department?: { id: string; name: string } | null;
  paymentDetails?: GqlEmployeePaymentDetails | null;
}

export interface GqlUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface GqlDepartment {
  id: string;
  name: string;
}
