import type { EmployeeFormState, GqlEmployee } from "@/types/pages/employees/page";

export const emptyEmployeeForm: EmployeeFormState = {
  name: "",
  email: "",
  password: "",
  role: "staff",
  department_id: "",
  designation: "",
  phone: "",
  join_date: "",
  employee_id: "",
  date_of_birth: "",
  gender: "",
  blood_group: "",
  photo_url: "",
  employment_type: "",
  emergency_name: "",
  emergency_phone: "",
  bank_name: "",
  account_number: "",
  account_type: "",
  ifsc_code: "",
  branch_name: "",
  pf_number: "",
  uan_number: "",
  pf_employee_percent: 12,
  pf_employer_percent: 12,
  esi_number: "",
  esi_dispensary: "",
  pan_number: "",
  tax_regime: "",
  form16_ref: "",
  nps_account_number: "",
  nps_tier: "",
  gratuity_eligible: false,
  manager_id: "",
  custom_role_id: "",
};

/**
 * Populate the edit form with values from an existing employee record.
 * GraphQL returns camelCase; our form keys are snake_case. Falls back to
 * empty-form defaults for fields the server did not return.
 */
export function employeeFormFromGql(employee: GqlEmployee): EmployeeFormState {
  const pd = employee.paymentDetails ?? null;
  return {
    ...emptyEmployeeForm,
    name: employee.user?.name ?? "",
    email: employee.user?.email ?? "",
    password: "",
    role: employee.user?.role ?? "staff",
    department_id: employee.department?.id ?? "",
    designation: employee.designation ?? "",
    phone: employee.phone ?? "",
    join_date: employee.joinDate ? employee.joinDate.slice(0, 10) : "",
    employee_id: employee.employeeId ?? "",
    date_of_birth: employee.dateOfBirth ? employee.dateOfBirth.slice(0, 10) : "",
    gender: employee.gender ?? "",
    blood_group: employee.bloodGroup ?? "",
    photo_url: employee.photoUrl ?? "",
    employment_type: employee.employmentType ?? "",
    emergency_name: employee.emergencyName ?? "",
    emergency_phone: employee.emergencyPhone ?? "",
    bank_name: pd?.bankName ?? "",
    account_number: pd?.accountNumber ?? "",
    account_type: pd?.accountType ?? "",
    ifsc_code: pd?.ifscCode ?? "",
    branch_name: pd?.branchName ?? "",
    pf_number: pd?.pfNumber ?? "",
    uan_number: pd?.uanNumber ?? "",
    pf_employee_percent: pd?.pfEmployeePercent ?? 12,
    pf_employer_percent: pd?.pfEmployerPercent ?? 12,
    esi_number: pd?.esiNumber ?? "",
    esi_dispensary: pd?.esiDispensary ?? "",
    pan_number: pd?.panNumber ?? "",
    tax_regime: pd?.taxRegime ?? "",
    form16_ref: pd?.form16Ref ?? "",
    nps_account_number: pd?.npsAccountNumber ?? "",
    nps_tier: pd?.npsTier ?? "",
    gratuity_eligible: pd?.gratuityEligible ?? false,
  };
}

/**
 * Build the GraphQL UpdateEmployeeInput payload (camelCase). Unlike the
 * create input we always include paymentDetails so existing banking/PF
 * records can be edited even if all fields are cleared.
 */
export function buildEmployeeUpdateInput(form: EmployeeFormState) {
  return {
    name: form.name,
    email: form.email || null,
    role: form.role || null,
    ...(form.password ? { password: form.password } : {}),
    employeeId: form.employee_id,
    departmentId: form.department_id || null,
    designation: form.designation || null,
    phone: form.phone || null,
    joinDate: form.join_date || null,
    dateOfBirth: form.date_of_birth || null,
    gender: form.gender || null,
    bloodGroup: form.blood_group || null,
    photoUrl: form.photo_url || null,
    employmentType: form.employment_type || null,
    emergencyName: form.emergency_name || null,
    emergencyPhone: form.emergency_phone || null,
    paymentDetails: {
      bankName: form.bank_name || null,
      accountNumber: form.account_number || null,
      accountType: form.account_type || null,
      ifscCode: form.ifsc_code || null,
      branchName: form.branch_name || null,
      pfNumber: form.pf_number || null,
      uanNumber: form.uan_number || null,
      pfEmployeePercent: form.pf_employee_percent,
      pfEmployerPercent: form.pf_employer_percent,
      esiNumber: form.esi_number || null,
      esiDispensary: form.esi_dispensary || null,
      panNumber: form.pan_number || null,
      taxRegime: form.tax_regime || null,
      form16Ref: form.form16_ref || null,
      npsAccountNumber: form.nps_account_number || null,
      npsTier: form.nps_tier || null,
      gratuityEligible: form.gratuity_eligible,
    },
  };
}

export function buildEmployeeInput(
  form: EmployeeFormState,
  invite?: { sendInvite: boolean; password: string }
) {
  const hasPaymentDetails = Boolean(
    form.bank_name ||
      form.account_number ||
      form.pf_number ||
      form.uan_number ||
      form.esi_number ||
      form.pan_number ||
      form.nps_account_number
  );

  const password = invite ? invite.password : form.password;
  return {
    name: form.name,
    email: form.email || null,
    password: password || null,
    sendInvite: invite ? invite.sendInvite : false,
    role: form.role || null,
    employeeId: form.employee_id,
    departmentId: form.department_id || null,
    designation: form.designation || null,
    phone: form.phone || null,
    joinDate: form.join_date || null,
    dateOfBirth: form.date_of_birth || null,
    gender: form.gender || null,
    bloodGroup: form.blood_group || null,
    photoUrl: form.photo_url || null,
    employmentType: form.employment_type || null,
    emergencyName: form.emergency_name || null,
    emergencyPhone: form.emergency_phone || null,
    ...(hasPaymentDetails
      ? {
          paymentDetails: {
            bankName: form.bank_name || null,
            accountNumber: form.account_number || null,
            accountType: form.account_type || null,
            ifscCode: form.ifsc_code || null,
            branchName: form.branch_name || null,
            pfNumber: form.pf_number || null,
            uanNumber: form.uan_number || null,
            pfEmployeePercent: form.pf_employee_percent,
            pfEmployerPercent: form.pf_employer_percent,
            esiNumber: form.esi_number || null,
            esiDispensary: form.esi_dispensary || null,
            panNumber: form.pan_number || null,
            taxRegime: form.tax_regime || null,
            form16Ref: form.form16_ref || null,
            npsAccountNumber: form.nps_account_number || null,
            npsTier: form.nps_tier || null,
            gratuityEligible: form.gratuity_eligible,
          },
        }
      : {}),
  };
}
