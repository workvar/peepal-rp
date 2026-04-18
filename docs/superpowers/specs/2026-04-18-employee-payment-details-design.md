# Employee Payment Details — Design Spec

**Date:** 2026-04-18  
**Status:** Approved

## Overview

Add structured payment-related fields to the employee creation and edit flow: bank account, PF, ESI, tax/TDS, and NPS/gratuity details. All fields are optional. A tabbed modal UI organises the fields during creation.

---

## Data Model

New Go model `EmployeePaymentDetails` in `backend/models/employee.go`, 1:1 with `Employee` via `EmployeeID` unique FK.

```go
type EmployeePaymentDetails struct {
    ID         string   `gorm:"primaryKey" json:"id"`
    TenantID   string   `gorm:"not null;index" json:"tenant_id"`
    EmployeeID string   `gorm:"uniqueIndex;not null" json:"employee_id"`
    Employee   Employee `gorm:"foreignKey:EmployeeID" json:"-"`

    // Bank Account
    BankName      string `json:"bank_name"`
    AccountNumber string `json:"account_number"`
    AccountType   string `json:"account_type"`   // savings / current
    IFSCCode      string `json:"ifsc_code"`
    BranchName    string `json:"branch_name"`

    // PF
    PFNumber          string  `json:"pf_number"`
    UANNumber         string  `json:"uan_number"`
    PFEmployeePercent float64 `gorm:"default:12" json:"pf_employee_percent"`
    PFEmployerPercent float64 `gorm:"default:12" json:"pf_employer_percent"`

    // ESI
    ESINumber     string `json:"esi_number"`
    ESIDispensary string `json:"esi_dispensary"`

    // Tax / TDS
    PANNumber string `json:"pan_number"`
    TaxRegime string `json:"tax_regime"` // old / new
    Form16Ref string `json:"form16_ref"`

    // NPS / Gratuity
    NPSAccountNumber string `json:"nps_account_number"`
    NPSTier          string `json:"nps_tier"` // tier1 / tier2
    GratuityEligible bool   `gorm:"default:false" json:"gratuity_eligible"`

    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

func (epd *EmployeePaymentDetails) BeforeCreate(tx *gorm.DB) error {
    if epd.ID == "" {
        epd.ID = uuid.NewString()
    }
    return nil
}
```

`Employee` struct gets one new optional field:

```go
PaymentDetails *EmployeePaymentDetails `gorm:"foreignKey:EmployeeID" json:"payment_details,omitempty"`
```

`database.go` `Migrate()` adds `EmployeePaymentDetails` to the AutoMigrate call.

---

## API

No new routes. Changes are confined to the existing employee handlers.

**`POST /employees`**
- Request body gains an optional nested `payment_details` object.
- If any payment_details fields are non-empty, the handler creates an `EmployeePaymentDetails` record in the same transaction as the employee.

**`PUT /employees/:id`**
- Same nested `payment_details` object support.
- Handler upserts (create or update) the `EmployeePaymentDetails` record in the same transaction.

**`GET /employees`**
- Preloads `PaymentDetails` so every employee response includes the full payment record (or null if not set).

---

## Frontend

### Modal UI

Replace the current single-scroll modal with a **4-tab modal**:

| Tab | Fields |
|-----|--------|
| **Personal** | user_id, department_id, designation, phone, join_date, employee_id, date_of_birth, gender, blood_group, employment_type, emergency_name, emergency_phone |
| **Bank Account** | bank_name, account_number, account_type (savings/current), ifsc_code, branch_name |
| **PF & ESI** | pf_number, uan_number, pf_employee_percent, pf_employer_percent, esi_number, esi_dispensary |
| **Tax & NPS** | pan_number, tax_regime (old/new), form16_ref, nps_account_number, nps_tier (tier1/tier2), gratuity_eligible (checkbox) |

- Tab state is local to the modal — switching tabs does not submit.
- A single **"Add Employee"** button at the bottom of every tab submits the full payload.
- All payment fields are optional — the form is valid with only the Personal tab filled.

### TypeScript Type

`Employee` type in `frontend/types/index.ts` (or equivalent) gains:

```ts
payment_details?: {
  bank_name?: string;
  account_number?: string;
  account_type?: string;
  ifsc_code?: string;
  branch_name?: string;
  pf_number?: string;
  uan_number?: string;
  pf_employee_percent?: number;
  pf_employer_percent?: number;
  esi_number?: string;
  esi_dispensary?: string;
  pan_number?: string;
  tax_regime?: string;
  form16_ref?: string;
  nps_account_number?: string;
  nps_tier?: string;
  gratuity_eligible?: boolean;
};
```

### Redux Slice

No changes needed to `employeeSlice.ts` — `createEmployee` and `updateEmployee` already accept `object`.

---

## Constraints

- All payment detail fields are optional at creation time.
- One bank account per employee (enforced by the 1:1 uniqueIndex on `EmployeeID`).
- Payment details are stored in a separate table but always returned inline with the employee via preload.
- No separate API endpoint for payment details.
