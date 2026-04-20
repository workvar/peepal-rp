# Payroll Page Rebuild — Design Spec

**Date:** 2026-04-20
**Status:** Approved

## Problem

The current payroll page has several gaps:

1. **Table shows too little**: only Gross, Deductions, Net Pay — no salary component breakdown, no template name, no payment date.
2. **PDF fields missing**: employee name, department, designation, email, and payment mode are not populated in the rendered payslip.
3. **PDF math broken**: `ExtraAllowance` and `ExtraDeduction` are stored separately in the GORM model but are not shown as line items in the PDF, so the earnings/deductions rows don't sum to the Gross/Total Deductions totals.
4. **No payment mode UI**: "Mark Paid" is a single button click with no way to record how the employee was paid.

## Scope

Changes are confined to:

- `frontend/components/pages/[tenant]/(dashboard)/payroll/Page.tsx` — table + drawer + Mark Paid modal
- `frontend/graphql/queries/payroll.ts` — add `templateName` to the fragment
- `frontend/types/pages/payroll/page.ts` — add `templateName` to `GqlPayroll`
- `frontend/graphql/mutations/payroll.ts` — `UPDATE_PAYROLL_STATUS` must include `paymentMode` in the response
- `backend/utils/payslip_pdf.go` — add ExtraAllowance/ExtraDeduction rows, fix earnings sum
- `backend/handlers/payslip.go` — debug and fix employee info preload issue (name/dept/designation/email blank)

Three additive GraphQL schema fields (`extraAllowance`, `extraDeduction`, `templateName` on `Payroll`). No new models, no new routes, no database migrations.

## Architecture

### 1. Main Table

Compact summary table. Columns:

| Column | Field(s) | Visibility |
|---|---|---|
| Employee | `employee.user.name` + `employee.employeeId` + `employee.department.name` | admin only |
| Period | `month` + `year` | all |
| Template | `templateName` | all |
| Gross | `grossSalary` | all |
| Deductions | `totalDeductions` | all |
| Net Pay | `netSalary` | all |
| Paid On | `paymentDate` (blank if null) | all |
| Status | badge: draft / approved / paid | all |
| Actions | View · Approve · Mark Paid · Delete · PDF | role-gated |

### 2. Detail Drawer

A right-side panel that slides in when "View" is clicked. Closes with an ✕ button or clicking outside. Sections:

**Employee**
- Name, Employee ID, Department, Designation, Email

**Pay Period**
- Month/Year, Template Name, Processed By

**Earnings**
| Item | Field |
|---|---|
| Basic Salary | `basicSalary` |
| HRA | `hra` |
| DA | `da` |
| TA | `ta` |
| Medical Allowance | `medicalAllowance` |
| Other Allowances | `otherAllowances` (raw, before extra) |
| Extra Allowance | `extraAllowance` (shown only if > 0) |
| **Gross Salary** | `grossSalary` (bold total row) |

**Deductions**
| Item | Field |
|---|---|
| Provident Fund (PF) | `pf` |
| ESI | `esi` |
| TDS | `tds` |
| Other Deductions | `otherDeductions` (raw, before extra) |
| Extra Deduction | `extraDeduction` (shown only if > 0) |
| **Total Deductions** | `totalDeductions` (bold total row) |

**Net Pay**
- Large highlighted banner showing `netSalary`

**Attendance**
- Working Days / Present Days / Leave Days

**Payment**
- Date, Mode, Notes

> The resolver currently folds `ExtraAllowance` into `otherAllowances` before returning it. To show them separately in the drawer, we add `extraAllowance` and `extraDeduction` as first-class fields on the `Payroll` GraphQL type (see Section 5) and expose the raw values from `payrollToModel`. The `otherAllowances` field then returns only the template's base value.

### 3. Mark Paid Modal

Triggered when "Mark Paid" is clicked on an approved payroll. Replaces the direct button → mutation pattern.

Fields:
- **Payment Mode** (required dropdown): Bank Transfer · Cash · Cheque · UPI · NEFT · RTGS
- **Payment Date** (date input, defaults to today, editable)

On confirm: calls `updatePayrollStatus` mutation with `status: "paid"`, `paymentDate`, and `paymentMode`.

### 4. PDF Fixes

**File:** `backend/utils/payslip_pdf.go`

Fix `drawEarningsAndDeductions`:
- Current: `OtherAllowances` row uses `p.OtherAllowances` directly — ExtraAllowance is excluded, so earnings don't sum to gross
- Fix: add `ExtraAllowance` as a conditional row (skip if 0) after `OtherAllowances`
- Same fix for `ExtraDeduction` in the deductions column

**File:** `backend/handlers/payslip.go`

The employee info fields (name, department, designation, email) are blank in the PDF. Root cause: investigate whether the REST `apiClient` on the frontend sends the `X-Tenant-ID` or equivalent tenant header. The backend `DownloadPayslipPDF` handler does `WHERE tenant_id = ?` using `middleware.TenantID(c)` — if this returns empty string, the query finds the payroll but `EmployeeModel` may not be preloaded due to the missing tenant scoping. Fix: verify and ensure the REST client sends the same auth/tenant headers as the GraphQL client. If the tenant ID header is missing, the handler should return a 400 rather than silently serving an empty PDF.

### 5. GraphQL / Type Changes

**`frontend/graphql/queries/payroll.ts`**
- Add `templateName` to `PAYROLL_FIELDS`
- Add `extraAllowance extraDeduction` to `PAYROLL_FIELDS`

**`frontend/types/pages/payroll/page.ts`**
- Add `templateName?: string | null` to `GqlPayroll`
- Add `extraAllowance: number` and `extraDeduction: number` to `GqlPayroll`

**`backend/graph/payroll.resolvers.go` — `payrollToModel`**
- Expose `ExtraAllowance` and `ExtraDeduction` as separate fields instead of folding them into `OtherAllowances`/`OtherDeductions`
- Add `TemplateName` mapping

**`backend/graph/model` (schema.graphqls)**
- Add `extraAllowance: Float!`, `extraDeduction: Float!`, `templateName: String` to `Payroll` type

## Error Handling

- Drawer: if employee sub-fields are null (e.g., no department assigned), show "—" fallback
- Mark Paid modal: payment mode is required; disable confirm until selected
- PDF download: existing error toast logic is sufficient; if the PDF endpoint returns a non-200, surface the error message

## Out of Scope

- Salary template / assignment management (separate page)
- Bulk payroll generation
- Payroll reports page (separate route)
- Any database migrations
