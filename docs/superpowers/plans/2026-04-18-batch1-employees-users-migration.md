# Batch 1: Employees + Departments + Users GraphQL Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose Employees, Departments, and Users through GraphQL resolvers; migrate `employees/page.tsx` and `users/page.tsx` from Redux/REST to Apollo.

**Architecture:** Add schema types and resolver implementations in `backend/graph/employees.resolvers.go`. Create query/mutation documents in `frontend/graphql/`. Swap Redux dispatch calls in the two pages for `useQuery`/`useMutation` hooks. Redux slices and REST routes are **NOT** deleted — 8 other pages still depend on them.

**Tech Stack:** gqlgen (Go), Apollo Client (React), GORM (PostgreSQL)

---

## Constraint: Do Not Delete Slices or REST Routes

`employeeSlice` is consumed by: `attendance`, `salary-structures`, `payroll`, `timetable`, `dashboard`, `employees` pages.  
`userSlice` is consumed by: `students`, `users` pages.  
REST routes `/employees`, `/departments`, `/users` remain until **all** consumers are migrated in later batches.

---

## File Map

| File | Action |
|------|--------|
| `backend/graph/schema.graphqls` | Modify — add types, inputs, queries, mutations |
| `backend/graph/schema.resolvers.go` | Modify — remove stubs after moving to employees file |
| `backend/graph/employees.resolvers.go` | Create — all resolver implementations |
| `frontend/graphql/queries/employees.ts` | Create — LIST_EMPLOYEES, LIST_DEPARTMENTS, LIST_USERS |
| `frontend/graphql/mutations/employees.ts` | Create — CREATE_EMPLOYEE, DELETE_EMPLOYEE, CREATE_USER, DEACTIVATE_USER |
| `frontend/app/[tenant]/(dashboard)/employees/page.tsx` | Modify — swap Redux → Apollo |
| `frontend/app/[tenant]/(dashboard)/users/page.tsx` | Modify — swap Redux → Apollo |

---

### Task 1: Add GraphQL Schema Types and Operations

**Files:**
- Modify: `backend/graph/schema.graphqls`

- [ ] **Step 1: Replace schema.graphqls with the full Batch 1 schema**

```graphql
type Query {
  health: Boolean!
  employees: [Employee!]!
  employee(id: ID!): Employee
  departments: [Department!]!
  users: [User!]!
}

type Mutation {
  _placeholder: Boolean
  createEmployee(input: CreateEmployeeInput!): Employee!
  deleteEmployee(id: ID!): Boolean!
  createDepartment(input: CreateDepartmentInput!): Department!
  createUser(input: CreateUserInput!): User!
  deactivateUser(id: ID!): Boolean!
}

type Department {
  id: ID!
  name: String!
}

type User {
  id: ID!
  email: String!
  name: String!
  role: String!
  isActive: Boolean!
}

type EmployeePaymentDetails {
  bankName: String
  accountNumber: String
  accountType: String
  ifscCode: String
  branchName: String
  pfNumber: String
  uanNumber: String
  pfEmployeePercent: Float
  pfEmployerPercent: Float
  esiNumber: String
  esiDispensary: String
  panNumber: String
  taxRegime: String
  form16Ref: String
  npsAccountNumber: String
  npsTier: String
  gratuityEligible: Boolean
}

type Employee {
  id: ID!
  employeeId: String!
  designation: String
  phone: String
  gender: String
  bloodGroup: String
  photoUrl: String
  address: String
  city: String
  state: String
  pincode: String
  nationality: String
  personalEmail: String
  emergencyName: String
  emergencyPhone: String
  employmentType: String
  probationEndDate: String
  gradeLevel: String
  joinDate: String
  dateOfBirth: String
  user: User!
  department: Department
  paymentDetails: EmployeePaymentDetails
}

input PaymentDetailsInput {
  bankName: String
  accountNumber: String
  accountType: String
  ifscCode: String
  branchName: String
  pfNumber: String
  uanNumber: String
  pfEmployeePercent: Float
  pfEmployerPercent: Float
  esiNumber: String
  esiDispensary: String
  panNumber: String
  taxRegime: String
  form16Ref: String
  npsAccountNumber: String
  npsTier: String
  gratuityEligible: Boolean
}

input CreateEmployeeInput {
  userId: ID!
  employeeId: String!
  departmentId: ID
  designation: String
  phone: String
  joinDate: String
  dateOfBirth: String
  gender: String
  bloodGroup: String
  photoUrl: String
  address: String
  city: String
  state: String
  pincode: String
  nationality: String
  personalEmail: String
  emergencyName: String
  emergencyPhone: String
  employmentType: String
  probationEndDate: String
  gradeLevel: String
  paymentDetails: PaymentDetailsInput
}

input CreateDepartmentInput {
  name: String!
}

input CreateUserInput {
  email: String!
  name: String!
  password: String!
  role: String!
}
```

- [ ] **Step 2: Commit schema**

```bash
cd backend
git add graph/schema.graphqls
git commit -m "feat(graphql): add Employee, Department, User schema types for Batch 1"
```

---

### Task 2: Run gqlgen Code Generation

**Files:**
- Auto-modified: `backend/graph/generated.go`, `backend/graph/model/models_gen.go`, `backend/graph/schema.resolvers.go`

- [ ] **Step 1: Run gqlgen generate**

```bash
cd backend
go run github.com/99designs/gqlgen generate
```

Expected: No errors. `schema.resolvers.go` now contains stubs for `Employees`, `Employee`, `Departments`, `Users`, `CreateEmployee`, `DeleteEmployee`, `CreateDepartment`, `CreateUser`, `DeactivateUser`.

- [ ] **Step 2: Verify generated stubs exist**

```bash
grep -n "func (r \*" backend/graph/schema.resolvers.go
```

Expected output includes lines for all 9 resolver methods (health + 4 queries + 5 mutations minus `_placeholder` which already exists).

- [ ] **Step 3: Commit generated files**

```bash
cd backend
git add graph/generated.go graph/model/models_gen.go graph/schema.resolvers.go
git commit -m "chore(graphql): regenerate gqlgen artifacts for Batch 1 schema"
```

---

### Task 3: Implement Resolver File

**Files:**
- Create: `backend/graph/employees.resolvers.go`

- [ ] **Step 1: Create employees.resolvers.go with all implementations**

```go
package graph

import (
	"context"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"
	"collegeerp/utils"

	"gorm.io/gorm"
)

// ── Queries ──────────────────────────────────────────────────

func (r *queryResolver) Employees(ctx context.Context) ([]*model.Employee, error) {
	auth := AuthFromCtx(ctx)
	var list []models.Employee
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).
		Preload("User").Preload("Department").Preload("PaymentDetails").
		Find(&list).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Employee, len(list))
	for i, e := range list {
		out[i] = employeeToModel(e)
	}
	return out, nil
}

func (r *queryResolver) Employee(ctx context.Context, id string) (*model.Employee, error) {
	auth := AuthFromCtx(ctx)
	var e models.Employee
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Preload("User").Preload("Department").Preload("PaymentDetails").
		First(&e).Error; err != nil {
		return nil, ErrNotFound
	}
	return employeeToModel(e), nil
}

func (r *queryResolver) Departments(ctx context.Context) ([]*model.Department, error) {
	auth := AuthFromCtx(ctx)
	var list []models.Department
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).Find(&list).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Department, len(list))
	for i, d := range list {
		out[i] = &model.Department{ID: d.ID, Name: d.Name}
	}
	return out, nil
}

func (r *queryResolver) Users(ctx context.Context) ([]*model.User, error) {
	auth := AuthFromCtx(ctx)
	var list []models.User
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).Find(&list).Error; err != nil {
		return nil, err
	}
	out := make([]*model.User, len(list))
	for i, u := range list {
		out[i] = userToModel(u)
	}
	return out, nil
}

// ── Mutations ──────────────────────────────────────────────────

func (r *mutationResolver) CreateEmployee(ctx context.Context, input model.CreateEmployeeInput) (*model.Employee, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
	}

	emp := models.Employee{
		TenantID:         auth.TenantID,
		UserID:           input.UserId,
		EmployeeID:       input.EmployeeId,
		Designation:      strVal(input.Designation),
		Phone:            strVal(input.Phone),
		DateOfBirth:      strVal(input.DateOfBirth),
		Gender:           strVal(input.Gender),
		BloodGroup:       strVal(input.BloodGroup),
		PhotoURL:         strVal(input.PhotoUrl),
		Address:          strVal(input.Address),
		City:             strVal(input.City),
		State:            strVal(input.State),
		Pincode:          strVal(input.Pincode),
		Nationality:      strVal(input.Nationality),
		PersonalEmail:    strVal(input.PersonalEmail),
		EmergencyName:    strVal(input.EmergencyName),
		EmergencyPhone:   strVal(input.EmergencyPhone),
		EmploymentType:   strVal(input.EmploymentType),
		ProbationEndDate: strVal(input.ProbationEndDate),
		GradeLevel:       strVal(input.GradeLevel),
	}
	if input.DepartmentId != nil {
		emp.DepartmentID = *input.DepartmentId
	}
	if input.JoinDate != nil && *input.JoinDate != "" {
		if t, err := time.Parse("2006-01-02", *input.JoinDate); err == nil {
			emp.JoinDate = t
		}
	}

	err := r.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&emp).Error; err != nil {
			return err
		}
		if input.PaymentDetails != nil {
			pd := inputToPaymentDetails(input.PaymentDetails, emp.ID, auth.TenantID)
			return tx.Create(&pd).Error
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	if err := r.DB.Where("id = ?", emp.ID).
		Preload("User").Preload("Department").Preload("PaymentDetails").
		First(&emp).Error; err != nil {
		return nil, err
	}
	return employeeToModel(emp), nil
}

func (r *mutationResolver) DeleteEmployee(ctx context.Context, id string) (bool, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return false, ErrForbidden
	}
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Delete(&models.Employee{}).Error; err != nil {
		return false, err
	}
	return true, nil
}

func (r *mutationResolver) CreateDepartment(ctx context.Context, input model.CreateDepartmentInput) (*model.Department, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
	}
	dept := models.Department{TenantID: auth.TenantID, Name: input.Name}
	if err := r.DB.Create(&dept).Error; err != nil {
		return nil, err
	}
	return &model.Department{ID: dept.ID, Name: dept.Name}, nil
}

func (r *mutationResolver) CreateUser(ctx context.Context, input model.CreateUserInput) (*model.User, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
	}
	hash, err := utils.HashPassword(input.Password)
	if err != nil {
		return nil, err
	}
	user := models.User{
		TenantID: auth.TenantID,
		Name:     input.Name,
		Email:    input.Email,
		Password: hash,
		Role:     models.Role(input.Role),
		IsActive: true,
	}
	if err := r.DB.Create(&user).Error; err != nil {
		return nil, err
	}
	return userToModel(user), nil
}

func (r *mutationResolver) DeactivateUser(ctx context.Context, id string) (bool, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return false, ErrForbidden
	}
	if err := r.DB.Model(&models.User{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Update("is_active", false).Error; err != nil {
		return false, err
	}
	return true, nil
}

// ── Model conversion helpers ──────────────────────────────────

func strVal(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func toStrPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func toFloat64Ptr(f float64) *float64 { return &f }
func toBoolPtr(b bool) *bool          { return &b }

func userToModel(u models.User) *model.User {
	return &model.User{
		ID:       u.ID,
		Email:    u.Email,
		Name:     u.Name,
		Role:     string(u.Role),
		IsActive: u.IsActive,
	}
}

func employeeToModel(e models.Employee) *model.Employee {
	emp := &model.Employee{
		ID:               e.ID,
		EmployeeId:       e.EmployeeID,
		Designation:      toStrPtr(e.Designation),
		Phone:            toStrPtr(e.Phone),
		Gender:           toStrPtr(e.Gender),
		BloodGroup:       toStrPtr(e.BloodGroup),
		PhotoUrl:         toStrPtr(e.PhotoURL),
		Address:          toStrPtr(e.Address),
		City:             toStrPtr(e.City),
		State:            toStrPtr(e.State),
		Pincode:          toStrPtr(e.Pincode),
		Nationality:      toStrPtr(e.Nationality),
		PersonalEmail:    toStrPtr(e.PersonalEmail),
		EmergencyName:    toStrPtr(e.EmergencyName),
		EmergencyPhone:   toStrPtr(e.EmergencyPhone),
		EmploymentType:   toStrPtr(e.EmploymentType),
		ProbationEndDate: toStrPtr(e.ProbationEndDate),
		GradeLevel:       toStrPtr(e.GradeLevel),
		DateOfBirth:      toStrPtr(e.DateOfBirth),
		User:             userToModel(e.User),
	}
	if !e.JoinDate.IsZero() {
		s := e.JoinDate.Format("2006-01-02")
		emp.JoinDate = &s
	}
	if e.DepartmentID != "" {
		emp.Department = &model.Department{ID: e.Department.ID, Name: e.Department.Name}
	}
	if e.PaymentDetails != nil {
		emp.PaymentDetails = paymentDetailsToModel(e.PaymentDetails)
	}
	return emp
}

func paymentDetailsToModel(pd *models.EmployeePaymentDetails) *model.EmployeePaymentDetails {
	return &model.EmployeePaymentDetails{
		BankName:          toStrPtr(pd.BankName),
		AccountNumber:     toStrPtr(pd.AccountNumber),
		AccountType:       toStrPtr(pd.AccountType),
		IfscCode:          toStrPtr(pd.IFSCCode),
		BranchName:        toStrPtr(pd.BranchName),
		PfNumber:          toStrPtr(pd.PFNumber),
		UanNumber:         toStrPtr(pd.UANNumber),
		PfEmployeePercent: toFloat64Ptr(pd.PFEmployeePercent),
		PfEmployerPercent: toFloat64Ptr(pd.PFEmployerPercent),
		EsiNumber:         toStrPtr(pd.ESINumber),
		EsiDispensary:     toStrPtr(pd.ESIDispensary),
		PanNumber:         toStrPtr(pd.PANNumber),
		TaxRegime:         toStrPtr(pd.TaxRegime),
		Form16Ref:         toStrPtr(pd.Form16Ref),
		NpsAccountNumber:  toStrPtr(pd.NPSAccountNumber),
		NpsTier:           toStrPtr(pd.NPSTier),
		GratuityEligible:  toBoolPtr(pd.GratuityEligible),
	}
}

func inputToPaymentDetails(input *model.PaymentDetailsInput, employeeID, tenantID string) models.EmployeePaymentDetails {
	pd := models.EmployeePaymentDetails{EmployeeID: employeeID, TenantID: tenantID}
	if input.BankName != nil {
		pd.BankName = *input.BankName
	}
	if input.AccountNumber != nil {
		pd.AccountNumber = *input.AccountNumber
	}
	if input.AccountType != nil {
		pd.AccountType = *input.AccountType
	}
	if input.IfscCode != nil {
		pd.IFSCCode = *input.IfscCode
	}
	if input.BranchName != nil {
		pd.BranchName = *input.BranchName
	}
	if input.PfNumber != nil {
		pd.PFNumber = *input.PfNumber
	}
	if input.UanNumber != nil {
		pd.UANNumber = *input.UanNumber
	}
	if input.PfEmployeePercent != nil {
		pd.PFEmployeePercent = *input.PfEmployeePercent
	}
	if input.PfEmployerPercent != nil {
		pd.PFEmployerPercent = *input.PfEmployerPercent
	}
	if input.EsiNumber != nil {
		pd.ESINumber = *input.EsiNumber
	}
	if input.EsiDispensary != nil {
		pd.ESIDispensary = *input.EsiDispensary
	}
	if input.PanNumber != nil {
		pd.PANNumber = *input.PanNumber
	}
	if input.TaxRegime != nil {
		pd.TaxRegime = *input.TaxRegime
	}
	if input.Form16Ref != nil {
		pd.Form16Ref = *input.Form16Ref
	}
	if input.NpsAccountNumber != nil {
		pd.NPSAccountNumber = *input.NpsAccountNumber
	}
	if input.NpsTier != nil {
		pd.NPSTier = *input.NpsTier
	}
	if input.GratuityEligible != nil {
		pd.GratuityEligible = *input.GratuityEligible
	}
	return pd
}
```

- [ ] **Step 2: Commit**

```bash
cd backend
git add graph/employees.resolvers.go
git commit -m "feat(graphql): implement Employee/Department/User resolvers (Batch 1)"
```

---

### Task 4: Remove Moved Stubs from schema.resolvers.go

**Files:**
- Modify: `backend/graph/schema.resolvers.go`

After Task 2, `schema.resolvers.go` contains `panic("not implemented")` stubs for `Employees`, `Employee`, `Departments`, `Users`, `CreateEmployee`, `DeleteEmployee`, `CreateDepartment`, `CreateUser`, `DeactivateUser`. These must be removed because `employees.resolvers.go` now provides the real implementations in the same `graph` package — duplicate function definitions will cause a build error.

- [ ] **Step 1: Open schema.resolvers.go and delete the following stubs**

Delete every function body that matches these signatures (leave only `Health` and `Placeholder`):

```
func (r *queryResolver) Employees(...)
func (r *queryResolver) Employee(...)
func (r *queryResolver) Departments(...)
func (r *queryResolver) Users(...)
func (r *mutationResolver) CreateEmployee(...)
func (r *mutationResolver) DeleteEmployee(...)
func (r *mutationResolver) CreateDepartment(...)
func (r *mutationResolver) CreateUser(...)
func (r *mutationResolver) DeactivateUser(...)
```

After editing, `schema.resolvers.go` should contain only:
```go
func (r *queryResolver) Health(ctx context.Context) (bool, error) {
    return true, nil
}

func (r *mutationResolver) Placeholder(ctx context.Context) (*bool, error) {
    panic(fmt.Errorf("not implemented: Placeholder - _placeholder"))
}
```

(Plus the `Mutation()`, `Query()`, `mutationResolver`, `queryResolver` type declarations at the bottom.)

- [ ] **Step 2: Commit**

```bash
cd backend
git add graph/schema.resolvers.go
git commit -m "chore(graphql): remove moved resolver stubs from schema.resolvers.go"
```

---

### Task 5: Backend Build + Resolver Smoke Test

**Files:**
- Create: `backend/graph/employees_resolvers_test.go`

- [ ] **Step 1: Write a failing test for tenant scoping**

```go
package graph_test

import (
	"context"
	"testing"

	"collegeerp/database"
	"collegeerp/graph"
	"collegeerp/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := "host=localhost user=postgres password=postgres dbname=collegeerp_test port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Skipf("test DB unavailable: %v", err)
	}
	db.AutoMigrate(&models.User{}, &models.Department{}, &models.Employee{}, &models.EmployeePaymentDetails{})
	t.Cleanup(func() {
		db.Exec("DELETE FROM employees")
		db.Exec("DELETE FROM departments")
		db.Exec("DELETE FROM users")
	})
	return db
}

func TestEmployeesQuery_TenantScoped(t *testing.T) {
	db := setupTestDB(t)
	database.DB = db

	// Seed two tenants
	u1 := models.User{TenantID: "tenant-A", Name: "Alice", Email: "alice@a.com", Password: "x", Role: models.RoleStaff, IsActive: true}
	u2 := models.User{TenantID: "tenant-B", Name: "Bob", Email: "bob@b.com", Password: "x", Role: models.RoleStaff, IsActive: true}
	db.Create(&u1)
	db.Create(&u2)

	emp1 := models.Employee{TenantID: "tenant-A", UserID: u1.ID, EmployeeID: "A001"}
	emp2 := models.Employee{TenantID: "tenant-B", UserID: u2.ID, EmployeeID: "B001"}
	db.Create(&emp1)
	db.Create(&emp2)

	r := graph.Resolver{DB: db}
	ctx := context.WithValue(context.Background(), graph.TestAuthKey, graph.AuthContext{
		TenantID: "tenant-A",
		Role:     "admin",
	})

	// Note: AuthFromCtx reads from the typed key; expose TestAuthKey only in test builds.
	// Alternatively, call graph.InjectTestAuth(ctx, ...) — see auth_context.go.
	employees, err := r.Query().Employees(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(employees) != 1 {
		t.Fatalf("want 1 employee for tenant-A, got %d", len(employees))
	}
	if employees[0].EmployeeId != "A001" {
		t.Errorf("wrong employee returned: %v", employees[0].EmployeeId)
	}
}
```

> **Note on test auth injection:** The test uses `graph.TestAuthKey` — you need to expose a test helper in `auth_context.go`. Add this at the bottom of `backend/graph/auth_context.go` (inside a `//go:build` guard is optional but clean):

```go
// TestAuthKey is exported for resolver tests only — inject a pre-built AuthContext directly.
var TestAuthKey = authKey
```

- [ ] **Step 2: Run the test to confirm it fails (test DB may not exist yet, which causes a skip — that's OK)**

```bash
cd backend
go test ./graph/... -run TestEmployeesQuery_TenantScoped -v
```

Expected: `SKIP test DB unavailable` OR `FAIL` (function not found). Either is correct at this point.

- [ ] **Step 3: Verify the backend builds cleanly**

```bash
cd backend
go build ./...
```

Expected: No errors.

- [ ] **Step 4: Run all tests to confirm nothing regressed**

```bash
cd backend
go test ./... 2>&1 | tail -20
```

Expected: `ok` or `SKIP` for all packages, no `FAIL`.

- [ ] **Step 5: Commit test file and auth_context.go change**

```bash
cd backend
git add graph/employees_resolvers_test.go graph/auth_context.go
git commit -m "test(graphql): add tenant-scoping test for Employees resolver"
```

---

### Task 6: Create Frontend GraphQL Query Documents

**Files:**
- Create: `frontend/graphql/queries/employees.ts`

- [ ] **Step 1: Create the queries file**

```bash
mkdir -p frontend/graphql/queries
```

```ts
// frontend/graphql/queries/employees.ts
import { gql } from "@apollo/client";

export const LIST_EMPLOYEES = gql`
  query ListEmployees {
    employees {
      id
      employeeId
      designation
      phone
      joinDate
      user {
        id
        name
        email
      }
      department {
        id
        name
      }
      paymentDetails {
        bankName
        accountNumber
        accountType
        ifscCode
        branchName
        pfNumber
        uanNumber
        pfEmployeePercent
        pfEmployerPercent
        esiNumber
        esiDispensary
        panNumber
        taxRegime
        form16Ref
        npsAccountNumber
        npsTier
        gratuityEligible
      }
    }
  }
`;

export const LIST_DEPARTMENTS = gql`
  query ListDepartments {
    departments {
      id
      name
    }
  }
`;

export const LIST_USERS = gql`
  query ListUsers {
    users {
      id
      name
      email
      role
      isActive
    }
  }
`;
```

- [ ] **Step 2: Commit**

```bash
cd frontend
git add graphql/queries/employees.ts
git commit -m "feat(graphql): add Employee/Department/User query documents"
```

---

### Task 7: Create Frontend GraphQL Mutation Documents

**Files:**
- Create: `frontend/graphql/mutations/employees.ts`

- [ ] **Step 1: Create the mutations file**

```bash
mkdir -p frontend/graphql/mutations
```

```ts
// frontend/graphql/mutations/employees.ts
import { gql } from "@apollo/client";

export const CREATE_EMPLOYEE = gql`
  mutation CreateEmployee($input: CreateEmployeeInput!) {
    createEmployee(input: $input) {
      id
      employeeId
      designation
      phone
      joinDate
      user {
        id
        name
        email
      }
      department {
        id
        name
      }
    }
  }
`;

export const DELETE_EMPLOYEE = gql`
  mutation DeleteEmployee($id: ID!) {
    deleteEmployee(id: $id)
  }
`;

export const CREATE_DEPARTMENT = gql`
  mutation CreateDepartment($input: CreateDepartmentInput!) {
    createDepartment(input: $input) {
      id
      name
    }
  }
`;

export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
      role
      isActive
    }
  }
`;

export const DEACTIVATE_USER = gql`
  mutation DeactivateUser($id: ID!) {
    deactivateUser(id: $id)
  }
`;
```

- [ ] **Step 2: Commit**

```bash
cd frontend
git add graphql/mutations/employees.ts
git commit -m "feat(graphql): add Employee/User mutation documents"
```

---

### Task 8: Migrate employees/page.tsx to Apollo

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/employees/page.tsx`

The goal is to replace the Redux dispatch calls with Apollo hooks while keeping all UI code identical. Field name changes to note:
- `emp.user_id` → `emp.user?.id` (employees page `availableUsers` filter)
- `emp.join_date` → `emp.joinDate` (GraphQL returns camelCase)
- `u.is_active` is not used in this page; `u.role` stays the same

- [ ] **Step 1: Replace the full file contents**

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { LIST_EMPLOYEES, LIST_DEPARTMENTS, LIST_USERS } from "@/graphql/queries/employees";
import { CREATE_EMPLOYEE, DELETE_EMPLOYEE } from "@/graphql/mutations/employees";
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

type AnyEmployee = {
  id: string;
  employeeId: string;
  designation?: string | null;
  phone?: string | null;
  joinDate?: string | null;
  user: { id: string; name: string; email: string };
  department?: { id: string; name: string } | null;
};

type AnyUser = { id: string; name: string; email: string; role: string };
type AnyDepartment = { id: string; name: string };

export default function EmployeesPage() {
  const { data: empData, loading } = useQuery(LIST_EMPLOYEES);
  const { data: deptData } = useQuery(LIST_DEPARTMENTS);
  const { data: usersData } = useQuery(LIST_USERS);

  const [createEmployee] = useMutation(CREATE_EMPLOYEE, {
    refetchQueries: [{ query: LIST_EMPLOYEES }],
  });
  const [deleteEmployee] = useMutation(DELETE_EMPLOYEE, {
    refetchQueries: [{ query: LIST_EMPLOYEES }],
  });

  const employees: AnyEmployee[] = empData?.employees ?? [];
  const departments: AnyDepartment[] = deptData?.departments ?? [];
  const users: AnyUser[] = usersData?.users ?? [];

  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("personal");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [form, setForm] = useState(emptyForm);

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

    try {
      await createEmployee({
        variables: {
          input: {
            userId: form.user_id,
            employeeId: form.employee_id,
            departmentId: form.department_id || null,
            designation: form.designation || null,
            phone: form.phone || null,
            joinDate: form.join_date || null,
            dateOfBirth: form.date_of_birth || null,
            gender: form.gender || null,
            bloodGroup: form.blood_group || null,
            employmentType: form.employment_type || null,
            emergencyName: form.emergency_name || null,
            emergencyPhone: form.emergency_phone || null,
            ...(hasPayment ? {
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
            } : {}),
          },
        },
      });
      toast.success("Employee added");
      closeModal();
    } catch {
      toast.error("Failed to add employee");
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmState({
      title: "Remove Employee",
      message: `Remove ${name} from the employee list? Their user account will not be deleted.`,
      variant: "danger",
      confirmLabel: "Remove",
      onConfirm: async () => {
        await deleteEmployee({ variables: { id } });
        toast.success("Employee removed");
      },
    });
  };

  const availableUsers = users.filter(
    (u) => !employees.find((e) => e.user?.id === u.id) && u.role !== "student"
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
                  <td className="table-td">{emp.joinDate?.slice(0, 10) ?? "—"}</td>
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
                  <input className="input-field" placeholder="e.g. EMP001" value={form.employee_id} onChange={(e) => set("employee_id", e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Gender</label>
                  <select className="input-field" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Date of Birth</label>
                  <input type="date" className="input-field" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Blood Group</label>
                  <input className="input-field" placeholder="e.g. O+" value={form.blood_group} onChange={(e) => set("blood_group", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Employment Type</label>
                <select className="input-field" value={form.employment_type} onChange={(e) => set("employment_type", e.target.value)}>
                  <option value="">Select...</option>
                  <option value="permanent">Permanent</option>
                  <option value="contract">Contract</option>
                  <option value="part-time">Part-time</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Emergency Contact Name</label>
                  <input className="input-field" value={form.emergency_name} onChange={(e) => set("emergency_name", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Emergency Contact Phone</label>
                  <input className="input-field" value={form.emergency_phone} onChange={(e) => set("emergency_phone", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Bank Account tab */}
          {activeTab === "bank" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Bank Name</label>
                  <input className="input-field" value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Account Type</label>
                  <select className="input-field" value={form.account_type} onChange={(e) => set("account_type", e.target.value)}>
                    <option value="">Select...</option>
                    <option value="savings">Savings</option>
                    <option value="current">Current</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Account Number</label>
                <input className="input-field" value={form.account_number} onChange={(e) => set("account_number", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">IFSC Code</label>
                  <input className="input-field" placeholder="e.g. SBIN0001234" value={form.ifsc_code} onChange={(e) => set("ifsc_code", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Branch Name</label>
                  <input className="input-field" value={form.branch_name} onChange={(e) => set("branch_name", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* PF & ESI tab */}
          {activeTab === "pf_esi" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">PF Number</label>
                  <input className="input-field" value={form.pf_number} onChange={(e) => set("pf_number", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">UAN Number</label>
                  <input className="input-field" value={form.uan_number} onChange={(e) => set("uan_number", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">PF Employee %</label>
                  <input type="number" className="input-field" value={form.pf_employee_percent} onChange={(e) => set("pf_employee_percent", Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">PF Employer %</label>
                  <input type="number" className="input-field" value={form.pf_employer_percent} onChange={(e) => set("pf_employer_percent", Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">ESI Number</label>
                  <input className="input-field" value={form.esi_number} onChange={(e) => set("esi_number", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">ESI Dispensary</label>
                  <input className="input-field" value={form.esi_dispensary} onChange={(e) => set("esi_dispensary", e.target.value)} />
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
                  <input className="input-field" placeholder="ABCDE1234F" value={form.pan_number} onChange={(e) => set("pan_number", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Tax Regime</label>
                  <select className="input-field" value={form.tax_regime} onChange={(e) => set("tax_regime", e.target.value)}>
                    <option value="">Select...</option>
                    <option value="old">Old</option>
                    <option value="new">New</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Form 16 Reference</label>
                <input className="input-field" value={form.form16_ref} onChange={(e) => set("form16_ref", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">NPS Account Number</label>
                  <input className="input-field" value={form.nps_account_number} onChange={(e) => set("nps_account_number", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">NPS Tier</label>
                  <select className="input-field" value={form.nps_tier} onChange={(e) => set("nps_tier", e.target.value)}>
                    <option value="">Select...</option>
                    <option value="tier1">Tier 1</option>
                    <option value="tier2">Tier 2</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="gratuity"
                  checked={form.gratuity_eligible}
                  onChange={(e) => set("gratuity_eligible", e.target.checked)}
                />
                <label htmlFor="gratuity" className="text-sm font-medium text-foreground/80">
                  Eligible for Gratuity
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn-primary">Add Employee</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend
git add "app/[tenant]/(dashboard)/employees/page.tsx"
git commit -m "feat(graphql): migrate employees page from Redux to Apollo (Batch 1)"
```

---

### Task 9: Migrate users/page.tsx to Apollo

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/users/page.tsx`

Field name change: `user.is_active` → `user.isActive` (GraphQL returns camelCase).

- [ ] **Step 1: Replace the full file contents**

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { LIST_USERS } from "@/graphql/queries/employees";
import { CREATE_USER, DEACTIVATE_USER } from "@/graphql/mutations/employees";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import Switch from "@/components/ui/switch";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import type { Role } from "@/types";

const roleVariant: Record<Role, "blue" | "green" | "yellow" | "gray" | "purple"> = {
  admin:       "blue",
  teacher:     "green",
  student:     "yellow",
  staff:       "gray",
  super_admin: "purple",
};

type GqlUser = { id: string; name: string; email: string; role: Role; isActive: boolean };

export default function UsersPage() {
  const { data, loading } = useQuery(LIST_USERS);
  const users: GqlUser[] = data?.users ?? [];

  const [createUser] = useMutation(CREATE_USER, {
    refetchQueries: [{ query: LIST_USERS }],
  });
  const [deactivateUser] = useMutation(DEACTIVATE_USER, {
    refetchQueries: [{ query: LIST_USERS }],
  });

  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff" });
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const filteredUsers = search
    ? users.filter((u) =>
        [u.name, u.email, u.role].some((v) =>
          String(v ?? "").toLowerCase().includes(search.toLowerCase())
        )
      )
    : users;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser({ variables: { input: form } });
      toast.success("User created successfully");
      setShowModal(false);
      setForm({ name: "", email: "", password: "", role: "staff" });
    } catch {
      toast.error("Failed to create user");
    }
  };

  const handleToggleActive = (id: string, name: string, currentlyActive: boolean) => {
    if (!currentlyActive) return;
    setConfirmState({
      title: "Deactivate User",
      message: `Deactivate ${name}? They won't be able to log in until re-activated by an admin.`,
      variant: "warning",
      confirmLabel: "Deactivate",
      onConfirm: async () => {
        await deactivateUser({ variables: { id } });
        toast.success("User deactivated");
      },
    });
  };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage all organisation accounts"
        actions={
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New User
          </button>
        }
      />

      <div className="mb-4">
        <input
          className="input-field max-w-sm"
          placeholder="Search name, email, role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Email</th>
                <th className="table-th">Role</th>
                <th className="table-th">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="table-row">
                  <td className="table-td font-medium text-foreground">{user.name}</td>
                  <td className="table-td text-muted-foreground">{user.email}</td>
                  <td className="table-td">
                    <Badge label={user.role} variant={roleVariant[user.role]} />
                  </td>
                  <td className="table-td">
                    <Switch
                      checked={user.isActive}
                      onChange={() => handleToggleActive(user.id, user.name, user.isActive)}
                      size="sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />

      <Modal title="Create New User" isOpen={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Full Name</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Doe"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Email</label>
            <input
              type="email"
              className="input-field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jane@college.edu"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Password</label>
            <input
              type="password"
              className="input-field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Role</label>
            <select
              className="input-field"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="staff">Staff</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create User
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend
git add "app/[tenant]/(dashboard)/users/page.tsx"
git commit -m "feat(graphql): migrate users page from Redux to Apollo (Batch 1)"
```

---

### Task 10: End-to-End Verify + Final Commit

- [ ] **Step 1: Start the backend**

```bash
cd backend
go build -o /tmp/collerp_batch1 . && /tmp/collerp_batch1 &
```

Expected: Server starts on port 3001. No build errors.

- [ ] **Step 2: Verify GraphQL schema with a health check**

```bash
curl -s -X POST http://localhost:3001/api/v1/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-dev-token>" \
  -H "X-Tenant-ID: <your-tenant-id>" \
  -d '{"query":"{ health }"}' | jq .
```

Expected: `{"data":{"health":true}}`

- [ ] **Step 3: Verify employees query returns data (or empty array)**

```bash
curl -s -X POST http://localhost:3001/api/v1/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-dev-token>" \
  -H "X-Tenant-ID: <your-tenant-id>" \
  -d '{"query":"{ employees { id employeeId user { name } } }"}' | jq .
```

Expected: `{"data":{"employees":[...]}}` — no `errors` field.

- [ ] **Step 4: Start the frontend dev server**

```bash
cd frontend
pnpm dev
```

- [ ] **Step 5: Navigate to `/[your-tenant]/employees`**

Check:
- Table loads (no spinner stuck)
- No console errors about undefined variables
- "Add Employee" modal opens, all 4 tabs render
- Creating an employee succeeds and table refreshes

- [ ] **Step 6: Navigate to `/[your-tenant]/users`**

Check:
- Table loads with correct user list
- Search filters correctly
- "New User" modal creates a user and table refreshes
- Deactivate toggle works

- [ ] **Step 7: Stop dev server + backend**

```bash
pkill -f collerp_batch1
```

- [ ] **Step 8: Final commit if any fixes were needed**

```bash
cd /path/to/CollERP
git add -p
git commit -m "fix(graphql): batch 1 end-to-end verification fixes"
```
