# Employee Payment Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 1:1 `EmployeePaymentDetails` model storing bank account, PF, ESI, tax, and NPS/gratuity fields, surfaced via a 4-tab modal during employee creation.

**Architecture:** A new `EmployeePaymentDetails` Go model links to `Employee` via a unique FK. The existing `POST /employees` and `PUT /employees/:id` handlers accept an optional nested `payment_details` object and upsert the record in a transaction. The frontend employees page replaces its single-scroll form with a tabbed modal — Personal / Bank Account / PF & ESI / Tax & NPS — that submits everything in one request.

**Tech Stack:** Go 1.25, GORM v2, Fiber v2, PostgreSQL (Aiven), Next.js 14, TypeScript, Redux Toolkit, pnpm

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `backend/models/employee.go` | Modify | Add `EmployeePaymentDetails` struct + `BeforeCreate`; add `PaymentDetails` field to `Employee` |
| `backend/database/database.go` | Modify | Add `&models.EmployeePaymentDetails{}` to `AutoMigrate` |
| `backend/handlers/employees.go` | Modify | Add `PaymentDetailsRequest` struct; update `CreateEmployee`, `UpdateEmployee`, `ListEmployees`, `GetEmployee` |
| `frontend/types/index.ts` | Modify | Add `EmployeePaymentDetails` interface; update `Employee` interface |
| `frontend/app/[tenant]/(dashboard)/employees/page.tsx` | Modify | Replace single-scroll form with 4-tab modal |

---

### Task 1: Add `EmployeePaymentDetails` model

**Files:**
- Modify: `backend/models/employee.go`

- [ ] **Step 1: Add the new struct and BeforeCreate hook**

Open `backend/models/employee.go`. After the closing brace of `Employee`'s `BeforeCreate` (line 60), append:

```go
// EmployeePaymentDetails holds payment-related compliance fields for an employee.
type EmployeePaymentDetails struct {
	ID         string   `gorm:"primaryKey" json:"id"`
	TenantID   string   `gorm:"not null;index" json:"tenant_id"`
	EmployeeID string   `gorm:"uniqueIndex;not null" json:"employee_id"`
	Employee   Employee `gorm:"foreignKey:EmployeeID" json:"-"`

	// Bank Account
	BankName      string `json:"bank_name"`
	AccountNumber string `json:"account_number"`
	AccountType   string `json:"account_type"` // savings / current
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

- [ ] **Step 2: Add `PaymentDetails` field to the `Employee` struct**

In `backend/models/employee.go`, add this line to the `Employee` struct after `UpdatedAt time.Time`:

```go
PaymentDetails *EmployeePaymentDetails `gorm:"foreignKey:EmployeeID" json:"payment_details,omitempty"`
```

The bottom of the `Employee` struct should now read:

```go
	JoinDate         time.Time               `json:"join_date"`
	CreatedAt        time.Time               `json:"created_at"`
	UpdatedAt        time.Time               `json:"updated_at"`
	PaymentDetails   *EmployeePaymentDetails `gorm:"foreignKey:EmployeeID" json:"payment_details,omitempty"`
}
```

- [ ] **Step 3: Verify the file compiles**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go build ./models/...
```

Expected: no output (success).

- [ ] **Step 4: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend
git add models/employee.go
git commit -m "feat: add EmployeePaymentDetails model"
```

---

### Task 2: Register model in AutoMigrate

**Files:**
- Modify: `backend/database/database.go`

- [ ] **Step 1: Add `EmployeePaymentDetails` to the AutoMigrate call**

In `backend/database/database.go`, find the line `&models.Employee{},` (line 45) and add the new model directly after it:

```go
		&models.Employee{},
		&models.EmployeePaymentDetails{},
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go build ./database/...
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add database/database.go
git commit -m "feat: register EmployeePaymentDetails in AutoMigrate"
```

---

### Task 3: Update employee handlers

**Files:**
- Modify: `backend/handlers/employees.go`

- [ ] **Step 1: Add `PaymentDetailsRequest` struct**

In `backend/handlers/employees.go`, directly before `type CreateEmployeeRequest struct`, add:

```go
type PaymentDetailsRequest struct {
	BankName          string  `json:"bank_name"`
	AccountNumber     string  `json:"account_number"`
	AccountType       string  `json:"account_type"`
	IFSCCode          string  `json:"ifsc_code"`
	BranchName        string  `json:"branch_name"`
	PFNumber          string  `json:"pf_number"`
	UANNumber         string  `json:"uan_number"`
	PFEmployeePercent float64 `json:"pf_employee_percent"`
	PFEmployerPercent float64 `json:"pf_employer_percent"`
	ESINumber         string  `json:"esi_number"`
	ESIDispensary     string  `json:"esi_dispensary"`
	PANNumber         string  `json:"pan_number"`
	TaxRegime         string  `json:"tax_regime"`
	Form16Ref         string  `json:"form16_ref"`
	NPSAccountNumber  string  `json:"nps_account_number"`
	NPSTier           string  `json:"nps_tier"`
	GratuityEligible  bool    `json:"gratuity_eligible"`
}
```

- [ ] **Step 2: Add `PaymentDetails` field to `CreateEmployeeRequest`**

In the `CreateEmployeeRequest` struct, add after `JoinDate string`:

```go
	PaymentDetails *PaymentDetailsRequest `json:"payment_details"`
```

- [ ] **Step 3: Replace `ListEmployees` to preload PaymentDetails**

Replace the existing `ListEmployees` function body:

```go
func ListEmployees(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var employees []models.Employee
	database.DB.Where("tenant_id = ?", tenantID).
		Preload("User").
		Preload("Department").
		Preload("PaymentDetails").
		Find(&employees)
	return utils.OK(c, employees, "")
}
```

- [ ] **Step 4: Replace `GetEmployee` to preload PaymentDetails**

Replace the existing `GetEmployee` function body:

```go
func GetEmployee(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	var emp models.Employee
	if err := database.DB.Where("id = ? AND tenant_id = ?", id, tenantID).
		Preload("User").
		Preload("Department").
		Preload("PaymentDetails").
		First(&emp).Error; err != nil {
		return utils.NotFound(c, "Employee not found")
	}
	return utils.OK(c, emp, "")
}
```

- [ ] **Step 5: Replace `CreateEmployee` to upsert PaymentDetails in a transaction**

Replace the entire `CreateEmployee` function:

```go
func CreateEmployee(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req CreateEmployeeRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.UserID == "" {
		return utils.BadRequest(c, "user_id is required")
	}

	joinDate, _ := time.Parse("2006-01-02", req.JoinDate)
	emp := models.Employee{
		TenantID:         tenantID,
		UserID:           req.UserID,
		DepartmentID:     req.DepartmentID,
		Designation:      req.Designation,
		Phone:            req.Phone,
		EmployeeID:       req.EmployeeID,
		DateOfBirth:      req.DateOfBirth,
		Gender:           req.Gender,
		BloodGroup:       req.BloodGroup,
		PhotoURL:         req.PhotoURL,
		Address:          req.Address,
		City:             req.City,
		State:            req.State,
		Pincode:          req.Pincode,
		Nationality:      req.Nationality,
		PersonalEmail:    req.PersonalEmail,
		EmergencyName:    req.EmergencyName,
		EmergencyPhone:   req.EmergencyPhone,
		EmploymentType:   req.EmploymentType,
		ProbationEndDate: req.ProbationEndDate,
		GradeLevel:       req.GradeLevel,
		JoinDate:         joinDate,
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&emp).Error; err != nil {
			return err
		}
		if req.PaymentDetails != nil {
			pd := models.EmployeePaymentDetails{
				TenantID:          tenantID,
				EmployeeID:        emp.ID,
				BankName:          req.PaymentDetails.BankName,
				AccountNumber:     req.PaymentDetails.AccountNumber,
				AccountType:       req.PaymentDetails.AccountType,
				IFSCCode:          req.PaymentDetails.IFSCCode,
				BranchName:        req.PaymentDetails.BranchName,
				PFNumber:          req.PaymentDetails.PFNumber,
				UANNumber:         req.PaymentDetails.UANNumber,
				PFEmployeePercent: req.PaymentDetails.PFEmployeePercent,
				PFEmployerPercent: req.PaymentDetails.PFEmployerPercent,
				ESINumber:         req.PaymentDetails.ESINumber,
				ESIDispensary:     req.PaymentDetails.ESIDispensary,
				PANNumber:         req.PaymentDetails.PANNumber,
				TaxRegime:         req.PaymentDetails.TaxRegime,
				Form16Ref:         req.PaymentDetails.Form16Ref,
				NPSAccountNumber:  req.PaymentDetails.NPSAccountNumber,
				NPSTier:           req.PaymentDetails.NPSTier,
				GratuityEligible:  req.PaymentDetails.GratuityEligible,
			}
			if err := tx.Create(&pd).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return utils.BadRequest(c, "Could not create employee — user may already be registered")
	}

	database.DB.Preload("User").Preload("Department").Preload("PaymentDetails").First(&emp, "id = ?", emp.ID)
	return utils.Created(c, emp, "Employee created")
}
```

- [ ] **Step 6: Update `UpdateEmployee` to upsert PaymentDetails**

Insert this block inside `UpdateEmployee`, just before the existing `database.DB.Save(&emp)` line:

```go
	// Upsert payment_details if provided
	if pdRaw, ok := body["payment_details"].(map[string]interface{}); ok && pdRaw != nil {
		var pd models.EmployeePaymentDetails
		isNew := database.DB.Where("employee_id = ?", emp.ID).First(&pd).Error != nil
		pd.TenantID = tenantID
		pd.EmployeeID = emp.ID
		if v, ok := pdRaw["bank_name"].(string); ok { pd.BankName = v }
		if v, ok := pdRaw["account_number"].(string); ok { pd.AccountNumber = v }
		if v, ok := pdRaw["account_type"].(string); ok { pd.AccountType = v }
		if v, ok := pdRaw["ifsc_code"].(string); ok { pd.IFSCCode = v }
		if v, ok := pdRaw["branch_name"].(string); ok { pd.BranchName = v }
		if v, ok := pdRaw["pf_number"].(string); ok { pd.PFNumber = v }
		if v, ok := pdRaw["uan_number"].(string); ok { pd.UANNumber = v }
		if v, ok := pdRaw["pf_employee_percent"].(float64); ok { pd.PFEmployeePercent = v }
		if v, ok := pdRaw["pf_employer_percent"].(float64); ok { pd.PFEmployerPercent = v }
		if v, ok := pdRaw["esi_number"].(string); ok { pd.ESINumber = v }
		if v, ok := pdRaw["esi_dispensary"].(string); ok { pd.ESIDispensary = v }
		if v, ok := pdRaw["pan_number"].(string); ok { pd.PANNumber = v }
		if v, ok := pdRaw["tax_regime"].(string); ok { pd.TaxRegime = v }
		if v, ok := pdRaw["form16_ref"].(string); ok { pd.Form16Ref = v }
		if v, ok := pdRaw["nps_account_number"].(string); ok { pd.NPSAccountNumber = v }
		if v, ok := pdRaw["nps_tier"].(string); ok { pd.NPSTier = v }
		if v, ok := pdRaw["gratuity_eligible"].(bool); ok { pd.GratuityEligible = v }
		if isNew {
			database.DB.Create(&pd)
		} else {
			database.DB.Save(&pd)
		}
	}
```

Also update the final two lines of `UpdateEmployee` to include `PaymentDetails` in the preload:

```go
	database.DB.Save(&emp)
	database.DB.Preload("User").Preload("Department").Preload("PaymentDetails").First(&emp, "id = ?", emp.ID)
	return utils.OK(c, emp, "Employee updated")
```

- [ ] **Step 7: Add `gorm.io/gorm` to the import block**

The `Transaction` call requires `*gorm.DB`. Update the import block in `handlers/employees.go`:

```go
import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)
```

- [ ] **Step 8: Build the full backend**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go build ./...
```

Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add handlers/employees.go
git commit -m "feat: update employee handlers to accept and upsert payment_details"
```

---

### Task 4: Update TypeScript types

**Files:**
- Modify: `frontend/types/index.ts`

- [ ] **Step 1: Add `EmployeePaymentDetails` interface**

In `frontend/types/index.ts`, directly before the `// ── Employee` comment (line 112), add:

```ts
// ── Employee Payment Details ───────────────────────────────────
export interface EmployeePaymentDetails {
  id?: string;
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
}
```

- [ ] **Step 2: Add `payment_details` to the `Employee` interface**

In the `Employee` interface, add after `grade_level?`:

```ts
  payment_details?: EmployeePaymentDetails;
```

- [ ] **Step 3: Run type check**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add frontend/types/index.ts
git commit -m "feat: add EmployeePaymentDetails TypeScript interface"
```

---

### Task 5: Replace employees page with tabbed modal

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/employees/page.tsx`

- [ ] **Step 1: Replace the entire file with the tabbed version**

Replace `frontend/app/[tenant]/(dashboard)/employees/page.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEmployees, fetchDepartments, createEmployee, deleteEmployee } from "@/store/slices/employeeSlice";
import { fetchUsers } from "@/store/slices/userSlice";
import Header from "@/components/layout/Header";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import toast from "react-hot-toast";
import { Plus, Trash2, Building2 } from "lucide-react";

type Tab = "personal" | "bank" | "pf_esi" | "tax_nps";

const TABS: { id: Tab; label: string }[] = [
  { id: "personal", label: "Personal" },
  { id: "bank", label: "Bank Account" },
  { id: "pf_esi", label: "PF & ESI" },
  { id: "tax_nps", label: "Tax & NPS" },
];

const emptyForm = {
  user_id: "", department_id: "", designation: "", phone: "", join_date: "",
  employee_id: "", date_of_birth: "", gender: "", blood_group: "",
  employment_type: "", emergency_name: "", emergency_phone: "",
  bank_name: "", account_number: "", account_type: "", ifsc_code: "", branch_name: "",
  pf_number: "", uan_number: "", pf_employee_percent: 12, pf_employer_percent: 12,
  esi_number: "", esi_dispensary: "",
  pan_number: "", tax_regime: "", form16_ref: "",
  nps_account_number: "", nps_tier: "", gratuity_eligible: false,
};

export default function EmployeesPage() {
  const dispatch = useAppDispatch();
  const { employees, departments, loading } = useAppSelector((s) => s.employees);
  const { users } = useAppSelector((s) => s.users);

  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("personal");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchDepartments());
    dispatch(fetchUsers());
  }, [dispatch]);

  const set = (field: keyof typeof emptyForm, value: string | number | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const closeModal = () => {
    setShowModal(false);
    setActiveTab("personal");
    setForm(emptyForm);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasPayment =
      form.bank_name || form.account_number || form.pf_number || form.uan_number ||
      form.esi_number || form.pan_number || form.nps_account_number;

    const payload = {
      user_id: form.user_id,
      department_id: form.department_id,
      designation: form.designation,
      phone: form.phone,
      join_date: form.join_date,
      employee_id: form.employee_id,
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      blood_group: form.blood_group,
      employment_type: form.employment_type,
      emergency_name: form.emergency_name,
      emergency_phone: form.emergency_phone,
      ...(hasPayment ? {
        payment_details: {
          bank_name: form.bank_name,
          account_number: form.account_number,
          account_type: form.account_type,
          ifsc_code: form.ifsc_code,
          branch_name: form.branch_name,
          pf_number: form.pf_number,
          uan_number: form.uan_number,
          pf_employee_percent: form.pf_employee_percent,
          pf_employer_percent: form.pf_employer_percent,
          esi_number: form.esi_number,
          esi_dispensary: form.esi_dispensary,
          pan_number: form.pan_number,
          tax_regime: form.tax_regime,
          form16_ref: form.form16_ref,
          nps_account_number: form.nps_account_number,
          nps_tier: form.nps_tier,
          gratuity_eligible: form.gratuity_eligible,
        },
      } : {}),
    };

    const result = await dispatch(createEmployee(payload));
    if (createEmployee.fulfilled.match(result)) {
      toast.success("Employee added");
      closeModal();
    } else {
      toast.error(result.payload as string);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmState({
      title: "Remove Employee",
      message: `Remove ${name} from the employee list? Their user account will not be deleted.`,
      variant: "danger",
      confirmLabel: "Remove",
      onConfirm: async () => {
        await dispatch(deleteEmployee(id));
        toast.success("Employee removed");
      },
    });
  };

  const availableUsers = users.filter(
    (u) => !employees.find((e) => e.user_id === u.id) && u.role !== "student"
  );

  return (
    <div>
      <Header
        title="Employees"
        subtitle="Manage staff and teachers"
        action={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Employee
          </button>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Email</th>
                <th className="table-th">Department</th>
                <th className="table-th">Designation</th>
                <th className="table-th">Phone</th>
                <th className="table-th">Join Date</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-muted/40 transition-colors">
                  <td className="table-td font-medium">{emp.user?.name ?? "—"}</td>
                  <td className="table-td text-muted-foreground">{emp.user?.email ?? "—"}</td>
                  <td className="table-td">
                    <span className="flex items-center gap-1.5">
                      <Building2 size={14} className="text-muted-foreground/70" />
                      {emp.department?.name ?? "—"}
                    </span>
                  </td>
                  <td className="table-td">{emp.designation || "—"}</td>
                  <td className="table-td">{emp.phone || "—"}</td>
                  <td className="table-td">{emp.join_date?.slice(0, 10) ?? "—"}</td>
                  <td className="table-td">
                    <button
                      onClick={() => handleDelete(emp.id, emp.user?.name ?? "this employee")}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={7} className="table-td text-center text-muted-foreground/70 py-8">
                    No employees found. Add one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />

      <Modal title="Add Employee" isOpen={showModal} onClose={closeModal}>
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Tab bar */}
          <div className="flex border-b border-border/60 -mx-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Personal tab */}
          {activeTab === "personal" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">User Account</label>
                <select className="input-field" value={form.user_id} onChange={(e) => set("user_id", e.target.value)} required>
                  <option value="">Select a user...</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Department</label>
                <select className="input-field" value={form.department_id} onChange={(e) => set("department_id", e.target.value)}>
                  <option value="">Select department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Designation</label>
                <input className="input-field" placeholder="e.g. Senior Lecturer" value={form.designation} onChange={(e) => set("designation", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Phone</label>
                <input className="input-field" placeholder="+91 9876543210" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Join Date</label>
                <input type="date" className="input-field" value={form.join_date} onChange={(e) => set("join_date", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Employee ID</label>
                  <input className="input-field" placeholder="e.g. EMP001" value={form.employee_id} onChange={(e) => set("employee_id", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Date of Birth</label>
                  <input type="date" className="input-field" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Gender</label>
                  <select className="input-field" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Blood Group</label>
                  <input className="input-field" placeholder="e.g. O+" value={form.blood_group} onChange={(e) => set("blood_group", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Employment Type</label>
                  <select className="input-field" value={form.employment_type} onChange={(e) => set("employment_type", e.target.value)}>
                    <option value="">Select...</option>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Emergency Contact Name</label>
                  <input className="input-field" placeholder="e.g. John Doe" value={form.emergency_name} onChange={(e) => set("emergency_name", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Emergency Contact Phone</label>
                <input className="input-field" placeholder="+91 9876543210" value={form.emergency_phone} onChange={(e) => set("emergency_phone", e.target.value)} />
              </div>
            </div>
          )}

          {/* Bank Account tab */}
          {activeTab === "bank" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Bank Name</label>
                <input className="input-field" placeholder="e.g. State Bank of India" value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Account Number</label>
                <input className="input-field" placeholder="e.g. 1234567890" value={form.account_number} onChange={(e) => set("account_number", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Account Type</label>
                  <select className="input-field" value={form.account_type} onChange={(e) => set("account_type", e.target.value)}>
                    <option value="">Select...</option>
                    <option value="savings">Savings</option>
                    <option value="current">Current</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">IFSC Code</label>
                  <input className="input-field" placeholder="e.g. SBIN0001234" value={form.ifsc_code} onChange={(e) => set("ifsc_code", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Branch Name</label>
                <input className="input-field" placeholder="e.g. MG Road Branch" value={form.branch_name} onChange={(e) => set("branch_name", e.target.value)} />
              </div>
            </div>
          )}

          {/* PF & ESI tab */}
          {activeTab === "pf_esi" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">PF Number</label>
                  <input className="input-field" placeholder="e.g. MH/BAN/12345/000/0000001" value={form.pf_number} onChange={(e) => set("pf_number", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">UAN Number</label>
                  <input className="input-field" placeholder="e.g. 100123456789" value={form.uan_number} onChange={(e) => set("uan_number", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">PF Employee %</label>
                  <input type="number" className="input-field" min={0} max={100} step={0.01} value={form.pf_employee_percent} onChange={(e) => set("pf_employee_percent", parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">PF Employer %</label>
                  <input type="number" className="input-field" min={0} max={100} step={0.01} value={form.pf_employer_percent} onChange={(e) => set("pf_employer_percent", parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">ESI Number</label>
                  <input className="input-field" placeholder="e.g. 12-34-567890-000-0001" value={form.esi_number} onChange={(e) => set("esi_number", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">ESI Dispensary</label>
                  <input className="input-field" placeholder="e.g. ESI Dispensary, MG Road" value={form.esi_dispensary} onChange={(e) => set("esi_dispensary", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Tax & NPS tab */}
          {activeTab === "tax_nps" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">PAN Number</label>
                  <input className="input-field" placeholder="e.g. ABCDE1234F" value={form.pan_number} onChange={(e) => set("pan_number", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Tax Regime</label>
                  <select className="input-field" value={form.tax_regime} onChange={(e) => set("tax_regime", e.target.value)}>
                    <option value="">Select...</option>
                    <option value="old">Old Regime</option>
                    <option value="new">New Regime</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Form 16 Reference</label>
                <input className="input-field" placeholder="e.g. F16/2024-25/001" value={form.form16_ref} onChange={(e) => set("form16_ref", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">NPS Account Number</label>
                  <input className="input-field" placeholder="e.g. 110012345678" value={form.nps_account_number} onChange={(e) => set("nps_account_number", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">NPS Tier</label>
                  <select className="input-field" value={form.nps_tier} onChange={(e) => set("nps_tier", e.target.value)}>
                    <option value="">Select...</option>
                    <option value="tier1">Tier I</option>
                    <option value="tier2">Tier II</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="gratuity_eligible"
                  checked={form.gratuity_eligible}
                  onChange={(e) => set("gratuity_eligible", e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="gratuity_eligible" className="text-sm font-medium text-foreground/80">
                  Gratuity Eligible
                </label>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">Add Employee</button>
            <button type="button" className="btn-secondary flex-1" onClick={closeModal}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript type check**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run frontend build**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend && pnpm build
```

Expected: build completes with no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/employees/page.tsx"
git commit -m "feat: replace employee creation form with 4-tab modal including payment details"
```

---

### Task 6: Run migration and smoke-test

- [ ] **Step 1: Start the backend with migration flag to create the new table**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && MIGRATE=true go run main.go
```

Expected output includes:
```
CREATE TABLE "employee_payment_details" ...
```
or on subsequent runs: `AutoMigrate completed` without errors.

- [ ] **Step 2: Smoke-test create employee with payment details**

Replace `<tenant-slug>` and `<token>` with actual values from your running instance.

```bash
curl -s -X POST http://localhost:3001/api/<tenant-slug>/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "user_id": "<a-valid-user-id>",
    "designation": "Test Engineer",
    "payment_details": {
      "bank_name": "Test Bank",
      "account_number": "9999999999",
      "account_type": "savings",
      "ifsc_code": "TEST0001234",
      "pan_number": "ABCDE1234F",
      "pf_employee_percent": 12,
      "pf_employer_percent": 12
    }
  }' | jq '.data.payment_details'
```

Expected: JSON object with `bank_name`, `account_number`, `pan_number` fields visible.

- [ ] **Step 3: Verify list endpoint returns payment_details inline**

```bash
curl -s http://localhost:3001/api/<tenant-slug>/employees \
  -H "Authorization: Bearer <token>" | jq '.[0].payment_details'
```

Expected: payment_details object (or `null` for employees created before this feature).
