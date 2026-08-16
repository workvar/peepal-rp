# Batch 5: Fees Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GraphQL types/queries/mutations for Fees (categories, structures, payments, dues, collection summary); migrate `fees/page.tsx` from Redux/REST to Apollo/GraphQL.

**Architecture:** Schema-first gqlgen. New `fees.resolvers.go` domain file. Frontend `fees/page.tsx` is a complex multi-tab page — migrate all tabs.

**Tech Stack:** Go/gqlgen/GORM (backend), Next.js/Apollo Client/TypeScript (frontend)

---

## Critical Context

### gqlgen conventions
- Schema file: `backend/graph/schema.graphqls`
- After editing schema run: `cd backend && go generate ./...`
- New stubs appear in `schema.resolvers.go` — implement in `fees.resolvers.go`, then delete stubs from `schema.resolvers.go`
- `FeeCategory` conflicts with existing `FeeCategory` model name — use `GraphQL type name FeeCategory` (OK in GraphQL space, different from Go model `models.FeeCategory`)

### Auth context
```go
auth := AuthFromCtx(ctx)
// auth.TenantID, auth.UserID, auth.Role
```

### Sentinel errors
```go
ErrNotFound / ErrForbidden / ErrValidation
```

### Existing helpers (check before adding)
`toStrPtr`, `strVal`, `intVal`, `boolVal`, `floatVal` — check `helpers.go` and `schema.resolvers.go` before adding new ones.

### GORM model facts
- `models.FeeCategory`: TenantID, Name, Code, Description, IsActive
- `models.FeeStructure`: TenantID, AcademicYearID, CourseID, FeeCategoryID, SemesterNumber, Amount, DueDate (time.Time), LateFeePerDay, MaxLateFee, IsActive; preloads AcademicYear, Course, FeeCategory
- `models.FeePayment`: TenantID, StudentID, FeeStructureID, AcademicYearID, Amount, LateFee, TotalAmount, PaymentDate (time.Time), PaymentMode, TransactionRef, Status ("pending"|"paid"|"cancelled"), Remarks, ReceivedBy, ReceiptNumber; preloads Student, FeeStructure, FeeStructure.FeeCategory
- `models.FeeDue`: NOT a GORM model — it's a computed struct, not stored in DB. Build it in Go code.
- `models.AcademicYear`: ID, Name, IsCurrent — used in FeeStructure preload
- `models.Student`: ID, CourseID (string), RollNumber, User (preload), Course (preload)

### Receipt number generation
```go
var count int64
r.DB.Model(&models.FeePayment{}).Where("tenant_id = ?", auth.TenantID).Count(&count)
receiptNum := fmt.Sprintf("RCP-%s-%04d", time.Now().Format("20060102"), count+1)
```

### Outstanding dues computation
FeeDue is computed: iterate all active FeeStructures, match students by CourseID, subtract paid amounts from a paidMap keyed by `{feeStructureID, studentID}`.

### Apollo pattern
```typescript
const { data, loading } = useQuery(QUERY, { variables: {...} })
const [mutate] = useMutation(MUTATION)
// refetchQueries at call site, not hook definition
```

### Auth stays Redux
```typescript
const { user } = useAppSelector(s => s.auth) // keep for role checks
```

### Frontend field mapping (REST → GraphQL)
- `fs.academic_year_id` → `fs.academicYearId`
- `fs.course_id` → `fs.courseId`  
- `fs.fee_category_id` → `fs.feeCategoryId`
- `fs.semester_number` → `fs.semesterNumber`
- `fs.late_fee_per_day` → `fs.lateFeePerDay`
- `fs.max_late_fee` → `fs.maxLateFee`
- `fs.is_active` → `fs.isActive`
- `fs.due_date` → `fs.dueDate`
- `p.student_id` → `p.studentId`
- `p.fee_structure_id` → `p.feeStructureId`
- `p.academic_year_id` → `p.academicYearId`
- `p.late_fee` → `p.lateFee`
- `p.total_amount` → `p.totalAmount`
- `p.payment_date` → `p.paymentDate`
- `p.payment_mode` → `p.paymentMode`
- `p.transaction_ref` → `p.transactionRef`
- `p.received_by` → `p.receivedBy`
- `p.receipt_number` → `p.receiptNumber`
- `d.student_id` → `d.studentId`
- `d.student_name` → `d.studentName`
- `d.roll_number` → `d.rollNumber`
- `d.course_name` → `d.courseName`
- `d.category_name` → `d.categoryName`
- `d.fee_structure_id` → `d.feeStructureId`
- `d.total_due` → `d.totalDue`
- `d.total_paid` → `d.totalPaid`
- `d.due_date` → `d.dueDate`
- `d.is_overdue` → `d.isOverdue`
- `summary.total_collected` → `summary.totalCollected`
- `summary.payment_count` → `summary.paymentCount`
- `summary.pending_dues` → `summary.pendingDues`
- `summary.total_expected` → `summary.totalExpected`

---

## File Structure

**Create:**
- `backend/graph/fees.resolvers.go`
- `frontend/graphql/queries/fees.ts`
- `frontend/graphql/mutations/fees.ts`

**Modify:**
- `backend/graph/schema.graphqls`
- `backend/graph/schema.resolvers.go` (remove stubs after implementing)
- `frontend/app/[tenant]/(dashboard)/fees/page.tsx`

---

### Task 1: Schema additions for Fees

**Files:**
- Modify: `backend/graph/schema.graphqls`

- [ ] **Step 1: Add types to schema.graphqls**

Append after existing type blocks:

```graphql
type FeeCategory {
  id: ID!
  name: String!
  code: String!
  description: String
  isActive: Boolean!
}

type FeeStructure {
  id: ID!
  academicYearId: String!
  courseId: String!
  feeCategoryId: String!
  semesterNumber: Int!
  amount: Float!
  dueDate: String
  lateFeePerDay: Float!
  maxLateFee: Float!
  isActive: Boolean!
  academicYear: AcademicYear
  course: Course
  feeCategory: FeeCategory
}

type FeePayment {
  id: ID!
  studentId: String!
  feeStructureId: String!
  academicYearId: String!
  amount: Float!
  lateFee: Float!
  totalAmount: Float!
  paymentDate: String!
  paymentMode: String!
  transactionRef: String
  status: String!
  remarks: String
  receivedBy: String
  receiptNumber: String!
  student: Student
  feeStructure: FeeStructure
}

type FeeDue {
  studentId: String!
  studentName: String!
  rollNumber: String!
  courseName: String!
  categoryName: String!
  feeStructureId: String!
  totalDue: Float!
  totalPaid: Float!
  outstanding: Float!
  dueDate: String!
  isOverdue: Boolean!
}

type FeeCollectionSummary {
  totalCollected: Float!
  paymentCount: Int!
  pendingDues: Float!
  totalExpected: Float!
}

input CreateFeeCategoryInput {
  name: String!
  code: String!
  description: String
}

input UpdateFeeCategoryInput {
  name: String
  description: String
  isActive: Boolean
}

input CreateFeeStructureInput {
  academicYearId: String!
  courseId: String!
  feeCategoryId: String!
  semesterNumber: Int
  amount: Float!
  dueDate: String
  lateFeePerDay: Float
  maxLateFee: Float
}

input UpdateFeeStructureInput {
  amount: Float
  dueDate: String
  lateFeePerDay: Float
  maxLateFee: Float
  isActive: Boolean
}

input RecordFeePaymentInput {
  studentId: String!
  feeStructureId: String!
  academicYearId: String
  amount: Float!
  lateFee: Float
  paymentDate: String
  paymentMode: String
  transactionRef: String
  remarks: String
}

input UpdatePaymentStatusInput {
  status: String!
  remarks: String
}
```

- [ ] **Step 2: Add queries and mutations**

In the `Query` type block, add:
```graphql
  feeCategories: [FeeCategory!]!
  feeStructures(academicYearId: String, courseId: String): [FeeStructure!]!
  feePayments(studentId: String, academicYearId: String, status: String): [FeePayment!]!
  myFeePayments: [FeePayment!]!
  feeDues(academicYearId: String, courseId: String): [FeeDue!]!
  feeCollectionSummary(academicYearId: String): FeeCollectionSummary!
```

In the `Mutation` type block, add:
```graphql
  createFeeCategory(input: CreateFeeCategoryInput!): FeeCategory!
  updateFeeCategory(id: ID!, input: UpdateFeeCategoryInput!): FeeCategory!
  deleteFeeCategory(id: ID!): Boolean!
  createFeeStructure(input: CreateFeeStructureInput!): FeeStructure!
  updateFeeStructure(id: ID!, input: UpdateFeeStructureInput!): FeeStructure!
  deleteFeeStructure(id: ID!): Boolean!
  recordFeePayment(input: RecordFeePaymentInput!): FeePayment!
  updateFeePaymentStatus(id: ID!, input: UpdatePaymentStatusInput!): FeePayment!
```

- [ ] **Step 3: Run gqlgen**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go generate ./...
```

- [ ] **Step 4: Build verify**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go build ./...
```

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add backend/graph/schema.graphqls backend/graph/schema.resolvers.go backend/graph/model/models_gen.go
git commit -m "feat(batch5): add fees GraphQL schema types and generated stubs"
```

---

### Task 2: Backend — fees.resolvers.go

**Files:**
- Create: `backend/graph/fees.resolvers.go`
- Modify: `backend/graph/schema.resolvers.go` (remove batch 5 stubs)

- [ ] **Step 1: Create backend/graph/fees.resolvers.go**

```go
package graph

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// ─── Queries ──────────────────────────────────────────────────────────────────

func (r *queryResolver) FeeCategories(ctx context.Context) ([]*model.FeeCategory, error) {
	auth := AuthFromCtx(ctx)
	var cats []models.FeeCategory
	if err := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID).Order("name").Find(&cats).Error; err != nil {
		return nil, err
	}
	out := make([]*model.FeeCategory, len(cats))
	for i, c := range cats {
		out[i] = feeCategoryToModel(c)
	}
	return out, nil
}

func (r *queryResolver) FeeStructures(ctx context.Context, academicYearID *string, courseID *string) ([]*model.FeeStructure, error) {
	auth := AuthFromCtx(ctx)
	q := r.DB.WithContext(ctx).Where("fee_structures.tenant_id = ?", auth.TenantID).
		Preload("AcademicYear").Preload("Course").Preload("FeeCategory")
	if academicYearID != nil && *academicYearID != "" {
		q = q.Where("fee_structures.academic_year_id = ?", *academicYearID)
	}
	if courseID != nil && *courseID != "" {
		q = q.Where("fee_structures.course_id = ?", *courseID)
	}
	var structs []models.FeeStructure
	if err := q.Order("fee_structures.created_at DESC").Find(&structs).Error; err != nil {
		return nil, err
	}
	out := make([]*model.FeeStructure, len(structs))
	for i, fs := range structs {
		out[i] = feeStructureToModel(fs)
	}
	return out, nil
}

func (r *queryResolver) FeePayments(ctx context.Context, studentID *string, academicYearID *string, status *string) ([]*model.FeePayment, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" && auth.Role != "staff" {
		return nil, ErrForbidden
	}
	q := r.DB.WithContext(ctx).Where("fee_payments.tenant_id = ?", auth.TenantID).
		Preload("Student").Preload("Student.User").
		Preload("FeeStructure").Preload("FeeStructure.FeeCategory")
	if studentID != nil && *studentID != "" {
		q = q.Where("fee_payments.student_id = ?", *studentID)
	}
	if academicYearID != nil && *academicYearID != "" {
		q = q.Where("fee_payments.academic_year_id = ?", *academicYearID)
	}
	if status != nil && *status != "" {
		q = q.Where("fee_payments.status = ?", *status)
	}
	var payments []models.FeePayment
	if err := q.Order("fee_payments.created_at DESC").Find(&payments).Error; err != nil {
		return nil, err
	}
	out := make([]*model.FeePayment, len(payments))
	for i, p := range payments {
		out[i] = feePaymentToModel(p)
	}
	return out, nil
}

func (r *queryResolver) MyFeePayments(ctx context.Context) ([]*model.FeePayment, error) {
	auth := AuthFromCtx(ctx)
	var student models.Student
	if err := r.DB.WithContext(ctx).Where("user_id = ? AND tenant_id = ?", auth.UserID, auth.TenantID).First(&student).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	var payments []models.FeePayment
	if err := r.DB.WithContext(ctx).Where("student_id = ? AND tenant_id = ?", student.ID, auth.TenantID).
		Preload("FeeStructure").Preload("FeeStructure.FeeCategory").
		Order("created_at DESC").Find(&payments).Error; err != nil {
		return nil, err
	}
	out := make([]*model.FeePayment, len(payments))
	for i, p := range payments {
		out[i] = feePaymentToModel(p)
	}
	return out, nil
}

func (r *queryResolver) FeeDues(ctx context.Context, academicYearID *string, courseID *string) ([]*model.FeeDue, error) {
	auth := AuthFromCtx(ctx)

	fsQuery := r.DB.WithContext(ctx).Where("fee_structures.tenant_id = ? AND fee_structures.is_active = ?", auth.TenantID, true).
		Preload("FeeCategory").Preload("Course")
	if academicYearID != nil && *academicYearID != "" {
		fsQuery = fsQuery.Where("fee_structures.academic_year_id = ?", *academicYearID)
	}
	if courseID != nil && *courseID != "" {
		fsQuery = fsQuery.Where("fee_structures.course_id = ?", *courseID)
	}
	var feeStructures []models.FeeStructure
	if err := fsQuery.Find(&feeStructures).Error; err != nil {
		return nil, err
	}

	studentQuery := r.DB.WithContext(ctx).Where("students.tenant_id = ?", auth.TenantID).Preload("User").Preload("Course")
	if courseID != nil && *courseID != "" {
		studentQuery = studentQuery.Where("students.course_id = ?", *courseID)
	}
	var students []models.Student
	if err := studentQuery.Find(&students).Error; err != nil {
		return nil, err
	}

	payQuery := r.DB.WithContext(ctx).Where("fee_payments.tenant_id = ? AND fee_payments.status = ?", auth.TenantID, "paid")
	if academicYearID != nil && *academicYearID != "" {
		payQuery = payQuery.Where("fee_payments.academic_year_id = ?", *academicYearID)
	}
	var payments []models.FeePayment
	if err := payQuery.Find(&payments).Error; err != nil {
		return nil, err
	}

	type payKey struct{ fsID, sID string }
	paidMap := make(map[payKey]float64)
	for _, p := range payments {
		k := payKey{p.FeeStructureID, p.StudentID}
		paidMap[k] += p.TotalAmount
	}

	now := time.Now()
	var dues []*model.FeeDue
	for _, student := range students {
		for _, fs := range feeStructures {
			if fs.CourseID != student.CourseID {
				continue
			}
			k := payKey{fs.ID, student.ID}
			paid := paidMap[k]
			outstanding := math.Max(fs.Amount-paid, 0)
			if outstanding <= 0 {
				continue
			}
			name := ""
			if student.User.ID != "" {
				name = student.User.Name
			}
			isOverdue := now.After(fs.DueDate) && !fs.DueDate.IsZero()
			dues = append(dues, &model.FeeDue{
				StudentID:      student.ID,
				StudentName:    name,
				RollNumber:     student.RollNumber,
				CourseName:     fs.Course.Name,
				CategoryName:   fs.FeeCategory.Name,
				FeeStructureID: fs.ID,
				TotalDue:       fs.Amount,
				TotalPaid:      paid,
				Outstanding:    outstanding,
				DueDate:        fs.DueDate.Format("2006-01-02"),
				IsOverdue:      isOverdue,
			})
		}
	}
	if dues == nil {
		dues = []*model.FeeDue{}
	}
	return dues, nil
}

func (r *queryResolver) FeeCollectionSummary(ctx context.Context, academicYearID *string) (*model.FeeCollectionSummary, error) {
	auth := AuthFromCtx(ctx)

	q := r.DB.WithContext(ctx).Model(&models.FeePayment{}).
		Where("fee_payments.tenant_id = ? AND fee_payments.status = ?", auth.TenantID, "paid")
	if academicYearID != nil && *academicYearID != "" {
		q = q.Where("fee_payments.academic_year_id = ?", *academicYearID)
	}

	var totalCollected float64
	var paymentCount int64
	if err := q.Select("COALESCE(SUM(total_amount), 0)").Scan(&totalCollected).Error; err != nil {
		return nil, err
	}
	if err := q.Count(&paymentCount).Error; err != nil {
		return nil, err
	}

	var structTotal float64
	fsQ := r.DB.WithContext(ctx).Model(&models.FeeStructure{}).
		Where("tenant_id = ? AND is_active = ?", auth.TenantID, true)
	if academicYearID != nil && *academicYearID != "" {
		fsQ = fsQ.Where("academic_year_id = ?", *academicYearID)
	}
	if err := fsQ.Select("COALESCE(SUM(amount), 0)").Scan(&structTotal).Error; err != nil {
		return nil, err
	}

	pendingDues := math.Max(structTotal-totalCollected, 0)
	return &model.FeeCollectionSummary{
		TotalCollected: totalCollected,
		PaymentCount:   int(paymentCount),
		PendingDues:    pendingDues,
		TotalExpected:  structTotal,
	}, nil
}

// ─── Mutations ────────────────────────────────────────────────────────────────

func (r *mutationResolver) CreateFeeCategory(ctx context.Context, input model.CreateFeeCategoryInput) (*model.FeeCategory, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
	}
	cat := models.FeeCategory{
		TenantID:    auth.TenantID,
		Name:        input.Name,
		Code:        input.Code,
		Description: strVal(input.Description),
	}
	if err := r.DB.WithContext(ctx).Create(&cat).Error; err != nil {
		return nil, err
	}
	return feeCategoryToModel(cat), nil
}

func (r *mutationResolver) UpdateFeeCategory(ctx context.Context, id string, input model.UpdateFeeCategoryInput) (*model.FeeCategory, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
	}
	var cat models.FeeCategory
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&cat).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	updates := map[string]interface{}{}
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}
	if len(updates) > 0 {
		if err := r.DB.WithContext(ctx).Model(&cat).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&cat).Error; err != nil {
		return nil, err
	}
	return feeCategoryToModel(cat), nil
}

func (r *mutationResolver) DeleteFeeCategory(ctx context.Context, id string) (bool, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return false, ErrForbidden
	}
	res := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.FeeCategory{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

func (r *mutationResolver) CreateFeeStructure(ctx context.Context, input model.CreateFeeStructureInput) (*model.FeeStructure, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
	}
	if input.Amount <= 0 {
		return nil, ErrValidation
	}
	var dueDate time.Time
	if input.DueDate != nil && *input.DueDate != "" {
		dueDate, _ = time.Parse("2006-01-02", *input.DueDate)
	}
	fs := models.FeeStructure{
		TenantID:       auth.TenantID,
		AcademicYearID: input.AcademicYearID,
		CourseID:       input.CourseID,
		FeeCategoryID:  input.FeeCategoryID,
		SemesterNumber: intVal(input.SemesterNumber),
		Amount:         input.Amount,
		DueDate:        dueDate,
		LateFeePerDay:  floatVal(input.LateFeePerDay),
		MaxLateFee:     floatVal(input.MaxLateFee),
		IsActive:       true,
	}
	if err := r.DB.WithContext(ctx).Create(&fs).Error; err != nil {
		return nil, err
	}
	if err := r.DB.WithContext(ctx).Preload("AcademicYear").Preload("Course").Preload("FeeCategory").
		Where("id = ? AND tenant_id = ?", fs.ID, auth.TenantID).First(&fs).Error; err != nil {
		return nil, err
	}
	return feeStructureToModel(fs), nil
}

func (r *mutationResolver) UpdateFeeStructure(ctx context.Context, id string, input model.UpdateFeeStructureInput) (*model.FeeStructure, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
	}
	var fs models.FeeStructure
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&fs).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	updates := map[string]interface{}{}
	if input.Amount != nil && *input.Amount > 0 {
		updates["amount"] = *input.Amount
	}
	if input.DueDate != nil && *input.DueDate != "" {
		if t, err := time.Parse("2006-01-02", *input.DueDate); err == nil {
			updates["due_date"] = t
		}
	}
	if input.LateFeePerDay != nil {
		updates["late_fee_per_day"] = *input.LateFeePerDay
	}
	if input.MaxLateFee != nil {
		updates["max_late_fee"] = *input.MaxLateFee
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}
	if len(updates) > 0 {
		if err := r.DB.WithContext(ctx).Model(&fs).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	if err := r.DB.WithContext(ctx).Preload("AcademicYear").Preload("Course").Preload("FeeCategory").
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&fs).Error; err != nil {
		return nil, err
	}
	return feeStructureToModel(fs), nil
}

func (r *mutationResolver) DeleteFeeStructure(ctx context.Context, id string) (bool, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return false, ErrForbidden
	}
	res := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.FeeStructure{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

func (r *mutationResolver) RecordFeePayment(ctx context.Context, input model.RecordFeePaymentInput) (*model.FeePayment, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" && auth.Role != "staff" {
		return nil, ErrForbidden
	}
	if input.Amount <= 0 {
		return nil, ErrValidation
	}

	payDate := time.Now()
	if input.PaymentDate != nil && *input.PaymentDate != "" {
		payDate, _ = time.Parse("2006-01-02", *input.PaymentDate)
	}

	mode := "cash"
	if input.PaymentMode != nil && *input.PaymentMode != "" {
		mode = *input.PaymentMode
	}

	yearID := ""
	if input.AcademicYearID != nil {
		yearID = *input.AcademicYearID
	}
	if yearID == "" {
		var year models.AcademicYear
		r.DB.WithContext(ctx).Where("tenant_id = ? AND is_current = ?", auth.TenantID, true).First(&year)
		yearID = year.ID
	}

	var count int64
	r.DB.WithContext(ctx).Model(&models.FeePayment{}).Where("tenant_id = ?", auth.TenantID).Count(&count)
	receiptNum := fmt.Sprintf("RCP-%s-%04d", time.Now().Format("20060102"), count+1)

	lateFee := floatVal(input.LateFee)
	payment := models.FeePayment{
		TenantID:       auth.TenantID,
		StudentID:      input.StudentID,
		FeeStructureID: input.FeeStructureID,
		AcademicYearID: yearID,
		Amount:         input.Amount,
		LateFee:        lateFee,
		TotalAmount:    input.Amount + lateFee,
		PaymentDate:    payDate,
		PaymentMode:    mode,
		TransactionRef: strVal(input.TransactionRef),
		Status:         "paid",
		Remarks:        strVal(input.Remarks),
		ReceivedBy:     auth.UserID,
		ReceiptNumber:  receiptNum,
	}
	if err := r.DB.WithContext(ctx).Create(&payment).Error; err != nil {
		return nil, err
	}
	if err := r.DB.WithContext(ctx).Preload("Student").Preload("Student.User").
		Preload("FeeStructure").Preload("FeeStructure.FeeCategory").
		Where("id = ? AND tenant_id = ?", payment.ID, auth.TenantID).First(&payment).Error; err != nil {
		return nil, err
	}
	return feePaymentToModel(payment), nil
}

func (r *mutationResolver) UpdateFeePaymentStatus(ctx context.Context, id string, input model.UpdatePaymentStatusInput) (*model.FeePayment, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" && auth.Role != "staff" {
		return nil, ErrForbidden
	}
	var payment models.FeePayment
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&payment).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	updates := map[string]interface{}{"status": input.Status}
	if input.Remarks != nil {
		updates["remarks"] = *input.Remarks
	}
	if err := r.DB.WithContext(ctx).Model(&payment).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := r.DB.WithContext(ctx).Preload("Student").Preload("Student.User").
		Preload("FeeStructure").Preload("FeeStructure.FeeCategory").
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&payment).Error; err != nil {
		return nil, err
	}
	return feePaymentToModel(payment), nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func feeCategoryToModel(c models.FeeCategory) *model.FeeCategory {
	return &model.FeeCategory{
		ID:          c.ID,
		Name:        c.Name,
		Code:        c.Code,
		Description: toStrPtr(c.Description),
		IsActive:    c.IsActive,
	}
}

func feeStructureToModel(fs models.FeeStructure) *model.FeeStructure {
	m := &model.FeeStructure{
		ID:             fs.ID,
		AcademicYearID: fs.AcademicYearID,
		CourseID:       fs.CourseID,
		FeeCategoryID:  fs.FeeCategoryID,
		SemesterNumber: fs.SemesterNumber,
		Amount:         fs.Amount,
		LateFeePerDay:  fs.LateFeePerDay,
		MaxLateFee:     fs.MaxLateFee,
		IsActive:       fs.IsActive,
	}
	if !fs.DueDate.IsZero() {
		s := fs.DueDate.Format("2006-01-02")
		m.DueDate = &s
	}
	if fs.AcademicYear.ID != "" {
		m.AcademicYear = &model.AcademicYear{
			ID: fs.AcademicYear.ID, Name: fs.AcademicYear.Name,
			StartDate: fs.AcademicYear.StartDate.Format("2006-01-02"),
			EndDate:   fs.AcademicYear.EndDate.Format("2006-01-02"),
			IsCurrent: fs.AcademicYear.IsCurrent,
		}
	}
	if fs.Course.ID != "" {
		m.Course = &model.Course{ID: fs.Course.ID, Name: fs.Course.Name, Code: fs.Course.Code}
	}
	if fs.FeeCategory.ID != "" {
		m.FeeCategory = feeCategoryToModel(fs.FeeCategory)
	}
	return m
}

func feePaymentToModel(p models.FeePayment) *model.FeePayment {
	m := &model.FeePayment{
		ID:             p.ID,
		StudentID:      p.StudentID,
		FeeStructureID: p.FeeStructureID,
		AcademicYearID: p.AcademicYearID,
		Amount:         p.Amount,
		LateFee:        p.LateFee,
		TotalAmount:    p.TotalAmount,
		PaymentDate:    p.PaymentDate.Format("2006-01-02"),
		PaymentMode:    p.PaymentMode,
		TransactionRef: toStrPtr(p.TransactionRef),
		Status:         p.Status,
		Remarks:        toStrPtr(p.Remarks),
		ReceivedBy:     toStrPtr(p.ReceivedBy),
		ReceiptNumber:  p.ReceiptNumber,
	}
	if p.Student.ID != "" {
		m.Student = studentToModel(p.Student)
	}
	if p.FeeStructure.ID != "" {
		m.FeeStructure = feeStructureToModel(p.FeeStructure)
	}
	return m
}
```

**Note:** `studentToModel` is defined in `students.resolvers.go`. `floatVal`, `strVal`, `intVal`, `toStrPtr` — check if already defined before adding duplicates.

- [ ] **Step 2: Remove batch 5 stubs from schema.resolvers.go**

Delete stubs for: `FeeCategories`, `FeeStructures`, `FeePayments`, `MyFeePayments`, `FeeDues`, `FeeCollectionSummary`, `CreateFeeCategory`, `UpdateFeeCategory`, `DeleteFeeCategory`, `CreateFeeStructure`, `UpdateFeeStructure`, `DeleteFeeStructure`, `RecordFeePayment`, `UpdateFeePaymentStatus`.

- [ ] **Step 3: Build**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add backend/graph/fees.resolvers.go backend/graph/schema.resolvers.go
git commit -m "feat(batch5): implement fees resolvers (categories, structures, payments, dues)"
```

---

### Task 3: Frontend GraphQL files for fees

**Files:**
- Create: `frontend/graphql/queries/fees.ts`
- Create: `frontend/graphql/mutations/fees.ts`

- [ ] **Step 1: Create frontend/graphql/queries/fees.ts**

```typescript
import { gql } from "@apollo/client";

export const FEE_STRUCTURE_FIELDS = gql`
  fragment FeeStructureFields on FeeStructure {
    id
    academicYearId
    courseId
    feeCategoryId
    semesterNumber
    amount
    dueDate
    lateFeePerDay
    maxLateFee
    isActive
    academicYear { id name }
    course { id name code }
    feeCategory { id name code }
  }
`;

export const LIST_FEE_CATEGORIES = gql`
  query ListFeeCategories {
    feeCategories {
      id
      name
      code
      description
      isActive
    }
  }
`;

export const LIST_FEE_STRUCTURES = gql`
  query ListFeeStructures($academicYearId: String, $courseId: String) {
    feeStructures(academicYearId: $academicYearId, courseId: $courseId) {
      ...FeeStructureFields
    }
  }
  ${FEE_STRUCTURE_FIELDS}
`;

export const LIST_FEE_PAYMENTS = gql`
  query ListFeePayments($studentId: String, $academicYearId: String, $status: String) {
    feePayments(studentId: $studentId, academicYearId: $academicYearId, status: $status) {
      id
      studentId
      feeStructureId
      academicYearId
      amount
      lateFee
      totalAmount
      paymentDate
      paymentMode
      transactionRef
      status
      remarks
      receivedBy
      receiptNumber
      student { id rollNumber user { id name } }
      feeStructure { id amount feeCategory { id name } }
    }
  }
`;

export const MY_FEE_PAYMENTS = gql`
  query MyFeePayments {
    myFeePayments {
      id
      amount
      lateFee
      totalAmount
      paymentDate
      paymentMode
      status
      receiptNumber
      feeStructure { id amount feeCategory { id name } }
    }
  }
`;

export const FEE_DUES = gql`
  query FeeDues($academicYearId: String, $courseId: String) {
    feeDues(academicYearId: $academicYearId, courseId: $courseId) {
      studentId
      studentName
      rollNumber
      courseName
      categoryName
      feeStructureId
      totalDue
      totalPaid
      outstanding
      dueDate
      isOverdue
    }
  }
`;

export const FEE_COLLECTION_SUMMARY = gql`
  query FeeCollectionSummary($academicYearId: String) {
    feeCollectionSummary(academicYearId: $academicYearId) {
      totalCollected
      paymentCount
      pendingDues
      totalExpected
    }
  }
`;
```

- [ ] **Step 2: Create frontend/graphql/mutations/fees.ts**

```typescript
import { gql } from "@apollo/client";

export const CREATE_FEE_CATEGORY = gql`
  mutation CreateFeeCategory($input: CreateFeeCategoryInput!) {
    createFeeCategory(input: $input) {
      id
      name
      code
      description
      isActive
    }
  }
`;

export const UPDATE_FEE_CATEGORY = gql`
  mutation UpdateFeeCategory($id: ID!, $input: UpdateFeeCategoryInput!) {
    updateFeeCategory(id: $id, input: $input) {
      id
      name
      code
      description
      isActive
    }
  }
`;

export const DELETE_FEE_CATEGORY = gql`
  mutation DeleteFeeCategory($id: ID!) {
    deleteFeeCategory(id: $id)
  }
`;

export const CREATE_FEE_STRUCTURE = gql`
  mutation CreateFeeStructure($input: CreateFeeStructureInput!) {
    createFeeStructure(input: $input) {
      id
      amount
      isActive
      feeCategory { id name }
      course { id name }
      academicYear { id name }
    }
  }
`;

export const UPDATE_FEE_STRUCTURE = gql`
  mutation UpdateFeeStructure($id: ID!, $input: UpdateFeeStructureInput!) {
    updateFeeStructure(id: $id, input: $input) {
      id
      amount
      dueDate
      lateFeePerDay
      maxLateFee
      isActive
    }
  }
`;

export const DELETE_FEE_STRUCTURE = gql`
  mutation DeleteFeeStructure($id: ID!) {
    deleteFeeStructure(id: $id)
  }
`;

export const RECORD_FEE_PAYMENT = gql`
  mutation RecordFeePayment($input: RecordFeePaymentInput!) {
    recordFeePayment(input: $input) {
      id
      receiptNumber
      totalAmount
      status
      paymentDate
    }
  }
`;

export const UPDATE_FEE_PAYMENT_STATUS = gql`
  mutation UpdateFeePaymentStatus($id: ID!, $input: UpdatePaymentStatusInput!) {
    updateFeePaymentStatus(id: $id, input: $input) {
      id
      status
      remarks
    }
  }
`;
```

- [ ] **Step 3: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add frontend/graphql/queries/fees.ts frontend/graphql/mutations/fees.ts
git commit -m "feat(batch5): add fees GraphQL query/mutation documents"
```

---

### Task 4: Frontend — fees/page.tsx migration

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/fees/page.tsx`

The existing page has 4 tabs: payments, structures, dues, categories. Migrate each tab from Redux to Apollo. Keep `useAppSelector(s => s.auth)` for role checks.

Read the existing page at `frontend/app/[tenant]/(dashboard)/fees/page.tsx` first (it is large — read the full file at `/Users/yasharyan/.claude/projects/-Users-yasharyan-Documents-Claude-Projects-Peepal/2c3af479-0d57-4689-8ba8-d01aa929f5f7/tool-results/bvhcetcyv.txt`).

- [ ] **Step 1: Replace Redux imports with Apollo**

Remove: `useAppDispatch`, all `fetch*` and `create*`/`delete*` Redux thunk imports from `feeSlice`, `studentSlice`

Add:
```typescript
import { useQuery, useMutation } from "@apollo/client";
import { LIST_FEE_CATEGORIES, LIST_FEE_STRUCTURES, LIST_FEE_PAYMENTS, MY_FEE_PAYMENTS, FEE_DUES, FEE_COLLECTION_SUMMARY } from "@/graphql/queries/fees";
import { CREATE_FEE_CATEGORY, UPDATE_FEE_CATEGORY, DELETE_FEE_CATEGORY, CREATE_FEE_STRUCTURE, DELETE_FEE_STRUCTURE, RECORD_FEE_PAYMENT, UPDATE_FEE_PAYMENT_STATUS } from "@/graphql/mutations/fees";
import { LIST_STUDENTS } from "@/graphql/queries/students";
import { useAppSelector } from "@/store/hooks";
```

- [ ] **Step 2: Replace Redux state with Apollo queries**

Replace:
```typescript
const { feeCategories, feeStructures, feePayments, myPayments, dues, summary, loading } = useAppSelector(s => s.fee)
const { students } = useAppSelector(s => s.students)
const { user } = useAppSelector(s => s.auth)
```

With:
```typescript
const { user } = useAppSelector(s => s.auth) // auth stays Redux — migrated in Batch 9
const isAdmin = user?.role === 'admin' || user?.role === 'staff'
const isStudent = user?.role === 'student'

const { data: catData, loading: catLoading } = useQuery(LIST_FEE_CATEGORIES)
const { data: structData, loading: structLoading } = useQuery(LIST_FEE_STRUCTURES)
const { data: payData, loading: payLoading } = useQuery(LIST_FEE_PAYMENTS, { skip: !isAdmin })
const { data: myPayData, loading: myPayLoading } = useQuery(MY_FEE_PAYMENTS, { skip: !isStudent })
const { data: duesData, loading: duesLoading } = useQuery(FEE_DUES, { skip: !isAdmin })
const { data: summaryData } = useQuery(FEE_COLLECTION_SUMMARY)
const { data: studentsData } = useQuery(LIST_STUDENTS, { skip: !isAdmin })

const feeCategories = catData?.feeCategories ?? []
const feeStructures = structData?.feeStructures ?? []
const feePayments = isAdmin ? (payData?.feePayments ?? []) : []
const myPayments = isStudent ? (myPayData?.myFeePayments ?? []) : []
const dues = duesData?.feeDues ?? []
const summary = summaryData?.feeCollectionSummary ?? null
const students = studentsData?.students ?? []
const loading = catLoading || structLoading || payLoading || myPayLoading || duesLoading
```

- [ ] **Step 3: Replace Redux dispatch calls with mutations**

Replace all `dispatch(createFeeCategory(...))` with mutation calls. Pattern:

```typescript
const [createFeeCategoryMut] = useMutation(CREATE_FEE_CATEGORY)
const [deleteFeeCategoryMut] = useMutation(DELETE_FEE_CATEGORY)
const [createFeeStructureMut] = useMutation(CREATE_FEE_STRUCTURE)
const [deleteFeeStructureMut] = useMutation(DELETE_FEE_STRUCTURE)
const [recordFeePaymentMut] = useMutation(RECORD_FEE_PAYMENT)
const [updateFeePaymentStatusMut] = useMutation(UPDATE_FEE_PAYMENT_STATUS)
```

For each submit handler, wrap in try/catch and use `refetchQueries` at call site.

Example for category creation:
```typescript
const handleCreateCategory = async (e: React.FormEvent) => {
  e.preventDefault()
  try {
    await createFeeCategoryMut({
      variables: { input: { name: catForm.name, code: catForm.code, description: catForm.description || null } },
      refetchQueries: [{ query: LIST_FEE_CATEGORIES }],
    })
    toast.success('Category created')
    setShowCatModal(false)
  } catch (err: any) {
    toast.error(err?.graphQLErrors?.[0]?.message ?? 'Failed')
  }
}
```

- [ ] **Step 4: Fix field name references throughout the JSX**

Replace all REST snake_case field references with GraphQL camelCase:
- `fs.academic_year_id` → `fs.academicYearId`
- `fs.course_id` → `fs.courseId`
- `fs.fee_category_id` → `fs.feeCategoryId`
- `fs.semester_number` → `fs.semesterNumber`
- `fs.late_fee_per_day` → `fs.lateFeePerDay`
- `fs.max_late_fee` → `fs.maxLateFee`
- `fs.is_active` → `fs.isActive`
- `fs.due_date` → `fs.dueDate`
- `p.student_id` → `p.studentId`
- `p.fee_structure_id` → `p.feeStructureId`
- `p.academic_year_id` → `p.academicYearId`
- `p.late_fee` → `p.lateFee`
- `p.total_amount` → `p.totalAmount`
- `p.payment_date` → `p.paymentDate`
- `p.payment_mode` → `p.paymentMode`
- `p.transaction_ref` → `p.transactionRef`
- `p.receipt_number` → `p.receiptNumber`
- `d.student_id` → `d.studentId`
- `d.student_name` → `d.studentName`
- `d.roll_number` → `d.rollNumber`
- `d.course_name` → `d.courseName`
- `d.category_name` → `d.categoryName`
- `d.fee_structure_id` → `d.feeStructureId`
- `d.total_due` → `d.totalDue`
- `d.total_paid` → `d.totalPaid`
- `d.due_date` → `d.dueDate`
- `d.is_overdue` → `d.isOverdue`
- `summary.total_collected` → `summary.totalCollected`
- `summary.payment_count` → `summary.paymentCount`
- `summary.pending_dues` → `summary.pendingDues`
- `summary.total_expected` → `summary.totalExpected`
- `s.roll_number` → `s.rollNumber` (on student objects)

- [ ] **Step 5: Remove useEffect and dispatch calls entirely**

Delete all `useEffect` blocks that called dispatch. Apollo queries auto-fetch on mount.

- [ ] **Step 6: Build check**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/frontend && npx tsc --noEmit 2>&1 | head -30
```

Fix any TypeScript errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/fees/page.tsx"
git commit -m "feat(batch5): migrate fees/page to Apollo GraphQL"
```
