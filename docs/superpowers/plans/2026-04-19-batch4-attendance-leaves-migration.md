# Batch 4: Attendance + Leaves + Leave Types + Leave Balances Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GraphQL types/queries/mutations for attendance and leaves; migrate five frontend pages from Redux/REST to Apollo/GraphQL.

**Architecture:** Schema-first gqlgen on backend. Each domain gets its own resolver file. Frontend swaps Redux slice dispatches for `useQuery`/`useMutation`. `attendance/export/page.tsx` stays REST (CSV binary response — not suitable for GraphQL).

**Tech Stack:** Go/gqlgen/GORM (backend), Next.js/Apollo Client/TypeScript (frontend)

---

## Critical Context

### gqlgen setup
- Schema file: `backend/graph/schema.graphqls`
- After editing schema run: `cd backend && go generate ./...`
- New stubs appear in `backend/graph/schema.resolvers.go` — move implementation to domain file, then delete stub from schema.resolvers.go (duplicate function = compile error)
- gqlgen naming: `isPublished` → `IsPublished` in Go, `published` in GraphQL field

### Auth context
```go
auth := AuthFromCtx(ctx)
// auth.TenantID, auth.UserID, auth.Role
```

### Sentinel errors
```go
ErrNotFound    // returns NOT_FOUND
ErrForbidden   // returns FORBIDDEN  
ErrValidation  // returns VALIDATION_ERROR
```

### Existing helper
```go
// backend/graph/helpers.go
func toIntPtr(n int) *int  // returns nil for zero value
```

### Apollo pattern
```typescript
const { data, loading } = useQuery(QUERY, { variables: {...} })
const [mutate] = useMutation(MUTATION)
// refetchQueries passed at call site, not hook definition
```

### Auth stays Redux
```typescript
const user = useAppSelector(s => s.auth.user) // keep for role checks
```

### Key GORM model facts
- `models.Attendance`: EntityID, EntityType ("student"|"employee"), Date (time.Time), Status (AttendanceStatus), MarkedBy, Remarks, SubjectID
- `models.Leave`: ApplicantID (user.id), LeaveType (string name), LeaveTypeID (FK to LeaveTypeConfig.ID), FromDate/ToDate (time.Time), Status (LeavePending/LeaveApproved/LeaveRejected), ReviewedBy, ReviewNote; has `Applicant User` preload
- `models.LeaveTypeConfig`: Name, Code, DaysPerYear, CarryForward, MaxCarryForward, ApplicableTo ("all"|"employee"|"student"), IsActive
- `models.LeaveBalance`: UserID, LeaveTypeID, Year (int), Total/Used/Pending (float64); has `LeaveType LeaveTypeConfig` and `User User` preloads

### workingDaysBetween helper
Already exists in `backend/handlers/leave_types.go`. **Do NOT redeclare in resolver.** Calculate inline or copy logic into resolver file without the function name.

### String pointer helpers
```go
func toStrPtr(s string) *string { if s == "" { return nil }; p := s; return &p }
```
Check if `toStrPtr` exists in helpers.go before adding. If it does, reuse it.

### Frontend field mapping (REST → GraphQL)
- `r.entity_id` → `r.entityId`
- `r.entity_type` → `r.entityType`
- `r.attendance_pct` → `r.attendancePct`
- `s.roll_number` → `s.rollNumber`
- `l.from_date` → `l.fromDate`
- `l.to_date` → `l.toDate`
- `l.leave_type` → `l.leaveType`
- `l.leave_type_id` → `l.leaveTypeId`
- `l.review_note` → `l.reviewNote`
- `lt.days_per_year` → `lt.daysPerYear`
- `lt.carry_forward` → `lt.carryForward`
- `lt.max_carry_forward` → `lt.maxCarryForward`
- `lt.applicable_to` → `lt.applicableTo`
- `lt.is_active` → `lt.isActive`
- `b.leave_type_id` → `b.leaveTypeId`
- `b.leave_type?.name` → `b.leaveType?.name`

---

## File Structure

**Create:**
- `backend/graph/attendance.resolvers.go` — Attendance + Leave + LeaveType + LeaveBalance resolvers
- `frontend/graphql/queries/attendance.ts` — LIST_ATTENDANCE, ATTENDANCE_SUMMARY, ATTENDANCE_SHORTAGE
- `frontend/graphql/mutations/attendance.ts` — MARK_ATTENDANCE, BULK_MARK_ATTENDANCE
- `frontend/graphql/queries/leaves.ts` — LIST_LEAVES, LIST_LEAVE_TYPES, MY_LEAVE_BALANCE, LIST_LEAVE_BALANCES
- `frontend/graphql/mutations/leaves.ts` — APPLY_LEAVE, REVIEW_LEAVE, CREATE_LEAVE_TYPE, UPDATE_LEAVE_TYPE, DELETE_LEAVE_TYPE

**Modify:**
- `backend/graph/schema.graphqls` — add Attendance, Leave, LeaveType, LeaveBalance types + queries + mutations
- `backend/graph/schema.resolvers.go` — remove stubs after implementing in domain file
- `frontend/app/[tenant]/(dashboard)/attendance/page.tsx`
- `frontend/app/[tenant]/(dashboard)/attendance/summary/page.tsx`
- `frontend/app/[tenant]/(dashboard)/attendance/shortage/page.tsx`
- `frontend/app/[tenant]/(dashboard)/leaves/page.tsx`
- `frontend/app/[tenant]/(dashboard)/leave-types/page.tsx`

**Leave unchanged:**
- `frontend/app/[tenant]/(dashboard)/attendance/export/page.tsx` — stays REST (CSV binary)

---

### Task 1: Schema additions for Attendance + Leaves

**Files:**
- Modify: `backend/graph/schema.graphqls`

- [ ] **Step 1: Add types to schema.graphqls**

Append after the last existing type block:

```graphql
type AttendanceRecord {
  id: ID!
  entityId: String!
  entityType: String!
  date: String!
  status: String!
  markedBy: String
  remarks: String
  subjectId: String
}

type AttendanceSummaryRow {
  entityId: String!
  total: Int!
  present: Int!
  absent: Int!
  late: Int!
  attendancePct: Float!
}

type ShortageStudent {
  student: Student!
  total: Int!
  present: Int!
  attendancePct: Float!
}

type ShortageList {
  threshold: Float!
  students: [ShortageStudent!]!
  count: Int!
}

type LeaveRecord {
  id: ID!
  applicantId: String!
  leaveType: String!
  leaveTypeId: String
  fromDate: String!
  toDate: String!
  reason: String!
  status: String!
  reviewedBy: String
  reviewNote: String
  applicant: User
}

type LeaveTypeConfig {
  id: ID!
  name: String!
  code: String!
  daysPerYear: Int!
  carryForward: Boolean!
  maxCarryForward: Int!
  applicableTo: String!
  isActive: Boolean!
}

type LeaveBalance {
  id: ID!
  userId: String!
  leaveTypeId: String!
  year: Int!
  total: Float!
  used: Float!
  pending: Float!
  leaveType: LeaveTypeConfig
}

input MarkAttendanceInput {
  entityId: String!
  entityType: String!
  date: String!
  status: String!
  remarks: String
  subjectId: String
}

input ApplyLeaveInput {
  leaveType: String!
  leaveTypeId: String
  fromDate: String!
  toDate: String!
  reason: String!
}

input ReviewLeaveInput {
  status: String!
  reviewNote: String
}

input CreateLeaveTypeInput {
  name: String!
  code: String!
  daysPerYear: Int
  carryForward: Boolean
  maxCarryForward: Int
  applicableTo: String
}

input UpdateLeaveTypeInput {
  name: String
  daysPerYear: Int
  carryForward: Boolean
  maxCarryForward: Int
  applicableTo: String
}
```

- [ ] **Step 2: Add queries and mutations**

In the `Query` type block, add:
```graphql
  attendance(entityId: String, entityType: String, subjectId: String, date: String): [AttendanceRecord!]!
  attendanceSummary(entityType: String): [AttendanceSummaryRow!]!
  attendanceShortage: ShortageList!
  leaves(status: String): [LeaveRecord!]!
  leaveTypes: [LeaveTypeConfig!]!
  myLeaveBalance: [LeaveBalance!]!
  leaveBalances(year: Int, userId: String): [LeaveBalance!]!
```

In the `Mutation` type block, add:
```graphql
  markAttendance(input: MarkAttendanceInput!): AttendanceRecord!
  bulkMarkAttendance(inputs: [MarkAttendanceInput!]!): [AttendanceRecord!]!
  applyLeave(input: ApplyLeaveInput!): LeaveRecord!
  reviewLeave(id: ID!, input: ReviewLeaveInput!): LeaveRecord!
  createLeaveType(input: CreateLeaveTypeInput!): LeaveTypeConfig!
  updateLeaveType(id: ID!, input: UpdateLeaveTypeInput!): LeaveTypeConfig!
  deleteLeaveType(id: ID!): Boolean!
```

- [ ] **Step 3: Run gqlgen to generate stubs**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go generate ./...
```

Expected: new stub functions appear in `schema.resolvers.go` for all the new queries/mutations.

- [ ] **Step 4: Verify build**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go build ./...
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add backend/graph/schema.graphqls backend/graph/schema.resolvers.go backend/graph/model/models_gen.go
git commit -m "feat(batch4): add attendance+leaves GraphQL schema types and generated stubs"
```

---

### Task 2: Backend — attendance.resolvers.go

**Files:**
- Create: `backend/graph/attendance.resolvers.go`
- Modify: `backend/graph/schema.resolvers.go` (remove stubs for batch 4 resolvers)

- [ ] **Step 1: Create backend/graph/attendance.resolvers.go**

```go
package graph

import (
	"context"
	"errors"
	"math"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// ─── Queries ──────────────────────────────────────────────────────────────────

func (r *queryResolver) Attendance(ctx context.Context, entityID *string, entityType *string, subjectID *string, date *string) ([]*model.AttendanceRecord, error) {
	auth := AuthFromCtx(ctx)
	q := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID)
	if entityID != nil {
		q = q.Where("entity_id = ?", *entityID)
	}
	if entityType != nil {
		q = q.Where("entity_type = ?", *entityType)
	}
	if subjectID != nil {
		q = q.Where("subject_id = ?", *subjectID)
	}
	if date != nil {
		q = q.Where("date = ?", *date)
	}
	var records []models.Attendance
	if err := q.Order("date desc").Find(&records).Error; err != nil {
		return nil, err
	}
	out := make([]*model.AttendanceRecord, len(records))
	for i, a := range records {
		out[i] = attendanceToModel(a)
	}
	return out, nil
}

func (r *queryResolver) AttendanceSummary(ctx context.Context, entityType *string) ([]*model.AttendanceSummaryRow, error) {
	auth := AuthFromCtx(ctx)
	et := "student"
	if entityType != nil && *entityType != "" {
		et = *entityType
	}

	var entityIDs []string
	if err := r.DB.WithContext(ctx).Model(&models.Attendance{}).
		Where("tenant_id = ? AND entity_type = ?", auth.TenantID, et).
		Distinct("entity_id").
		Pluck("entity_id", &entityIDs).Error; err != nil {
		return nil, err
	}

	out := make([]*model.AttendanceSummaryRow, 0, len(entityIDs))
	for _, eid := range entityIDs {
		base := r.DB.WithContext(ctx).Model(&models.Attendance{}).
			Where("tenant_id = ? AND entity_type = ? AND entity_id = ?", auth.TenantID, et, eid)

		var total, present, absent, late int64
		base.Count(&total)
		base.Where("status = ?", "present").Count(&present)
		base.Where("status = ?", "absent").Count(&absent)
		base.Where("status = ?", "late").Count(&late)

		pct := 0.0
		if total > 0 {
			pct = float64(present+late) / float64(total) * 100
		}
		out = append(out, &model.AttendanceSummaryRow{
			EntityID:      eid,
			Total:         int(total),
			Present:       int(present),
			Absent:        int(absent),
			Late:          int(late),
			AttendancePct: pct,
		})
	}
	return out, nil
}

func (r *queryResolver) AttendanceShortage(ctx context.Context) (*model.ShortageList, error) {
	auth := AuthFromCtx(ctx)

	var settings models.AttendanceSettings
	threshold := 75.0
	if err := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID).First(&settings).Error; err == nil {
		threshold = settings.MinAttendancePct
	}

	var students []models.Student
	if err := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID).
		Preload("User").Preload("Course").Find(&students).Error; err != nil {
		return nil, err
	}

	var shortageItems []*model.ShortageStudent
	for _, s := range students {
		var total, present int64
		r.DB.WithContext(ctx).Model(&models.Attendance{}).
			Where("tenant_id = ? AND entity_id = ? AND entity_type = 'student'", auth.TenantID, s.ID).
			Count(&total)
		r.DB.WithContext(ctx).Model(&models.Attendance{}).
			Where("tenant_id = ? AND entity_id = ? AND entity_type = 'student' AND status IN ?", auth.TenantID, s.ID, []string{"present", "late"}).
			Count(&present)

		if total == 0 {
			continue
		}
		pct := float64(present) / float64(total) * 100
		if pct < threshold {
			shortageItems = append(shortageItems, &model.ShortageStudent{
				Student:       studentToModel(s),
				Total:         int(total),
				Present:       int(present),
				AttendancePct: pct,
			})
		}
	}
	if shortageItems == nil {
		shortageItems = []*model.ShortageStudent{}
	}
	return &model.ShortageList{
		Threshold: threshold,
		Students:  shortageItems,
		Count:     len(shortageItems),
	}, nil
}

func (r *queryResolver) Leaves(ctx context.Context, status *string) ([]*model.LeaveRecord, error) {
	auth := AuthFromCtx(ctx)
	q := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID).Preload("Applicant")
	if auth.Role != "admin" {
		q = q.Where("applicant_id = ?", auth.UserID)
	}
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	var leaves []models.Leave
	if err := q.Order("created_at desc").Find(&leaves).Error; err != nil {
		return nil, err
	}
	out := make([]*model.LeaveRecord, len(leaves))
	for i, l := range leaves {
		out[i] = leaveToModel(l)
	}
	return out, nil
}

func (r *queryResolver) LeaveTypes(ctx context.Context) ([]*model.LeaveTypeConfig, error) {
	auth := AuthFromCtx(ctx)
	var types []models.LeaveTypeConfig
	if err := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID).Order("name asc").Find(&types).Error; err != nil {
		return nil, err
	}
	if len(types) == 0 {
		return []*model.LeaveTypeConfig{
			{ID: "CL", Name: "Casual Leave", Code: "CL", DaysPerYear: 12, CarryForward: false, MaxCarryForward: 0, ApplicableTo: "all", IsActive: true},
			{ID: "SL", Name: "Sick Leave", Code: "SL", DaysPerYear: 12, CarryForward: false, MaxCarryForward: 0, ApplicableTo: "all", IsActive: true},
			{ID: "EL", Name: "Earned Leave", Code: "EL", DaysPerYear: 24, CarryForward: true, MaxCarryForward: 30, ApplicableTo: "all", IsActive: true},
		}, nil
	}
	out := make([]*model.LeaveTypeConfig, len(types))
	for i, lt := range types {
		out[i] = leaveTypeToModel(lt)
	}
	return out, nil
}

func (r *queryResolver) MyLeaveBalance(ctx context.Context) ([]*model.LeaveBalance, error) {
	auth := AuthFromCtx(ctx)
	year := time.Now().Year()

	var balances []models.LeaveBalance
	if err := r.DB.WithContext(ctx).Where("tenant_id = ? AND user_id = ? AND year = ?", auth.TenantID, auth.UserID, year).
		Preload("LeaveType").Find(&balances).Error; err != nil {
		return nil, err
	}

	if len(balances) == 0 {
		var types []models.LeaveTypeConfig
		r.DB.WithContext(ctx).Where("tenant_id = ? AND is_active = ?", auth.TenantID, true).Find(&types)
		for _, lt := range types {
			b := models.LeaveBalance{
				TenantID:    auth.TenantID,
				UserID:      auth.UserID,
				LeaveTypeID: lt.ID,
				Year:        year,
				Total:       float64(lt.DaysPerYear),
			}
			r.DB.WithContext(ctx).Create(&b)
			b.LeaveType = lt
			balances = append(balances, b)
		}
	}

	out := make([]*model.LeaveBalance, len(balances))
	for i, b := range balances {
		out[i] = leaveBalanceToModel(b)
	}
	return out, nil
}

func (r *queryResolver) LeaveBalances(ctx context.Context, year *int, userID *string) ([]*model.LeaveBalance, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
	}
	y := time.Now().Year()
	if year != nil {
		y = *year
	}
	q := r.DB.WithContext(ctx).Where("tenant_id = ? AND year = ?", auth.TenantID, y).
		Preload("User").Preload("LeaveType")
	if userID != nil && *userID != "" {
		q = q.Where("user_id = ?", *userID)
	}
	var balances []models.LeaveBalance
	if err := q.Find(&balances).Error; err != nil {
		return nil, err
	}
	out := make([]*model.LeaveBalance, len(balances))
	for i, b := range balances {
		out[i] = leaveBalanceToModel(b)
	}
	return out, nil
}

// ─── Mutations ────────────────────────────────────────────────────────────────

func (r *mutationResolver) MarkAttendance(ctx context.Context, input model.MarkAttendanceInput) (*model.AttendanceRecord, error) {
	auth := AuthFromCtx(ctx)
	date, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		return nil, ErrValidation
	}
	a := models.Attendance{
		TenantID:   auth.TenantID,
		EntityID:   input.EntityID,
		EntityType: input.EntityType,
		Date:       date,
		Status:     models.AttendanceStatus(input.Status),
		MarkedBy:   auth.UserID,
		SubjectID:  strVal(input.SubjectID),
		Remarks:    strVal(input.Remarks),
	}
	if err := r.DB.WithContext(ctx).Create(&a).Error; err != nil {
		return nil, err
	}
	return attendanceToModel(a), nil
}

func (r *mutationResolver) BulkMarkAttendance(ctx context.Context, inputs []*model.MarkAttendanceInput) ([]*model.AttendanceRecord, error) {
	auth := AuthFromCtx(ctx)
	records := make([]models.Attendance, 0, len(inputs))
	for _, inp := range inputs {
		date, _ := time.Parse("2006-01-02", inp.Date)
		records = append(records, models.Attendance{
			TenantID:   auth.TenantID,
			EntityID:   inp.EntityID,
			EntityType: inp.EntityType,
			Date:       date,
			Status:     models.AttendanceStatus(inp.Status),
			MarkedBy:   auth.UserID,
			SubjectID:  strVal(inp.SubjectID),
			Remarks:    strVal(inp.Remarks),
		})
	}
	if err := r.DB.WithContext(ctx).Create(&records).Error; err != nil {
		return nil, err
	}
	out := make([]*model.AttendanceRecord, len(records))
	for i, a := range records {
		out[i] = attendanceToModel(a)
	}
	return out, nil
}

func (r *mutationResolver) ApplyLeave(ctx context.Context, input model.ApplyLeaveInput) (*model.LeaveRecord, error) {
	auth := AuthFromCtx(ctx)
	from, err := time.Parse("2006-01-02", input.FromDate)
	if err != nil {
		return nil, ErrValidation
	}
	to, err := time.Parse("2006-01-02", input.ToDate)
	if err != nil {
		return nil, ErrValidation
	}

	days := workingDaysBetweenDates(from, to)

	if input.LeaveTypeID != nil && *input.LeaveTypeID != "" {
		var bal models.LeaveBalance
		year := from.Year()
		if err := r.DB.WithContext(ctx).Where("tenant_id = ? AND user_id = ? AND leave_type_id = ? AND year = ?",
			auth.TenantID, auth.UserID, *input.LeaveTypeID, year).First(&bal).Error; err == nil {
			remaining := bal.Total - bal.Used - bal.Pending
			if remaining < days {
				return nil, ErrValidation
			}
			bal.Pending += days
			if err := r.DB.WithContext(ctx).Save(&bal).Error; err != nil {
				return nil, err
			}
		}
	}

	leave := models.Leave{
		TenantID:    auth.TenantID,
		ApplicantID: auth.UserID,
		LeaveType:   input.LeaveType,
		FromDate:    from,
		ToDate:      to,
		Reason:      input.Reason,
		Status:      models.LeavePending,
	}
	if input.LeaveTypeID != nil {
		leave.LeaveTypeID = *input.LeaveTypeID
	}
	if err := r.DB.WithContext(ctx).Create(&leave).Error; err != nil {
		return nil, err
	}
	if err := r.DB.WithContext(ctx).Preload("Applicant").
		Where("id = ? AND tenant_id = ?", leave.ID, auth.TenantID).First(&leave).Error; err != nil {
		return nil, err
	}
	return leaveToModel(leave), nil
}

func (r *mutationResolver) ReviewLeave(ctx context.Context, id string, input model.ReviewLeaveInput) (*model.LeaveRecord, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
	}
	var leave models.Leave
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&leave).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if input.Status != string(models.LeaveApproved) && input.Status != string(models.LeaveRejected) {
		return nil, ErrValidation
	}

	oldStatus := leave.Status
	leave.Status = models.LeaveStatus(input.Status)
	leave.ReviewedBy = auth.UserID
	if input.ReviewNote != nil {
		leave.ReviewNote = *input.ReviewNote
	}
	if err := r.DB.WithContext(ctx).Save(&leave).Error; err != nil {
		return nil, err
	}

	if leave.LeaveTypeID != "" && oldStatus == models.LeavePending {
		days := workingDaysBetweenDates(leave.FromDate, leave.ToDate)
		year := leave.FromDate.Year()
		var bal models.LeaveBalance
		if err := r.DB.WithContext(ctx).Where("tenant_id = ? AND user_id = ? AND leave_type_id = ? AND year = ?",
			auth.TenantID, leave.ApplicantID, leave.LeaveTypeID, year).First(&bal).Error; err == nil {
			if input.Status == string(models.LeaveApproved) {
				bal.Pending -= days
				bal.Used += days
			} else {
				bal.Pending -= days
			}
			if bal.Pending < 0 {
				bal.Pending = 0
			}
			r.DB.WithContext(ctx).Save(&bal)
		}
	}

	if err := r.DB.WithContext(ctx).Preload("Applicant").
		Where("id = ? AND tenant_id = ?", leave.ID, auth.TenantID).First(&leave).Error; err != nil {
		return nil, err
	}
	return leaveToModel(leave), nil
}

func (r *mutationResolver) CreateLeaveType(ctx context.Context, input model.CreateLeaveTypeInput) (*model.LeaveTypeConfig, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
	}
	applicable := "all"
	if input.ApplicableTo != nil {
		applicable = *input.ApplicableTo
	}
	lt := models.LeaveTypeConfig{
		TenantID:        auth.TenantID,
		Name:            input.Name,
		Code:            input.Code,
		DaysPerYear:     intVal(input.DaysPerYear),
		CarryForward:    boolVal(input.CarryForward),
		MaxCarryForward: intVal(input.MaxCarryForward),
		ApplicableTo:    applicable,
	}
	if err := r.DB.WithContext(ctx).Create(&lt).Error; err != nil {
		return nil, ErrValidation
	}
	return leaveTypeToModel(lt), nil
}

func (r *mutationResolver) UpdateLeaveType(ctx context.Context, id string, input model.UpdateLeaveTypeInput) (*model.LeaveTypeConfig, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
	}
	var lt models.LeaveTypeConfig
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&lt).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	updates := map[string]interface{}{}
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.DaysPerYear != nil {
		updates["days_per_year"] = *input.DaysPerYear
	}
	if input.CarryForward != nil {
		updates["carry_forward"] = *input.CarryForward
	}
	if input.MaxCarryForward != nil {
		updates["max_carry_forward"] = *input.MaxCarryForward
	}
	if input.ApplicableTo != nil {
		updates["applicable_to"] = *input.ApplicableTo
	}
	if len(updates) > 0 {
		if err := r.DB.WithContext(ctx).Model(&lt).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&lt).Error; err != nil {
		return nil, err
	}
	return leaveTypeToModel(lt), nil
}

func (r *mutationResolver) DeleteLeaveType(ctx context.Context, id string) (bool, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return false, ErrForbidden
	}
	res := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.LeaveTypeConfig{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func attendanceToModel(a models.Attendance) *model.AttendanceRecord {
	return &model.AttendanceRecord{
		ID:         a.ID,
		EntityID:   a.EntityID,
		EntityType: a.EntityType,
		Date:       a.Date.Format("2006-01-02"),
		Status:     string(a.Status),
		MarkedBy:   toStrPtr(a.MarkedBy),
		Remarks:    toStrPtr(a.Remarks),
		SubjectID:  toStrPtr(a.SubjectID),
	}
}

func leaveToModel(l models.Leave) *model.LeaveRecord {
	m := &model.LeaveRecord{
		ID:          l.ID,
		ApplicantID: l.ApplicantID,
		LeaveType:   l.LeaveType,
		LeaveTypeID: toStrPtr(l.LeaveTypeID),
		FromDate:    l.FromDate.Format("2006-01-02"),
		ToDate:      l.ToDate.Format("2006-01-02"),
		Reason:      l.Reason,
		Status:      string(l.Status),
		ReviewedBy:  toStrPtr(l.ReviewedBy),
		ReviewNote:  toStrPtr(l.ReviewNote),
	}
	if l.Applicant.ID != "" {
		m.Applicant = &model.User{
			ID:       l.Applicant.ID,
			Email:    l.Applicant.Email,
			Name:     l.Applicant.Name,
			Role:     string(l.Applicant.Role),
			IsActive: l.Applicant.IsActive,
		}
	}
	return m
}

func leaveTypeToModel(lt models.LeaveTypeConfig) *model.LeaveTypeConfig {
	return &model.LeaveTypeConfig{
		ID:              lt.ID,
		Name:            lt.Name,
		Code:            lt.Code,
		DaysPerYear:     lt.DaysPerYear,
		CarryForward:    lt.CarryForward,
		MaxCarryForward: lt.MaxCarryForward,
		ApplicableTo:    lt.ApplicableTo,
		IsActive:        lt.IsActive,
	}
}

func leaveBalanceToModel(b models.LeaveBalance) *model.LeaveBalance {
	m := &model.LeaveBalance{
		ID:          b.ID,
		UserID:      b.UserID,
		LeaveTypeID: b.LeaveTypeID,
		Year:        b.Year,
		Total:       b.Total,
		Used:        b.Used,
		Pending:     b.Pending,
	}
	if b.LeaveType.ID != "" {
		m.LeaveType = leaveTypeToModel(b.LeaveType)
	}
	return m
}

// workingDaysBetweenDates counts working days (Mon–Fri), minimum 1.
func workingDaysBetweenDates(from, to time.Time) float64 {
	days := 0.0
	curr := from
	for !curr.After(to) {
		if curr.Weekday() != time.Saturday && curr.Weekday() != time.Sunday {
			days++
		}
		curr = curr.AddDate(0, 0, 1)
	}
	return math.Max(days, 1)
}

func intVal(n *int) int {
	if n == nil {
		return 0
	}
	return *n
}

func boolVal(b *bool) bool {
	if b == nil {
		return false
	}
	return *b
}

func strVal(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
```

**Note on `toStrPtr`:** Before compiling, check if `toStrPtr` is already defined in `helpers.go`. If yes, remove the local definition. If not, add it:
```go
func toStrPtr(s string) *string {
	if s == "" {
		return nil
	}
	p := s
	return &p
}
```

Also check if `strVal`, `intVal`, `boolVal` are already defined elsewhere. If so, remove duplicates.

- [ ] **Step 2: Remove batch 4 stubs from schema.resolvers.go**

Delete the stub functions for: `Attendance`, `AttendanceSummary`, `AttendanceShortage`, `Leaves`, `LeaveTypes`, `MyLeaveBalance`, `LeaveBalances`, `MarkAttendance`, `BulkMarkAttendance`, `ApplyLeave`, `ReviewLeave`, `CreateLeaveType`, `UpdateLeaveType`, `DeleteLeaveType` from `schema.resolvers.go`.

- [ ] **Step 3: Build**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go build ./...
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add backend/graph/attendance.resolvers.go backend/graph/schema.resolvers.go
git commit -m "feat(batch4): implement attendance+leaves+leave-types resolvers"
```

---

### Task 3: Frontend GraphQL files — attendance + leaves

**Files:**
- Create: `frontend/graphql/queries/attendance.ts`
- Create: `frontend/graphql/mutations/attendance.ts`
- Create: `frontend/graphql/queries/leaves.ts`
- Create: `frontend/graphql/mutations/leaves.ts`

- [ ] **Step 1: Create frontend/graphql/queries/attendance.ts**

```typescript
import { gql } from "@apollo/client";

export const LIST_ATTENDANCE = gql`
  query ListAttendance($entityId: String, $entityType: String, $subjectId: String, $date: String) {
    attendance(entityId: $entityId, entityType: $entityType, subjectId: $subjectId, date: $date) {
      id
      entityId
      entityType
      date
      status
      markedBy
      remarks
      subjectId
    }
  }
`;

export const ATTENDANCE_SUMMARY = gql`
  query AttendanceSummary($entityType: String) {
    attendanceSummary(entityType: $entityType) {
      entityId
      total
      present
      absent
      late
      attendancePct
    }
  }
`;

export const ATTENDANCE_SHORTAGE = gql`
  query AttendanceShortage {
    attendanceShortage {
      threshold
      count
      students {
        total
        present
        attendancePct
        student {
          id
          rollNumber
          user { id name }
          course { id name }
        }
      }
    }
  }
`;
```

- [ ] **Step 2: Create frontend/graphql/mutations/attendance.ts**

```typescript
import { gql } from "@apollo/client";

export const MARK_ATTENDANCE = gql`
  mutation MarkAttendance($input: MarkAttendanceInput!) {
    markAttendance(input: $input) {
      id
      entityId
      entityType
      date
      status
      remarks
    }
  }
`;

export const BULK_MARK_ATTENDANCE = gql`
  mutation BulkMarkAttendance($inputs: [MarkAttendanceInput!]!) {
    bulkMarkAttendance(inputs: $inputs) {
      id
      entityId
      entityType
      date
      status
    }
  }
`;
```

- [ ] **Step 3: Create frontend/graphql/queries/leaves.ts**

```typescript
import { gql } from "@apollo/client";

export const LIST_LEAVES = gql`
  query ListLeaves($status: String) {
    leaves(status: $status) {
      id
      applicantId
      leaveType
      leaveTypeId
      fromDate
      toDate
      reason
      status
      reviewedBy
      reviewNote
      applicant { id name email role isActive }
    }
  }
`;

export const LIST_LEAVE_TYPES = gql`
  query ListLeaveTypes {
    leaveTypes {
      id
      name
      code
      daysPerYear
      carryForward
      maxCarryForward
      applicableTo
      isActive
    }
  }
`;

export const MY_LEAVE_BALANCE = gql`
  query MyLeaveBalance {
    myLeaveBalance {
      id
      userId
      leaveTypeId
      year
      total
      used
      pending
      leaveType { id name code daysPerYear carryForward maxCarryForward applicableTo isActive }
    }
  }
`;

export const LIST_LEAVE_BALANCES = gql`
  query ListLeaveBalances($year: Int, $userId: String) {
    leaveBalances(year: $year, userId: $userId) {
      id
      userId
      leaveTypeId
      year
      total
      used
      pending
      leaveType { id name code }
    }
  }
`;
```

- [ ] **Step 4: Create frontend/graphql/mutations/leaves.ts**

```typescript
import { gql } from "@apollo/client";

export const APPLY_LEAVE = gql`
  mutation ApplyLeave($input: ApplyLeaveInput!) {
    applyLeave(input: $input) {
      id
      leaveType
      fromDate
      toDate
      reason
      status
    }
  }
`;

export const REVIEW_LEAVE = gql`
  mutation ReviewLeave($id: ID!, $input: ReviewLeaveInput!) {
    reviewLeave(id: $id, input: $input) {
      id
      status
      reviewNote
      reviewedBy
    }
  }
`;

export const CREATE_LEAVE_TYPE = gql`
  mutation CreateLeaveType($input: CreateLeaveTypeInput!) {
    createLeaveType(input: $input) {
      id
      name
      code
      daysPerYear
      carryForward
      maxCarryForward
      applicableTo
      isActive
    }
  }
`;

export const UPDATE_LEAVE_TYPE = gql`
  mutation UpdateLeaveType($id: ID!, $input: UpdateLeaveTypeInput!) {
    updateLeaveType(id: $id, input: $input) {
      id
      name
      code
      daysPerYear
      carryForward
      maxCarryForward
      applicableTo
      isActive
    }
  }
`;

export const DELETE_LEAVE_TYPE = gql`
  mutation DeleteLeaveType($id: ID!) {
    deleteLeaveType(id: $id)
  }
`;
```

- [ ] **Step 5: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add frontend/graphql/queries/attendance.ts frontend/graphql/mutations/attendance.ts frontend/graphql/queries/leaves.ts frontend/graphql/mutations/leaves.ts
git commit -m "feat(batch4): add attendance+leaves GraphQL query/mutation documents"
```

---

### Task 4: Frontend — attendance/page.tsx migration

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/attendance/page.tsx`

Replace Redux with Apollo. Remove: `useAppDispatch`, `fetchAttendance`, `markAttendance` from `attendanceSlice`. Keep `useAppSelector` for auth role check only (not needed here since all roles can see attendance).

- [ ] **Step 1: Rewrite attendance/page.tsx**

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { LIST_ATTENDANCE } from "@/graphql/queries/attendance";
import { MARK_ATTENDANCE } from "@/graphql/mutations/attendance";
import { LIST_STUDENTS } from "@/graphql/queries/students";
import { LIST_EMPLOYEES } from "@/graphql/queries/employees";
import Header from "@/components/layout/Header";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";

const statusVariant: Record<string, "green" | "red" | "yellow"> = {
  present: "green", absent: "red", late: "yellow",
};

export default function AttendancePage() {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState<"student" | "employee">("student");
  const [form, setForm] = useState({
    entity_id: "", date: new Date().toISOString().slice(0, 10),
    status: "present", remarks: "",
  });

  const { data, loading, refetch } = useQuery(LIST_ATTENDANCE);
  const { data: studentsData } = useQuery(LIST_STUDENTS);
  const { data: employeesData } = useQuery(LIST_EMPLOYEES);
  const [markAttendanceMut] = useMutation(MARK_ATTENDANCE);

  const records = data?.attendance ?? [];
  const students = studentsData?.students ?? [];
  const employees = employeesData?.employees ?? [];

  const entityList = entityType === "student"
    ? students.map((s: any) => ({ id: s.id, label: `${s.user?.name} (${s.rollNumber})` }))
    : employees.map((e: any) => ({ id: e.id, label: `${e.user?.name} — ${e.designation}` }));

  const handleMark = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await markAttendanceMut({
        variables: {
          input: {
            entityId: form.entity_id,
            entityType,
            date: form.date,
            status: form.status,
            remarks: form.remarks || null,
          },
        },
        refetchQueries: [{ query: LIST_ATTENDANCE }],
      });
      toast.success("Attendance marked");
      setShowModal(false);
      setForm({ entity_id: "", date: new Date().toISOString().slice(0, 10), status: "present", remarks: "" });
    } catch {
      toast.error("Failed to mark attendance");
    }
  };

  const filtered = search
    ? records.filter((r: any) => [r.date, r.status, r.remarks, r.entityType].some((v: any) => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
    : records;

  return (
    <div>
      <Header
        title="Attendance"
        subtitle="Track daily attendance for students and employees"
        action={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Mark Attendance
          </button>
        }
      />

      <div className="mb-4">
        <input
          className="input-field max-w-sm"
          placeholder="Search date, status, remarks…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Type</th>
                <th className="table-th">Status</th>
                <th className="table-th">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((r: any) => (
                <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                  <td className="table-td font-mono text-sm">{r.date?.slice(0, 10)}</td>
                  <td className="table-td capitalize">{r.entityType}</td>
                  <td className="table-td">
                    <Badge label={r.status} variant={statusVariant[r.status] ?? "gray"} />
                  </td>
                  <td className="table-td text-muted-foreground">{r.remarks || "—"}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={4} className="table-td text-center text-muted-foreground/70 py-8">
                    No attendance records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="Mark Attendance" isOpen={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleMark} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Entity Type</label>
            <div className="flex gap-3">
              {(["student", "employee"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setEntityType(t); setForm({ ...form, entity_id: "" }); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    entityType === t
                      ? "btn-primary text-white border-primary-600"
                      : "bg-card text-foreground/80 border-gray-300 hover:bg-muted/40"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              {entityType === "student" ? "Student" : "Employee"}
            </label>
            <select
              className="input-field"
              value={form.entity_id}
              onChange={(e) => setForm({ ...form, entity_id: e.target.value })}
              required
            >
              <option value="">Select...</option>
              {entityList.map((item: any) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Date</label>
            <input type="date" className="input-field" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Status</label>
            <select className="input-field" value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Remarks</label>
            <input className="input-field" placeholder="Optional" value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">Mark</button>
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/attendance/page.tsx"
git commit -m "feat(batch4): migrate attendance/page to Apollo GraphQL"
```

---

### Task 5: Frontend — attendance/summary and attendance/shortage migration

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/attendance/summary/page.tsx`
- Modify: `frontend/app/[tenant]/(dashboard)/attendance/shortage/page.tsx`

- [ ] **Step 1: Rewrite attendance/summary/page.tsx**

Replace Redux `holidaySlice.fetchAttendanceSummary` + `studentSlice.fetchStudents` with `ATTENDANCE_SUMMARY` + `LIST_STUDENTS` queries. The summary rows have `entityId` (was `entity_id`). Build studentMap from `students.rollNumber` (was `roll_number`), `students.course.name`.

```typescript
"use client";

import { useQuery } from "@apollo/client";
import { ATTENDANCE_SUMMARY } from "@/graphql/queries/attendance";
import { LIST_STUDENTS } from "@/graphql/queries/students";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function AttendanceSummaryPage() {
  const { data: summaryData, loading: summaryLoading } = useQuery(ATTENDANCE_SUMMARY, {
    variables: { entityType: "student" },
  });
  const { data: studentsData, loading: studentsLoading } = useQuery(LIST_STUDENTS);

  const summary = summaryData?.attendanceSummary ?? [];
  const students = studentsData?.students ?? [];
  const studentMap = Object.fromEntries(students.map((s: any) => [s.id, s]));
  const loading = summaryLoading || studentsLoading;

  const getPctClass = (pct: number) => {
    if (pct >= 75) return "text-green-600 font-semibold";
    if (pct >= 60) return "text-yellow-600 font-semibold";
    return "text-red-600 font-semibold";
  };

  return (
    <div>
      <Header title="Attendance Summary" subtitle="Per-student attendance statistics" />
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="table-th">Student</th>
                <th className="table-th">Roll No.</th>
                <th className="table-th">Course</th>
                <th className="table-th text-center">Total</th>
                <th className="table-th text-center">Present</th>
                <th className="table-th text-center">Absent</th>
                <th className="table-th text-center">Late</th>
                <th className="table-th text-center">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {summary.map((row: any) => {
                const student = studentMap[row.entityId];
                const pct = Math.round(row.attendancePct);
                return (
                  <tr key={row.entityId} className="hover:bg-muted/40">
                    <td className="table-td font-medium">{student?.user?.name ?? row.entityId.slice(0, 8)}</td>
                    <td className="table-td font-mono text-sm">{student?.rollNumber ?? "—"}</td>
                    <td className="table-td text-muted-foreground">{student?.course?.name ?? "—"}</td>
                    <td className="table-td text-center">{row.total}</td>
                    <td className="table-td text-center text-green-600">{row.present}</td>
                    <td className="table-td text-center text-red-500">{row.absent}</td>
                    <td className="table-td text-center text-yellow-600">{row.late}</td>
                    <td className={`table-td text-center ${getPctClass(pct)}`}>{pct}%</td>
                  </tr>
                );
              })}
              {summary.length === 0 && (
                <tr><td colSpan={8} className="table-td text-center text-muted-foreground/70 py-8">No attendance data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite attendance/shortage/page.tsx**

Replace Redux `holidaySlice.fetchShortageList` with `ATTENDANCE_SHORTAGE` query.

```typescript
"use client";

import { useQuery } from "@apollo/client";
import { ATTENDANCE_SHORTAGE } from "@/graphql/queries/attendance";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { AlertTriangle } from "lucide-react";

export default function ShortageListPage() {
  const { data, loading } = useQuery(ATTENDANCE_SHORTAGE);
  const shortage = data?.attendanceShortage?.students ?? [];
  const threshold = data?.attendanceShortage?.threshold ?? 75;

  return (
    <div>
      <Header
        title="Attendance Shortage"
        subtitle={`Students below ${threshold}% attendance threshold`}
      />
      {loading ? (
        <LoadingSpinner />
      ) : shortage.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-green-600 font-medium">No students below the {threshold}% threshold.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertTriangle size={16} />
            <span>{shortage.length} student{shortage.length > 1 ? "s" : ""} below the {threshold}% minimum attendance threshold</span>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/40">
                <tr>
                  <th className="table-th">Student</th>
                  <th className="table-th">Roll No.</th>
                  <th className="table-th">Course</th>
                  <th className="table-th text-center">Present/Total</th>
                  <th className="table-th text-center">Attendance %</th>
                  <th className="table-th text-center">Shortfall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {shortage.map((item: any) => {
                  const pct = Math.round(item.attendancePct);
                  const shortfall = Math.round(threshold - pct);
                  return (
                    <tr key={item.student.id} className="hover:bg-red-50/30">
                      <td className="table-td font-medium">{item.student.user?.name}</td>
                      <td className="table-td font-mono text-sm">{item.student.rollNumber}</td>
                      <td className="table-td text-muted-foreground">{item.student.course?.name ?? "—"}</td>
                      <td className="table-td text-center">{item.present}/{item.total}</td>
                      <td className="table-td text-center"><span className="text-red-600 font-bold">{pct}%</span></td>
                      <td className="table-td text-center"><span className="text-red-500 text-sm font-medium">-{shortfall}%</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/attendance/summary/page.tsx" "frontend/app/[tenant]/(dashboard)/attendance/shortage/page.tsx"
git commit -m "feat(batch4): migrate attendance summary+shortage pages to Apollo GraphQL"
```

---

### Task 6: Frontend — leaves/page.tsx migration

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/leaves/page.tsx`

Replace Redux `leaveSlice` + `leaveTypeSlice` with Apollo. Keep `useAppSelector(s => s.auth.user)` for `isAdmin` check.

- [ ] **Step 1: Rewrite leaves/page.tsx**

Field renames: `l.from_date` → `l.fromDate`, `l.to_date` → `l.toDate`, `l.leave_type` → `l.leaveType`, `l.leave_type_id` → `l.leaveTypeId`, `l.review_note` → `l.reviewNote`, `b.leave_type_id` → `b.leaveTypeId`, `b.leave_type?.name` → `b.leaveType?.name`.

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useAppSelector } from "@/store/hooks";
import { LIST_LEAVES, LIST_LEAVE_TYPES, MY_LEAVE_BALANCE } from "@/graphql/queries/leaves";
import { APPLY_LEAVE, REVIEW_LEAVE } from "@/graphql/mutations/leaves";
import Header from "@/components/layout/Header";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { Plus, CheckCircle, XCircle } from "lucide-react";

const statusVariant: Record<string, "green" | "red" | "yellow" | "gray"> = {
  approved: "green", rejected: "red", pending: "yellow",
};

export default function LeavesPage() {
  const user = useAppSelector((s) => s.auth.user); // auth stays Redux — migrated in Batch 9
  const isAdmin = user?.role === "admin";

  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ leave_type: "", leave_type_id: "", from_date: "", to_date: "", reason: "" });

  const { data: leavesData, loading } = useQuery(LIST_LEAVES);
  const { data: leaveTypesData } = useQuery(LIST_LEAVE_TYPES);
  const { data: balanceData } = useQuery(MY_LEAVE_BALANCE, { skip: isAdmin });

  const leaves = leavesData?.leaves ?? [];
  const leaveTypes = leaveTypesData?.leaveTypes ?? [];
  const myBalances = balanceData?.myLeaveBalance ?? [];

  const [applyLeaveMut] = useMutation(APPLY_LEAVE);
  const [reviewLeaveMut] = useMutation(REVIEW_LEAVE);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await applyLeaveMut({
        variables: {
          input: {
            leaveType: form.leave_type,
            leaveTypeId: form.leave_type_id || null,
            fromDate: form.from_date,
            toDate: form.to_date,
            reason: form.reason,
          },
        },
        refetchQueries: [{ query: LIST_LEAVES }],
      });
      toast.success("Leave applied");
      setShowModal(false);
      setForm({ leave_type: "", leave_type_id: "", from_date: "", to_date: "", reason: "" });
    } catch (err: any) {
      toast.error(err?.graphQLErrors?.[0]?.message ?? "Failed to apply leave");
    }
  };

  const handleLeaveTypeChange = (id: string) => {
    const lt = leaveTypes.find((l: any) => l.id === id || l.code === id);
    setForm({ ...form, leave_type_id: lt?.id ?? "", leave_type: lt?.name ?? id });
  };

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    const reviewNote = status === "rejected" ? prompt("Rejection reason (optional):") ?? "" : "";
    try {
      await reviewLeaveMut({
        variables: { id, input: { status, reviewNote: reviewNote || null } },
        refetchQueries: [{ query: LIST_LEAVES }],
      });
      toast.success(status === "approved" ? "Leave approved" : "Leave rejected");
    } catch {
      toast.error("Failed to review leave");
    }
  };

  const filteredLeaves = search
    ? leaves.filter((l: any) => [l.applicant?.name, l.leaveType, l.reason, l.status].some((v: any) => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
    : leaves;

  return (
    <div>
      <Header
        title="Leave Management"
        subtitle="Apply and manage leave requests"
        action={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Apply Leave
          </button>
        }
      />

      {!isAdmin && myBalances.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {myBalances.map((b: any) => (
            <div key={b.id} className="card py-3 px-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{b.leaveType?.name ?? b.leaveTypeId}</p>
              <div className="flex items-end gap-1 mt-1">
                <span className="text-2xl font-bold text-foreground">{b.total - b.used - b.pending}</span>
                <span className="text-sm text-muted-foreground/70 mb-0.5">/ {b.total}</span>
              </div>
              {b.pending > 0 && <p className="text-xs text-yellow-600 mt-0.5">{b.pending} pending</p>}
            </div>
          ))}
        </div>
      )}

      <div className="mb-4">
        <input className="input-field max-w-sm" placeholder="Search leave type, reason, status…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                {isAdmin && <th className="table-th">Applicant</th>}
                <th className="table-th">Leave Type</th>
                <th className="table-th">From</th>
                <th className="table-th">To</th>
                <th className="table-th">Reason</th>
                <th className="table-th">Status</th>
                {isAdmin && <th className="table-th">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredLeaves.map((l: any) => (
                <tr key={l.id} className="hover:bg-muted/40">
                  {isAdmin && <td className="table-td font-medium">{l.applicant?.name ?? "—"}</td>}
                  <td className="table-td">{l.leaveType}</td>
                  <td className="table-td text-sm">{new Date(l.fromDate).toLocaleDateString()}</td>
                  <td className="table-td text-sm">{new Date(l.toDate).toLocaleDateString()}</td>
                  <td className="table-td text-muted-foreground max-w-xs truncate">{l.reason}</td>
                  <td className="table-td"><Badge label={l.status} variant={statusVariant[l.status] ?? "gray"} /></td>
                  {isAdmin && l.status === "pending" && (
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleReview(l.id, "approved")} className="text-green-600 hover:text-green-800"><CheckCircle size={16} /></button>
                        <button onClick={() => handleReview(l.id, "rejected")} className="text-red-500 hover:text-red-700"><XCircle size={16} /></button>
                      </div>
                    </td>
                  )}
                  {isAdmin && l.status !== "pending" && <td className="table-td text-xs text-muted-foreground/70">{l.reviewNote || "—"}</td>}
                </tr>
              ))}
              {filteredLeaves.length === 0 && (
                <tr><td colSpan={7} className="table-td text-center text-muted-foreground/70 py-8">No leave records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="Apply for Leave" isOpen={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Leave Type</label>
            {leaveTypes.length > 0 ? (
              <select className="input-field" value={form.leave_type_id || form.leave_type}
                onChange={(e) => handleLeaveTypeChange(e.target.value)} required>
                <option value="">Select leave type...</option>
                {leaveTypes.map((lt: any) => {
                  const bal = myBalances.find((b: any) => b.leaveTypeId === lt.id);
                  const remaining = bal ? bal.total - bal.used - bal.pending : null;
                  return (
                    <option key={lt.id ?? lt.code} value={lt.id ?? lt.code}>
                      {lt.name} ({lt.code}){remaining !== null ? ` — ${remaining} days left` : ""}
                    </option>
                  );
                })}
              </select>
            ) : (
              <input className="input-field" placeholder="e.g. Sick Leave" value={form.leave_type}
                onChange={(e) => setForm({ ...form, leave_type: e.target.value })} required />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">From Date</label>
              <input type="date" className="input-field" value={form.from_date}
                onChange={(e) => setForm({ ...form, from_date: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">To Date</label>
              <input type="date" className="input-field" value={form.to_date}
                onChange={(e) => setForm({ ...form, to_date: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Reason</label>
            <textarea className="input-field" rows={3} value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">Submit</button>
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/leaves/page.tsx"
git commit -m "feat(batch4): migrate leaves/page to Apollo GraphQL"
```

---

### Task 7: Frontend — leave-types/page.tsx migration

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/leave-types/page.tsx`

Replace Redux `leaveTypeSlice` with Apollo. Field renames: `lt.days_per_year` → `lt.daysPerYear`, `lt.carry_forward` → `lt.carryForward`, `lt.max_carry_forward` → `lt.maxCarryForward`, `lt.applicable_to` → `lt.applicableTo`, `lt.is_active` → `lt.isActive`.

- [ ] **Step 1: Rewrite leave-types/page.tsx**

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { LIST_LEAVE_TYPES } from "@/graphql/queries/leaves";
import { CREATE_LEAVE_TYPE, UPDATE_LEAVE_TYPE, DELETE_LEAVE_TYPE } from "@/graphql/mutations/leaves";
import Header from "@/components/layout/Header";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";

const emptyForm = {
  name: "", code: "", days_per_year: "12", carry_forward: false,
  max_carry_forward: "0", applicable_to: "all",
};

export default function LeaveTypesPage() {
  const { data, loading } = useQuery(LIST_LEAVE_TYPES);
  const leaveTypes = data?.leaveTypes ?? [];

  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const [createLeaveTypeMut] = useMutation(CREATE_LEAVE_TYPE);
  const [updateLeaveTypeMut] = useMutation(UPDATE_LEAVE_TYPE);
  const [deleteLeaveTypeMut] = useMutation(DELETE_LEAVE_TYPE);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (lt: any) => {
    setEditId(lt.id ?? null);
    setForm({
      name: lt.name, code: lt.code,
      days_per_year: String(lt.daysPerYear),
      carry_forward: lt.carryForward,
      max_carry_forward: String(lt.maxCarryForward),
      applicable_to: lt.applicableTo,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateLeaveTypeMut({
          variables: {
            id: editId,
            input: {
              name: form.name,
              daysPerYear: parseInt(form.days_per_year),
              carryForward: form.carry_forward,
              maxCarryForward: parseInt(form.max_carry_forward),
              applicableTo: form.applicable_to,
            },
          },
          refetchQueries: [{ query: LIST_LEAVE_TYPES }],
        });
        toast.success("Updated");
      } else {
        await createLeaveTypeMut({
          variables: {
            input: {
              name: form.name,
              code: form.code,
              daysPerYear: parseInt(form.days_per_year),
              carryForward: form.carry_forward,
              maxCarryForward: parseInt(form.max_carry_forward),
              applicableTo: form.applicable_to,
            },
          },
          refetchQueries: [{ query: LIST_LEAVE_TYPES }],
        });
        toast.success("Leave type created");
      }
      setShowModal(false);
    } catch (err: any) {
      toast.error(err?.graphQLErrors?.[0]?.message ?? "Failed");
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      title: "Delete Leave Type",
      message: "This leave type will be permanently removed.",
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteLeaveTypeMut({
          variables: { id },
          refetchQueries: [{ query: LIST_LEAVE_TYPES }],
        });
        toast.success("Deleted");
      },
    });
  };

  const filtered = search
    ? leaveTypes.filter((lt: any) => [lt.name, lt.code, lt.applicableTo].some((v: any) => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
    : leaveTypes;

  return (
    <div>
      <Header
        title="Leave Types"
        subtitle="Configure leave policies for your organisation"
        action={
          <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
            <Plus size={16} /> Add Leave Type
          </button>
        }
      />

      <div className="mb-4">
        <input className="input-field max-w-sm" placeholder="Search leave type, code…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40 dark:bg-gray-500">
              <tr>
                <th className="table-th">Type</th>
                <th className="table-th">Code</th>
                <th className="table-th text-center">Days/Year</th>
                <th className="table-th text-center">Carry Forward</th>
                <th className="table-th">Applicable To</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((lt: any) => (
                <tr key={lt.id ?? lt.code} className="hover:bg-muted/40">
                  <td className="table-td font-medium">{lt.name}</td>
                  <td className="table-td font-mono text-sm">{lt.code}</td>
                  <td className="table-td text-center font-medium">{lt.daysPerYear}</td>
                  <td className="table-td text-center">
                    {lt.carryForward ? (
                      <span className="flex items-center justify-center gap-1 text-green-600">
                        <Check size={14} /> {lt.maxCarryForward > 0 ? `max ${lt.maxCarryForward}` : "Yes"}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1 text-muted-foreground/70">
                        <X size={14} /> No
                      </span>
                    )}
                  </td>
                  <td className="table-td capitalize text-muted-foreground">{lt.applicableTo}</td>
                  <td className="table-td">
                    {lt.id && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(lt)} className="text-blue-500 hover:text-blue-700"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(lt.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {leaveTypes.length === 0 && (
                <tr><td colSpan={6} className="table-td text-center text-muted-foreground/70 py-8">No leave types configured.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal title={editId ? "Edit Leave Type" : "Add Leave Type"} isOpen={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Name</label>
              <input className="input-field" placeholder="e.g. Casual Leave" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Code</label>
              <input className="input-field" placeholder="e.g. CL" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required disabled={!!editId} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Days per Year</label>
              <input type="number" min="0" className="input-field" value={form.days_per_year}
                onChange={(e) => setForm({ ...form, days_per_year: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Applicable To</label>
              <select className="input-field" value={form.applicable_to}
                onChange={(e) => setForm({ ...form, applicable_to: e.target.value })}>
                <option value="all">All</option>
                <option value="employee">Employees Only</option>
                <option value="student">Students Only</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="cf" checked={form.carry_forward}
              onChange={(e) => setForm({ ...form, carry_forward: e.target.checked })} className="rounded" />
            <label htmlFor="cf" className="text-sm font-medium text-foreground/80">Allow Carry Forward</label>
          </div>
          {form.carry_forward && (
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Max Carry Forward Days</label>
              <input type="number" min="0" className="input-field" value={form.max_carry_forward}
                onChange={(e) => setForm({ ...form, max_carry_forward: e.target.value })} />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">{editId ? "Update" : "Create"}</button>
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/leave-types/page.tsx"
git commit -m "feat(batch4): migrate leave-types/page to Apollo GraphQL"
```
