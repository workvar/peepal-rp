# Batch 2: Payroll + Salary Structures GraphQL Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose SalaryStructure and Payroll through GraphQL; migrate `salary-structures/page.tsx` and `payroll/page.tsx` from Redux/REST to Apollo.

**Architecture:** Add schema types to `schema.graphqls`, run gqlgen, implement `graph/payroll.resolvers.go`. Frontend query/mutation documents go in `graphql/queries/payroll.ts` and `graphql/mutations/payroll.ts`. Both pages replace Redux dispatch with Apollo hooks. Auth state (`s.auth.user`) stays Redux — auth is Batch 9.

**Tech Stack:** gqlgen (Go), Apollo Client (React), GORM (PostgreSQL)

---

## Constraint: Do Not Delete Slices or REST Routes

`payrollSlice` is consumed only by `payroll/page.tsx` and `salary-structures/page.tsx` (after this batch both are migrated, but the slice itself is NOT deleted until all tests pass and the team verifies). `employeeSlice` is kept — still consumed by attendance, timetable, etc.

---

## File Map

| File | Action |
|------|--------|
| `backend/graph/schema.graphqls` | Modify — add SalaryStructure, Payroll types |
| `backend/graph/schema.resolvers.go` | Modify — remove new stubs after adding payroll file |
| `backend/graph/payroll.resolvers.go` | Create — all resolver implementations |
| `frontend/graphql/queries/payroll.ts` | Create |
| `frontend/graphql/mutations/payroll.ts` | Create |
| `frontend/app/[tenant]/(dashboard)/salary-structures/page.tsx` | Modify |
| `frontend/app/[tenant]/(dashboard)/payroll/page.tsx` | Modify |

---

### Task 1: Add Payroll + SalaryStructure Schema Types

**Files:**
- Modify: `backend/graph/schema.graphqls`

- [ ] **Step 1: Append to schema.graphqls (add AFTER existing content, before end of file)**

Add to `Query` type:
```graphql
  salaryStructures(employeeId: ID): [SalaryStructure!]!
  payrolls(month: Int, year: Int, employeeId: ID, status: String): [Payroll!]!
  myPayrolls: [Payroll!]!
  payrollSummary(month: Int, year: Int): PayrollSummary!
```

Add to `Mutation` type:
```graphql
  createSalaryStructure(input: CreateSalaryStructureInput!): SalaryStructure!
  updateSalaryStructure(id: ID!, input: UpdateSalaryStructureInput!): SalaryStructure!
  deleteSalaryStructure(id: ID!): Boolean!
  generatePayroll(input: GeneratePayrollInput!): Payroll!
  updatePayrollStatus(id: ID!, input: UpdatePayrollStatusInput!): Payroll!
  deletePayroll(id: ID!): Boolean!
```

Add new types and inputs after existing types:
```graphql
type SalaryStructure {
  id: ID!
  employeeId: String!
  basicSalary: Float!
  hra: Float!
  da: Float!
  ta: Float!
  medicalAllowance: Float!
  otherAllowances: Float!
  pf: Float!
  esi: Float!
  tds: Float!
  otherDeductions: Float!
  effectiveFrom: String!
  isActive: Boolean!
  notes: String
  employee: Employee
}

type Payroll {
  id: ID!
  employeeId: String!
  month: Int!
  year: Int!
  basicSalary: Float!
  hra: Float!
  da: Float!
  ta: Float!
  medicalAllowance: Float!
  otherAllowances: Float!
  grossSalary: Float!
  pf: Float!
  esi: Float!
  tds: Float!
  otherDeductions: Float!
  totalDeductions: Float!
  netSalary: Float!
  workingDays: Int!
  presentDays: Int!
  leaveDays: Int!
  status: String!
  paymentDate: String
  paymentMode: String
  notes: String
  processedBy: String
  employee: Employee
}

type PayrollSummary {
  totalEmployees: Int!
  totalGross: Float!
  totalDeductions: Float!
  totalNet: Float!
  draftCount: Int!
  approvedCount: Int!
  paidCount: Int!
}

input CreateSalaryStructureInput {
  employeeId: ID!
  basicSalary: Float!
  hra: Float
  da: Float
  ta: Float
  medicalAllowance: Float
  otherAllowances: Float
  pf: Float
  esi: Float
  tds: Float
  otherDeductions: Float
  effectiveFrom: String!
  notes: String
}

input UpdateSalaryStructureInput {
  basicSalary: Float
  hra: Float
  da: Float
  ta: Float
  medicalAllowance: Float
  otherAllowances: Float
  pf: Float
  esi: Float
  tds: Float
  otherDeductions: Float
  notes: String
}

input GeneratePayrollInput {
  employeeId: ID!
  month: Int!
  year: Int!
  workingDays: Int!
  presentDays: Int!
  leaveDays: Int!
  notes: String
}

input UpdatePayrollStatusInput {
  status: String!
  paymentDate: String
  paymentMode: String
}
```

- [ ] **Step 2: Commit**

```bash
cd backend
git add graph/schema.graphqls
git commit -m "feat(graphql): add SalaryStructure and Payroll schema types (Batch 2)"
```

---

### Task 2: Run gqlgen Generate

- [ ] **Step 1: Run generation**

```bash
cd backend
go run github.com/99designs/gqlgen generate
```

Expected: No errors. New stubs added to `schema.resolvers.go` for 10 new resolver methods.

- [ ] **Step 2: Verify stubs**

```bash
grep -c "panic" backend/graph/schema.resolvers.go
```

Expected: the count increases to include the new stubs.

- [ ] **Step 3: Commit**

```bash
cd backend
git add graph/generated.go graph/model/models_gen.go graph/schema.resolvers.go
git commit -m "chore(graphql): regenerate gqlgen artifacts for Batch 2 schema"
```

---

### Task 3: Implement payroll.resolvers.go

**Files:**
- Create: `backend/graph/payroll.resolvers.go`

- [ ] **Step 1: Create the file**

```go
package graph

import (
	"context"
	"errors"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// ── Salary Structure Queries ──────────────────────────────────

func (r *queryResolver) SalaryStructures(ctx context.Context, employeeID *string) ([]*model.SalaryStructure, error) {
	auth := AuthFromCtx(ctx)
	q := r.DB.Where("tenant_id = ?", auth.TenantID).
		Preload("EmployeeModel").
		Preload("EmployeeModel.User").
		Preload("EmployeeModel.Department").
		Order("effective_from desc")
	if employeeID != nil {
		q = q.Where("employee_id = ?", *employeeID)
	}
	var list []models.SalaryStructure
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	out := make([]*model.SalaryStructure, len(list))
	for i, s := range list {
		out[i] = salaryStructureToModel(s)
	}
	return out, nil
}

// ── Payroll Queries ──────────────────────────────────────────

func (r *queryResolver) Payrolls(ctx context.Context, month *int, year *int, employeeID *string, status *string) ([]*model.Payroll, error) {
	auth := AuthFromCtx(ctx)
	q := r.DB.Where("tenant_id = ?", auth.TenantID).
		Preload("EmployeeModel").
		Preload("EmployeeModel.User").
		Preload("EmployeeModel.Department").
		Order("year desc, month desc")
	if month != nil {
		q = q.Where("month = ?", *month)
	}
	if year != nil {
		q = q.Where("year = ?", *year)
	}
	if employeeID != nil {
		q = q.Where("employee_id = ?", *employeeID)
	}
	if status != nil {
		q = q.Where("status = ?", *status)
	}
	var list []models.Payroll
	if err := q.Find(&list).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Payroll, len(list))
	for i, p := range list {
		out[i] = payrollToModel(p)
	}
	return out, nil
}

func (r *queryResolver) MyPayrolls(ctx context.Context) ([]*model.Payroll, error) {
	auth := AuthFromCtx(ctx)
	var employee models.Employee
	if err := r.DB.Where("tenant_id = ? AND user_id = ?", auth.TenantID, auth.UserID).
		First(&employee).Error; err != nil {
		return nil, ErrNotFound
	}
	var list []models.Payroll
	r.DB.Where("tenant_id = ? AND employee_id = ?", auth.TenantID, employee.ID).
		Preload("EmployeeModel").Preload("EmployeeModel.User").Preload("EmployeeModel.Department").
		Order("year desc, month desc").Find(&list)
	out := make([]*model.Payroll, len(list))
	for i, p := range list {
		out[i] = payrollToModel(p)
	}
	return out, nil
}

func (r *queryResolver) PayrollSummary(ctx context.Context, month *int, year *int) (*model.PayrollSummary, error) {
	auth := AuthFromCtx(ctx)
	q := r.DB.Where("tenant_id = ?", auth.TenantID)
	if month != nil {
		q = q.Where("month = ?", *month)
	}
	if year != nil {
		q = q.Where("year = ?", *year)
	}
	var list []models.Payroll
	q.Find(&list)

	summary := &model.PayrollSummary{TotalEmployees: len(list)}
	for _, p := range list {
		summary.TotalGross += p.GrossSalary
		summary.TotalDeductions += p.TotalDeductions
		summary.TotalNet += p.NetSalary
		switch p.Status {
		case "draft":
			summary.DraftCount++
		case "approved":
			summary.ApprovedCount++
		case "paid":
			summary.PaidCount++
		}
	}
	return summary, nil
}

// ── Salary Structure Mutations ──────────────────────────────────

func (r *mutationResolver) CreateSalaryStructure(ctx context.Context, input model.CreateSalaryStructureInput) (*model.SalaryStructure, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
	}
	// Deactivate previous active structure for this employee
	r.DB.Model(&models.SalaryStructure{}).
		Where("tenant_id = ? AND employee_id = ? AND is_active = true", auth.TenantID, input.EmployeeID).
		Update("is_active", false)

	var effectiveFrom time.Time
	if t, err := time.Parse("2006-01-02", input.EffectiveFrom); err == nil {
		effectiveFrom = t
	}

	s := models.SalaryStructure{
		TenantID:         auth.TenantID,
		EmployeeID:       input.EmployeeID,
		BasicSalary:      input.BasicSalary,
		HRA:              floatVal(input.Hra),
		DA:               floatVal(input.Da),
		TA:               floatVal(input.Ta),
		MedicalAllowance: floatVal(input.MedicalAllowance),
		OtherAllowances:  floatVal(input.OtherAllowances),
		PF:               floatVal(input.Pf),
		ESI:              floatVal(input.Esi),
		TDS:              floatVal(input.Tds),
		OtherDeductions:  floatVal(input.OtherDeductions),
		EffectiveFrom:    effectiveFrom,
		Notes:            strVal(input.Notes),
		IsActive:         true,
	}
	if err := r.DB.Create(&s).Error; err != nil {
		return nil, err
	}
	r.DB.Preload("EmployeeModel").Preload("EmployeeModel.User").Preload("EmployeeModel.Department").
		First(&s, "id = ?", s.ID)
	return salaryStructureToModel(s), nil
}

func (r *mutationResolver) UpdateSalaryStructure(ctx context.Context, id string, input model.UpdateSalaryStructureInput) (*model.SalaryStructure, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
	}
	var s models.SalaryStructure
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&s).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if input.BasicSalary != nil && *input.BasicSalary > 0 {
		s.BasicSalary = *input.BasicSalary
	}
	if input.Hra != nil {
		s.HRA = *input.Hra
	}
	if input.Da != nil {
		s.DA = *input.Da
	}
	if input.Ta != nil {
		s.TA = *input.Ta
	}
	if input.MedicalAllowance != nil {
		s.MedicalAllowance = *input.MedicalAllowance
	}
	if input.OtherAllowances != nil {
		s.OtherAllowances = *input.OtherAllowances
	}
	if input.Pf != nil {
		s.PF = *input.Pf
	}
	if input.Esi != nil {
		s.ESI = *input.Esi
	}
	if input.Tds != nil {
		s.TDS = *input.Tds
	}
	if input.OtherDeductions != nil {
		s.OtherDeductions = *input.OtherDeductions
	}
	if input.Notes != nil {
		s.Notes = *input.Notes
	}
	r.DB.Save(&s)
	r.DB.Preload("EmployeeModel").Preload("EmployeeModel.User").Preload("EmployeeModel.Department").
		First(&s, "id = ?", s.ID)
	return salaryStructureToModel(s), nil
}

func (r *mutationResolver) DeleteSalaryStructure(ctx context.Context, id string) (bool, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return false, ErrForbidden
	}
	res := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.SalaryStructure{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// ── Payroll Mutations ──────────────────────────────────────────

func (r *mutationResolver) GeneratePayroll(ctx context.Context, input model.GeneratePayrollInput) (*model.Payroll, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
	}
	if input.Month < 1 || input.Month > 12 {
		return nil, ErrValidation
	}

	// Check duplicate
	var existing models.Payroll
	res := r.DB.Where("tenant_id = ? AND employee_id = ? AND month = ? AND year = ?",
		auth.TenantID, input.EmployeeID, input.Month, input.Year).Limit(1).Find(&existing)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected > 0 {
		return nil, ErrValidation
	}

	// Fetch active salary structure effective for this period
	payrollPeriodStart := time.Date(input.Year, time.Month(input.Month), 1, 0, 0, 0, 0, time.UTC)
	var structure models.SalaryStructure
	if err := r.DB.Where(
		"tenant_id = ? AND employee_id = ? AND is_active = ? AND effective_from <= ?",
		auth.TenantID, input.EmployeeID, true, payrollPeriodStart,
	).Order("effective_from desc").First(&structure).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	// Pro-rate
	ratio := 1.0
	if input.WorkingDays > 0 {
		ratio = float64(input.PresentDays+input.LeaveDays) / float64(input.WorkingDays)
		if ratio > 1.0 {
			ratio = 1.0
		}
		if ratio < 0 {
			ratio = 0
		}
	}

	basic := structure.BasicSalary * ratio
	hra := structure.HRA * ratio
	da := structure.DA * ratio
	ta := structure.TA * ratio
	medical := structure.MedicalAllowance * ratio
	other := structure.OtherAllowances * ratio
	gross := basic + hra + da + ta + medical + other
	totalDed := structure.PF + structure.ESI + structure.TDS + structure.OtherDeductions
	net := gross - totalDed
	if net < 0 {
		net = 0
	}

	p := models.Payroll{
		TenantID:         auth.TenantID,
		EmployeeID:       input.EmployeeID,
		Month:            input.Month,
		Year:             input.Year,
		BasicSalary:      basic,
		HRA:              hra,
		DA:               da,
		TA:               ta,
		MedicalAllowance: medical,
		OtherAllowances:  other,
		GrossSalary:      gross,
		PF:               structure.PF,
		ESI:              structure.ESI,
		TDS:              structure.TDS,
		OtherDeductions:  structure.OtherDeductions,
		TotalDeductions:  totalDed,
		NetSalary:        net,
		WorkingDays:      input.WorkingDays,
		PresentDays:      input.PresentDays,
		LeaveDays:        input.LeaveDays,
		Status:           "draft",
		ProcessedBy:      auth.UserID,
		Notes:            strVal(input.Notes),
	}
	if err := r.DB.Create(&p).Error; err != nil {
		return nil, err
	}
	r.DB.Preload("EmployeeModel").Preload("EmployeeModel.User").Preload("EmployeeModel.Department").
		First(&p, "id = ?", p.ID)
	return payrollToModel(p), nil
}

func (r *mutationResolver) UpdatePayrollStatus(ctx context.Context, id string, input model.UpdatePayrollStatusInput) (*model.Payroll, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
	}
	var p models.Payroll
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	validStatuses := map[string]bool{"draft": true, "approved": true, "paid": true}
	if !validStatuses[input.Status] {
		return nil, ErrValidation
	}
	p.Status = input.Status
	if input.PaymentDate != nil && *input.PaymentDate != "" {
		if t, err := time.Parse("2006-01-02", *input.PaymentDate); err == nil {
			p.PaymentDate = &t
		}
	}
	if input.PaymentMode != nil {
		p.PaymentMode = *input.PaymentMode
	}
	r.DB.Save(&p)
	r.DB.Preload("EmployeeModel").Preload("EmployeeModel.User").Preload("EmployeeModel.Department").
		First(&p, "id = ?", p.ID)
	return payrollToModel(p), nil
}

func (r *mutationResolver) DeletePayroll(ctx context.Context, id string) (bool, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return false, ErrForbidden
	}
	var p models.Payroll
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, ErrNotFound
		}
		return false, err
	}
	if p.Status == "paid" {
		return false, ErrValidation
	}
	r.DB.Delete(&p)
	return true, nil
}

// ── Model conversion helpers ──────────────────────────────────

func floatVal(f *float64) float64 {
	if f == nil {
		return 0
	}
	return *f
}

func intVal(i *int) int {
	if i == nil {
		return 0
	}
	return *i
}

func salaryStructureToModel(s models.SalaryStructure) *model.SalaryStructure {
	ss := &model.SalaryStructure{
		ID:               s.ID,
		EmployeeID:       s.EmployeeID,
		BasicSalary:      s.BasicSalary,
		Hra:              s.HRA,
		Da:               s.DA,
		Ta:               s.TA,
		MedicalAllowance: s.MedicalAllowance,
		OtherAllowances:  s.OtherAllowances,
		Pf:               s.PF,
		Esi:              s.ESI,
		Tds:              s.TDS,
		OtherDeductions:  s.OtherDeductions,
		EffectiveFrom:    s.EffectiveFrom.Format("2006-01-02"),
		IsActive:         s.IsActive,
		Notes:            toStrPtr(s.Notes),
	}
	if s.EmployeeModel.ID != "" {
		ss.Employee = employeeToModel(s.EmployeeModel)
	}
	return ss
}

func payrollToModel(p models.Payroll) *model.Payroll {
	pm := &model.Payroll{
		ID:               p.ID,
		EmployeeID:       p.EmployeeID,
		Month:            p.Month,
		Year:             p.Year,
		BasicSalary:      p.BasicSalary,
		Hra:              p.HRA,
		Da:               p.DA,
		Ta:               p.TA,
		MedicalAllowance: p.MedicalAllowance,
		OtherAllowances:  p.OtherAllowances,
		GrossSalary:      p.GrossSalary,
		Pf:               p.PF,
		Esi:              p.ESI,
		Tds:              p.TDS,
		OtherDeductions:  p.OtherDeductions,
		TotalDeductions:  p.TotalDeductions,
		NetSalary:        p.NetSalary,
		WorkingDays:      p.WorkingDays,
		PresentDays:      p.PresentDays,
		LeaveDays:        p.LeaveDays,
		Status:           p.Status,
		PaymentMode:      toStrPtr(p.PaymentMode),
		Notes:            toStrPtr(p.Notes),
		ProcessedBy:      toStrPtr(p.ProcessedBy),
	}
	if p.PaymentDate != nil {
		s := p.PaymentDate.Format("2006-01-02")
		pm.PaymentDate = &s
	}
	if p.EmployeeModel.ID != "" {
		pm.Employee = employeeToModel(p.EmployeeModel)
	}
	return pm
}
```

> **Note on generated field names:** gqlgen converts `hra`, `da`, `ta`, `pf`, `esi`, `tds` to `Hra`, `Da`, `Ta`, `Pf`, `Esi`, `Tds` in Go (lowercase abbreviations are not expanded). Verify against the generated `models_gen.go` after running gqlgen and fix field names if different.

- [ ] **Step 2: Commit**

```bash
cd backend
git add graph/payroll.resolvers.go
git commit -m "feat(graphql): implement SalaryStructure and Payroll resolvers (Batch 2)"
```

---

### Task 4: Remove Stubs + Build

- [ ] **Step 1: Remove from schema.resolvers.go the stubs for**

```
func (r *queryResolver) SalaryStructures(...)
func (r *queryResolver) Payrolls(...)
func (r *queryResolver) MyPayrolls(...)
func (r *queryResolver) PayrollSummary(...)
func (r *mutationResolver) CreateSalaryStructure(...)
func (r *mutationResolver) UpdateSalaryStructure(...)
func (r *mutationResolver) DeleteSalaryStructure(...)
func (r *mutationResolver) GeneratePayroll(...)
func (r *mutationResolver) UpdatePayrollStatus(...)
func (r *mutationResolver) DeletePayroll(...)
```

- [ ] **Step 2: Build**

```bash
cd backend
go build ./...
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd backend
git add graph/schema.resolvers.go
git commit -m "chore(graphql): remove Batch 2 resolver stubs from schema.resolvers.go"
```

---

### Task 5: Frontend Query + Mutation Documents

**Files:**
- Create: `frontend/graphql/queries/payroll.ts`
- Create: `frontend/graphql/mutations/payroll.ts`

- [ ] **Step 1: Create queries file**

```ts
// frontend/graphql/queries/payroll.ts
import { gql } from "@apollo/client";

const PAYROLL_FIELDS = `
  id employeeId month year
  basicSalary hra da ta medicalAllowance otherAllowances
  grossSalary pf esi tds otherDeductions totalDeductions netSalary
  workingDays presentDays leaveDays
  status paymentDate paymentMode notes processedBy
  employee { id employeeId user { id name email } department { id name } }
`;

export const LIST_SALARY_STRUCTURES = gql`
  query ListSalaryStructures($employeeId: ID) {
    salaryStructures(employeeId: $employeeId) {
      id employeeId basicSalary hra da ta medicalAllowance otherAllowances
      pf esi tds otherDeductions effectiveFrom isActive notes
      employee { id employeeId user { id name email } department { id name } }
    }
  }
`;

export const LIST_PAYROLLS = gql`
  query ListPayrolls($month: Int, $year: Int, $employeeId: ID, $status: String) {
    payrolls(month: $month, year: $year, employeeId: $employeeId, status: $status) {
      ${PAYROLL_FIELDS}
    }
  }
`;

export const MY_PAYROLLS = gql`
  query MyPayrolls {
    myPayrolls {
      ${PAYROLL_FIELDS}
    }
  }
`;

export const PAYROLL_SUMMARY = gql`
  query PayrollSummary($month: Int, $year: Int) {
    payrollSummary(month: $month, year: $year) {
      totalEmployees totalGross totalDeductions totalNet
      draftCount approvedCount paidCount
    }
  }
`;
```

- [ ] **Step 2: Create mutations file**

```ts
// frontend/graphql/mutations/payroll.ts
import { gql } from "@apollo/client";

export const CREATE_SALARY_STRUCTURE = gql`
  mutation CreateSalaryStructure($input: CreateSalaryStructureInput!) {
    createSalaryStructure(input: $input) {
      id employeeId basicSalary hra da ta medicalAllowance otherAllowances
      pf esi tds otherDeductions effectiveFrom isActive notes
      employee { id employeeId user { id name } }
    }
  }
`;

export const UPDATE_SALARY_STRUCTURE = gql`
  mutation UpdateSalaryStructure($id: ID!, $input: UpdateSalaryStructureInput!) {
    updateSalaryStructure(id: $id, input: $input) {
      id employeeId basicSalary hra da ta medicalAllowance otherAllowances
      pf esi tds otherDeductions effectiveFrom isActive notes
    }
  }
`;

export const DELETE_SALARY_STRUCTURE = gql`
  mutation DeleteSalaryStructure($id: ID!) {
    deleteSalaryStructure(id: $id)
  }
`;

export const GENERATE_PAYROLL = gql`
  mutation GeneratePayroll($input: GeneratePayrollInput!) {
    generatePayroll(input: $input) {
      id employeeId month year grossSalary netSalary status
      employee { id employeeId user { id name } }
    }
  }
`;

export const UPDATE_PAYROLL_STATUS = gql`
  mutation UpdatePayrollStatus($id: ID!, $input: UpdatePayrollStatusInput!) {
    updatePayrollStatus(id: $id, input: $input) {
      id status paymentDate paymentMode
    }
  }
`;

export const DELETE_PAYROLL = gql`
  mutation DeletePayroll($id: ID!) {
    deletePayroll(id: $id)
  }
`;
```

- [ ] **Step 3: Commit**

```bash
cd frontend
git add graphql/queries/payroll.ts graphql/mutations/payroll.ts
git commit -m "feat(graphql): add Payroll/SalaryStructure query and mutation documents (Batch 2)"
```

---

### Task 6: Migrate salary-structures/page.tsx

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/salary-structures/page.tsx`

**Key changes:**
- Remove Redux: `useAppDispatch`, `useAppSelector(s => s.payroll)`, `useAppSelector(s => s.employees)`, `useEffect` dispatches
- Replace with: `useQuery(LIST_SALARY_STRUCTURES)`, `useQuery(LIST_EMPLOYEES)` (from Batch 1), `useMutation(CREATE_SALARY_STRUCTURE)`, `useMutation(DELETE_SALARY_STRUCTURE)`
- Keep `useAppSelector(s => s.auth)` only if auth role check needed (if not needed, remove it)
- Field names: `s.employee?.user?.name` (nested via GraphQL)

- [ ] **Step 1: Read the full current file, then replace imports and data layer**

The replacement should:

1. Remove these imports:
```ts
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchSalaryStructures, createSalaryStructure, deleteSalaryStructure } from '@/store/slices/payrollSlice'
import { fetchEmployees } from '@/store/slices/employeeSlice'
```

2. Add:
```ts
import { useQuery, useMutation } from "@apollo/client";
import { LIST_SALARY_STRUCTURES } from "@/graphql/queries/payroll";
import { CREATE_SALARY_STRUCTURE, DELETE_SALARY_STRUCTURE } from "@/graphql/mutations/payroll";
import { LIST_EMPLOYEES } from "@/graphql/queries/employees";
```

3. Replace data layer (remove useAppDispatch, useAppSelector, useEffect, dispatch calls):
```ts
const { data: ssData, loading } = useQuery(LIST_SALARY_STRUCTURES, {
  variables: filterEmployee ? { employeeId: filterEmployee } : {},
});
const { data: empData } = useQuery(LIST_EMPLOYEES);
const salaryStructures = ssData?.salaryStructures ?? [];
const employees = empData?.employees ?? [];

const [createSalaryStructureMut] = useMutation(CREATE_SALARY_STRUCTURE, {
  refetchQueries: [{ query: LIST_SALARY_STRUCTURES, variables: filterEmployee ? { employeeId: filterEmployee } : {} }],
});
const [deleteSalaryStructureMut] = useMutation(DELETE_SALARY_STRUCTURE, {
  refetchQueries: [{ query: LIST_SALARY_STRUCTURES }],
});
```

4. Update `handleFilterChange`:
```ts
function handleFilterChange(empId: string) {
  setFilterEmployee(empId);
  // Apollo re-fetches automatically when variables change via useQuery
}
```

Note: with Apollo, changing `filterEmployee` state causes the query to re-run with new variables since it's reactive. No manual dispatch needed.

5. Update `handleSubmit` (replace `dispatch(createSalaryStructure(...).unwrap()`):
```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setSubmitting(true);
  try {
    await createSalaryStructureMut({
      variables: {
        input: {
          employeeId: form.employee_id,
          basicSalary: form.basic_salary,
          hra: form.hra,
          da: form.da,
          ta: form.ta,
          medicalAllowance: form.medical_allowance,
          otherAllowances: form.other_allowances,
          pf: form.pf,
          esi: form.esi,
          tds: form.tds,
          otherDeductions: form.other_deductions,
          effectiveFrom: new Date(form.effective_from).toISOString().slice(0, 10),
          notes: form.notes || null,
        },
      },
    });
    setShowModal(false);
    setForm(emptyForm);
  } catch (err: any) {
    alert(err?.message || 'Failed to create salary structure');
  } finally {
    setSubmitting(false);
  }
}
```

6. Update `handleDelete`:
```ts
async function handleDelete(id: string) {
  setConfirmState({
    title: "Delete Salary Structure",
    message: "This salary structure will be permanently removed. This cannot be undone.",
    variant: "danger",
    confirmLabel: "Delete",
    onConfirm: async () => {
      await deleteSalaryStructureMut({ variables: { id } });
      toast.success("Salary structure deleted");
    },
  });
}
```

7. Update `getEmployeeName` to use GraphQL shape (employee is already preloaded in the query):
```ts
function getEmployeeName(s: any) {
  return s.employee?.user?.name || s.employeeId;
}
```

Keep all other JSX identical.

- [ ] **Step 2: TypeScript check**

```bash
cd frontend
pnpm tsc --noEmit 2>&1 | grep "salary-structures" | head -10
```

- [ ] **Step 3: Commit**

```bash
cd frontend
git add "app/[tenant]/(dashboard)/salary-structures/page.tsx"
git commit -m "feat(graphql): migrate salary-structures page from Redux to Apollo (Batch 2)"
```

---

### Task 7: Migrate payroll/page.tsx

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/payroll/page.tsx`

**Key changes:**
- Remove Redux payroll + employee dispatch/selectors
- Keep `useAppSelector(s => s.auth)` for `canManagePayroll` role check (auth stays REST)
- Replace fetching with Apollo queries with variables
- Re-fetch on month/year filter change via `useQuery` variables
- Field name changes: `p.employee_id` → `p.employeeId`, `p.employee?.user?.name` → same (already nested), `p.gross_salary` → `p.grossSalary`, `p.net_salary` → `p.netSalary`, `p.total_deductions` → `p.totalDeductions`, `p.payment_date` → `p.paymentDate`

- [ ] **Step 1: Replace imports and data layer**

1. Remove:
```ts
import { fetchPayrolls, fetchMyPayrolls, fetchPayrollSummary, fetchSalaryStructures,
  generatePayroll, updatePayrollStatus, deletePayroll } from '@/store/slices/payrollSlice'
import { fetchEmployees } from '@/store/slices/employeeSlice'
```

2. Add:
```ts
import { useQuery, useMutation, useApolloClient } from "@apollo/client";
import { LIST_PAYROLLS, MY_PAYROLLS, PAYROLL_SUMMARY, LIST_SALARY_STRUCTURES } from "@/graphql/queries/payroll";
import { GENERATE_PAYROLL, UPDATE_PAYROLL_STATUS, DELETE_PAYROLL } from "@/graphql/mutations/payroll";
import { LIST_EMPLOYEES } from "@/graphql/queries/employees";
```

3. Keep:
```ts
import { useAppSelector } from '@/store/hooks'
// ...
const { user } = useAppSelector(s => s.auth)
const canManagePayroll = user?.role === 'admin' || user?.role === 'super_admin'
```

4. Replace all `useAppSelector(s => s.payroll)` and `useAppSelector(s => s.employees)` with Apollo:

```ts
const { data: payrollData, loading: payrollLoading } = useQuery(LIST_PAYROLLS, {
  variables: { month: filterMonth, year: filterYear },
  skip: !canManagePayroll,
});
const { data: myPayrollData, loading: myPayrollLoading } = useQuery(MY_PAYROLLS, {
  skip: canManagePayroll,
});
const { data: summaryData } = useQuery(PAYROLL_SUMMARY, {
  variables: { month: filterMonth, year: filterYear },
  skip: !canManagePayroll,
});
const { data: ssData } = useQuery(LIST_SALARY_STRUCTURES, { skip: !canManagePayroll });
const { data: empData } = useQuery(LIST_EMPLOYEES, { skip: !canManagePayroll });

const payrolls = payrollData?.payrolls ?? [];
const myPayrolls = myPayrollData?.myPayrolls ?? [];
const salaryStructures = ssData?.salaryStructures ?? [];
const employees = empData?.employees ?? [];
const summary = summaryData?.payrollSummary ?? null;
const loading = canManagePayroll ? payrollLoading : myPayrollLoading;
const displayPayrolls = canManagePayroll ? payrolls : myPayrolls;
```

5. Replace mutations:
```ts
const [generatePayrollMut] = useMutation(GENERATE_PAYROLL, {
  refetchQueries: [
    { query: LIST_PAYROLLS, variables: { month: filterMonth, year: filterYear } },
    { query: PAYROLL_SUMMARY, variables: { month: filterMonth, year: filterYear } },
  ],
});
const [updatePayrollStatusMut] = useMutation(UPDATE_PAYROLL_STATUS, {
  refetchQueries: [{ query: LIST_PAYROLLS, variables: { month: filterMonth, year: filterYear } }],
});
const [deletePayrollMut] = useMutation(DELETE_PAYROLL, {
  refetchQueries: [
    { query: LIST_PAYROLLS, variables: { month: filterMonth, year: filterYear } },
    { query: PAYROLL_SUMMARY, variables: { month: filterMonth, year: filterYear } },
  ],
});
```

6. Remove `useEffect` entirely.

7. Update `handleGenerate` (replace `dispatch(generatePayroll(...)).unwrap()`):
```ts
const handleGenerate = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  try {
    await generatePayrollMut({
      variables: {
        input: {
          employeeId: genForm.employee_id,
          month: genForm.month,
          year: genForm.year,
          workingDays: genForm.working_days,
          presentDays: genForm.present_days,
          leaveDays: genForm.leave_days,
          notes: genForm.notes || null,
        },
      },
    });
    toast.success('Payroll generated');
    setShowGenModal(false);
  } catch (err: any) {
    toast.error(err?.message || 'Failed to generate payroll');
  } finally {
    setSubmitting(false);
  }
};
```

8. Update `handleStatusUpdate` (replace `dispatch(updatePayrollStatus(...))`):
```ts
const handleStatusUpdate = async (id: string, status: string) => {
  setStatusUpdatingId(id);
  try {
    await updatePayrollStatusMut({ variables: { id, input: { status } } });
  } catch {
    toast.error('Failed to update status');
  } finally {
    setStatusUpdatingId(null);
  }
};
```

9. Update `handleDelete` (replace `dispatch(deletePayroll(id))`):
```ts
const handleDelete = (id: string) => {
  setConfirmState({
    title: 'Delete Payroll',
    message: 'Delete this payroll record?',
    variant: 'danger',
    confirmLabel: 'Delete',
    onConfirm: async () => {
      await deletePayrollMut({ variables: { id } });
      toast.success('Payroll deleted');
    },
  });
};
```

10. Fix field references in JSX: `p.gross_salary` → `p.grossSalary`, `p.net_salary` → `p.netSalary`, `p.total_deductions` → `p.totalDeductions`, `p.payment_date` → `p.paymentDate`, `p.employee_id` → `p.employeeId`, `p.employee?.employee_id` → `p.employee?.employeeId`.

- [ ] **Step 2: TypeScript check**

```bash
cd frontend
pnpm tsc --noEmit 2>&1 | grep "payroll/page" | head -10
```

- [ ] **Step 3: Commit**

```bash
cd frontend
git add "app/[tenant]/(dashboard)/payroll/page.tsx"
git commit -m "feat(graphql): migrate payroll page from Redux to Apollo (Batch 2)"
```

---

### Task 8: End-to-End Verify

- [ ] **Step 1: Start backend and verify GraphQL schema**

```bash
cd backend
go build -o /tmp/collerp_b2 . && /tmp/collerp_b2 &
curl -s -X POST http://localhost:3001/api/v1/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: <tenant-id>" \
  -d '{"query":"{ salaryStructures { id basicSalary } }"}' | jq .
```

Expected: `{"data":{"salaryStructures":[...]}}` with no errors.

- [ ] **Step 2: Start frontend dev server**

```bash
cd frontend && pnpm dev
```

Check `salary-structures` page: table loads, filter by employee works, create modal saves and table refreshes.
Check `payroll` page: filter month/year works, generate payroll modal, status update dropdown, delete with confirm dialog.

- [ ] **Step 3: Stop servers, final commit**

```bash
pkill -f collerp_b2
```
