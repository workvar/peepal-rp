# Batch 3: Students + Academic + Marks/Results GraphQL Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GraphQL types, resolvers, and queries/mutations for the Students, Courses, Subjects, ExamSchedules, AcademicYears, Marks, and Results domains; migrate all five frontend pages from Redux/REST to Apollo/GraphQL.

**Architecture:** Schema-first with gqlgen `follow-schema` layout. New resolvers go in three domain files: `students.resolvers.go`, `academic.resolvers.go`, `marks.resolvers.go`. The bulk CSV import endpoint stays as REST (studentsAPI.bulkImport) — only the list/create/delete operations move to GraphQL. AcademicYears and Departments (already in GraphQL from Batch 1) are exposed as read-only queries.

**Tech Stack:** Go 1.25, gqlgen v0.17, GORM + Postgres, gofiber/adaptor, Next.js 14, Apollo Client 3, TypeScript

---

### Task 1: Extend GraphQL schema with Batch 3 types and regenerate code

**Files:**
- Modify: `backend/graph/schema.graphqls`
- Run: `cd backend && go run github.com/99designs/gqlgen generate`
- Verify: `backend/graph/model/models_gen.go`

- [ ] **Step 1: Add Batch 3 types to schema.graphqls**

Append to `backend/graph/schema.graphqls` after the existing types:

```graphql
type Course {
  id: ID!
  name: String!
  code: String!
}

type Student {
  id: ID!
  rollNumber: String!
  section: String
  semester: Int
  phone: String
  enrollDate: String
  dateOfBirth: String
  gender: String
  bloodGroup: String
  photoUrl: String
  address: String
  city: String
  state: String
  pincode: String
  nationality: String
  emergencyName: String
  emergencyPhone: String
  fatherName: String
  fatherPhone: String
  motherName: String
  motherPhone: String
  admissionStatus: String
  batch: String
  user: User
  course: Course
}

type AcademicYear {
  id: ID!
  name: String!
  startDate: String!
  endDate: String!
  isCurrent: Boolean!
}

type Subject {
  id: ID!
  name: String!
  code: String!
  credits: Int
  teachingHours: Int
  labHours: Int
  semesterNumber: Int
  description: String
  syllabusUrl: String
  departmentId: String
  department: Department
}

type ExamSchedule {
  id: ID!
  name: String!
  examType: String!
  semesterNumber: Int
  startDate: String
  endDate: String
  published: Boolean!
  instructions: String
  academicYearId: String
}

type Mark {
  id: ID!
  studentId: String!
  subject: String!
  examType: String!
  semester: Int!
  marksObtained: Float!
  maxMarks: Float!
  grade: String
  enteredBy: String
  subjectId: String
  assessmentType: String
  status: String
  academicYearId: String
  isPublished: Boolean!
  publishedAt: String
  student: Student
}

type ResultSummary {
  totalStudents: Int!
  passCount: Int!
  failCount: Int!
}

input CreateStudentInput {
  userId: String!
  courseId: String
  rollNumber: String!
  section: String
  semester: Int
  phone: String
  enrollDate: String
  dateOfBirth: String
  gender: String
  bloodGroup: String
  photoUrl: String
  address: String
  city: String
  state: String
  pincode: String
  nationality: String
  emergencyName: String
  emergencyPhone: String
  fatherName: String
  fatherPhone: String
  motherName: String
  motherPhone: String
  admissionStatus: String
  batch: String
}

input CreateSubjectInput {
  name: String!
  code: String!
  departmentId: String
  credits: Int
  teachingHours: Int
  labHours: Int
  semesterNumber: Int
  description: String
  syllabusUrl: String
}

input UpdateSubjectInput {
  name: String
  code: String
  departmentId: String
  credits: Int
  teachingHours: Int
  labHours: Int
  semesterNumber: Int
  description: String
  syllabusUrl: String
}

input CreateExamScheduleInput {
  name: String!
  examType: String!
  semesterNumber: Int
  startDate: String
  endDate: String
  instructions: String
  academicYearId: String
}

input UpdateExamScheduleInput {
  name: String
  examType: String
  semesterNumber: Int
  startDate: String
  endDate: String
  instructions: String
  academicYearId: String
}

input CreateMarkInput {
  studentId: String!
  subject: String!
  examType: String!
  semester: Int!
  marksObtained: Float!
  maxMarks: Float!
  enteredBy: String
  subjectId: String
  assessmentType: String
  academicYearId: String
}

input PublishResultsInput {
  examType: String
  subject: String
  semester: Int
  courseId: String
}
```

- [ ] **Step 2: Add Batch 3 queries and mutations to schema.graphqls**

In `backend/graph/schema.graphqls`, extend the existing `type Query` and `type Mutation` blocks (they already have fields from Batch 1; append inside the braces):

```graphql
# Add inside type Query { ... }
  students(courseId: String, semester: Int): [Student!]!
  student(id: ID!): Student
  courses: [Course!]!
  subjects(departmentId: String, search: String): [Subject!]!
  subject(id: ID!): Subject
  academicYears: [AcademicYear!]!
  examSchedules(semesterNumber: Int, examType: String): [ExamSchedule!]!
  marks(studentId: String, subjectId: String, examType: String, semester: Int): [Mark!]!
  publishedResults(examType: String, subject: String, semester: Int, courseId: String): [Mark!]!
  resultSummary(courseId: String!, semester: Int!): ResultSummary!

# Add inside type Mutation { ... }
  createStudent(input: CreateStudentInput!): Student!
  deleteStudent(id: ID!): Boolean!
  createSubject(input: CreateSubjectInput!): Subject!
  updateSubject(id: ID!, input: UpdateSubjectInput!): Subject!
  deleteSubject(id: ID!): Boolean!
  createExamSchedule(input: CreateExamScheduleInput!): ExamSchedule!
  updateExamSchedule(id: ID!, input: UpdateExamScheduleInput!): ExamSchedule!
  publishExamSchedule(id: ID!, published: Boolean!): ExamSchedule!
  deleteExamSchedule(id: ID!): Boolean!
  createMark(input: CreateMarkInput!): Mark!
  publishResults(input: PublishResultsInput!): Int!
```

- [ ] **Step 3: Run gqlgen to regenerate**

```bash
cd backend && go run github.com/99designs/gqlgen generate 2>&1
```

Expected: no errors. New stubs appear in `graph/schema.resolvers.go`. `models_gen.go` now contains `Student`, `Course`, `AcademicYear`, `Subject`, `ExamSchedule`, `Mark`, `ResultSummary`, `CreateStudentInput`, `CreateSubjectInput`, `UpdateSubjectInput`, `CreateExamScheduleInput`, `UpdateExamScheduleInput`, `CreateMarkInput`, `PublishResultsInput`.

- [ ] **Step 4: Verify generated field names in models_gen.go**

```bash
grep -n "RollNumber\|PhotoURL\|SyllabusURL\|CourseID\|SubjectID\|StudentID\|AcademicYearID\|DepartmentID\|UserID\|IsCurrent\|IsPublished" backend/graph/model/models_gen.go
```

Expected names (gqlgen Go conventions — camelCase acronyms at suffix become uppercase):
- `rollNumber` → `RollNumber`
- `photoUrl` → `PhotoURL`
- `syllabusUrl` → `SyllabusURL`
- `courseId` → `CourseID`
- `subjectId` → `SubjectID`
- `studentId` → `StudentID`
- `academicYearId` → `AcademicYearID`
- `departmentId` → `DepartmentID`
- `userId` → `UserID`
- `isCurrent` → `IsCurrent`
- `isPublished` → `IsPublished`

If any names differ from above, note the actual names — they will be used in resolver code in Tasks 2-4.

- [ ] **Step 5: Commit**

```bash
cd backend && git add graph/schema.graphqls graph/model/models_gen.go graph/schema.resolvers.go && git commit -m "feat(graphql): add batch 3 schema types — students, academic, marks"
```

---

### Task 2: Implement students.resolvers.go

**Files:**
- Create: `backend/graph/students.resolvers.go`

This file handles all resolver methods for Student and Course types. The stubs for these methods currently exist in `graph/schema.resolvers.go` — implement them here in a new file; Task 5 will prune the stubs from schema.resolvers.go.

- [ ] **Step 1: Create students.resolvers.go**

```go
package graph

import (
	"context"
	"encoding/csv"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

// Students returns all students for the tenant, with optional courseId/semester filters.
func (r *queryResolver) Students(ctx context.Context, courseID *string, semester *int) ([]*model.Student, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	query := r.DB.WithContext(ctx).
		Preload("User").
		Preload("Course").
		Where("tenant_id = ?", tenantID)

	if courseID != nil && *courseID != "" {
		query = query.Where("course_id = ?", *courseID)
	}
	if semester != nil {
		query = query.Where("semester = ?", *semester)
	}

	var rows []models.Student
	if err := query.Find(&rows).Error; err != nil {
		return nil, err
	}

	out := make([]*model.Student, len(rows))
	for i, s := range rows {
		out[i] = studentToModel(s)
	}
	return out, nil
}

// Student returns a single student by ID (tenant-scoped).
func (r *queryResolver) Student(ctx context.Context, id string) (*model.Student, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	var s models.Student
	if err := r.DB.WithContext(ctx).
		Preload("User").
		Preload("Course").
		Where("id = ? AND tenant_id = ?", id, tenantID).
		First(&s).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return studentToModel(s), nil
}

// Courses returns all courses for the tenant.
func (r *queryResolver) Courses(ctx context.Context) ([]*model.Course, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	var rows []models.Course
	if err := r.DB.WithContext(ctx).Where("tenant_id = ?", tenantID).Find(&rows).Error; err != nil {
		return nil, err
	}

	out := make([]*model.Course, len(rows))
	for i, c := range rows {
		out[i] = &model.Course{ID: c.ID, Name: c.Name, Code: c.Code}
	}
	return out, nil
}

// CreateStudent creates a new student record for the tenant.
func (r *mutationResolver) CreateStudent(ctx context.Context, input model.CreateStudentInput) (*model.Student, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	s := models.Student{
		ID:              uuid.NewString(),
		TenantID:        tenantID,
		UserID:          input.UserID,
		RollNumber:      input.RollNumber,
		Section:         strVal(input.Section),
		Phone:           strVal(input.Phone),
		DateOfBirth:     strVal(input.DateOfBirth),
		Gender:          strVal(input.Gender),
		BloodGroup:      strVal(input.BloodGroup),
		PhotoURL:        strVal(input.PhotoURL),
		Address:         strVal(input.Address),
		City:            strVal(input.City),
		State:           strVal(input.State),
		Pincode:         strVal(input.Pincode),
		Nationality:     strVal(input.Nationality),
		EmergencyName:   strVal(input.EmergencyName),
		EmergencyPhone:  strVal(input.EmergencyPhone),
		FatherName:      strVal(input.FatherName),
		FatherPhone:     strVal(input.FatherPhone),
		MotherName:      strVal(input.MotherName),
		MotherPhone:     strVal(input.MotherPhone),
		AdmissionStatus: strVal(input.AdmissionStatus),
		Batch:           strVal(input.Batch),
	}
	if input.CourseID != nil {
		s.CourseID = *input.CourseID
	}
	if input.Semester != nil {
		s.Semester = *input.Semester
	}
	if input.EnrollDate != nil && *input.EnrollDate != "" {
		if t, err := time.Parse("2006-01-02", *input.EnrollDate); err == nil {
			s.EnrollDate = t
		}
	}

	if err := r.DB.WithContext(ctx).Create(&s).Error; err != nil {
		return nil, err
	}

	if err := r.DB.WithContext(ctx).
		Preload("User").
		Preload("Course").
		Where("id = ? AND tenant_id = ?", s.ID, tenantID).
		First(&s).Error; err != nil {
		return nil, err
	}
	return studentToModel(s), nil
}

// DeleteStudent deletes a student by ID (tenant-scoped).
func (r *mutationResolver) DeleteStudent(ctx context.Context, id string) (bool, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return false, err
	}

	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Delete(&models.Student{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// --- helpers ---

func studentToModel(s models.Student) *model.Student {
	m := &model.Student{
		ID:              s.ID,
		RollNumber:      s.RollNumber,
		Section:         toStrPtr(s.Section),
		Semester:        toIntPtr(s.Semester),
		Phone:           toStrPtr(s.Phone),
		DateOfBirth:     toStrPtr(s.DateOfBirth),
		Gender:          toStrPtr(s.Gender),
		BloodGroup:      toStrPtr(s.BloodGroup),
		PhotoURL:        toStrPtr(s.PhotoURL),
		Address:         toStrPtr(s.Address),
		City:            toStrPtr(s.City),
		State:           toStrPtr(s.State),
		Pincode:         toStrPtr(s.Pincode),
		Nationality:     toStrPtr(s.Nationality),
		EmergencyName:   toStrPtr(s.EmergencyName),
		EmergencyPhone:  toStrPtr(s.EmergencyPhone),
		FatherName:      toStrPtr(s.FatherName),
		FatherPhone:     toStrPtr(s.FatherPhone),
		MotherName:      toStrPtr(s.MotherName),
		MotherPhone:     toStrPtr(s.MotherPhone),
		AdmissionStatus: toStrPtr(s.AdmissionStatus),
		Batch:           toStrPtr(s.Batch),
		CourseID:        toStrPtr(s.CourseID),
	}
	if s.User.ID != "" {
		m.User = userToModel(s.User)
	}
	if s.Course.ID != "" {
		m.Course = &model.Course{ID: s.Course.ID, Name: s.Course.Name, Code: s.Course.Code}
	}
	if !s.EnrollDate.IsZero() {
		d := s.EnrollDate.Format("2006-01-02")
		m.EnrollDate = &d
	}
	return m
}

func toIntPtr(n int) *int {
	if n == 0 {
		return nil
	}
	v := n
	return &v
}
```

**Note on imports**: add `"errors"` and `"gorm.io/gorm"` to the import block. `strVal`, `toStrPtr`, `userToModel` are defined in `employees.resolvers.go` — do not redefine them.

**Note on model field names**: The `model.Student` struct fields use gqlgen conventions. The `PhotoURL` field name generated for `photoUrl` is `PhotoURL`. The `CourseID` generated for `courseId` is `CourseID`. Verify against `models_gen.go` before writing — if the generated name is different, use whatever `models_gen.go` shows.

**Note**: `model.Student` does NOT have a `CourseID` field — it has `Course *model.Course`. Remove `CourseID: toStrPtr(s.CourseID)` from the studentToModel function. The course is set via `m.Course = &model.Course{...}` only.

- [ ] **Step 2: Verify the file builds**

```bash
cd backend && go build ./graph/... 2>&1
```

Expected: no errors. If there are "undefined" errors for `strVal`, `toStrPtr`, `userToModel` — check that `employees.resolvers.go` is present and in the same package.

- [ ] **Step 3: Commit**

```bash
cd backend && git add graph/students.resolvers.go && git commit -m "feat(graphql): students and courses resolvers"
```

---

### Task 3: Implement academic.resolvers.go

**Files:**
- Create: `backend/graph/academic.resolvers.go`

Handles Subjects, ExamSchedules, and AcademicYears resolver methods.

- [ ] **Step 1: Create academic.resolvers.go**

```go
package graph

import (
	"context"
	"errors"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Subjects returns subjects for the tenant, filtered by departmentId and/or search text.
func (r *queryResolver) Subjects(ctx context.Context, departmentID *string, search *string) ([]*model.Subject, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	query := r.DB.WithContext(ctx).
		Preload("Department").
		Where("tenant_id = ?", tenantID)

	if departmentID != nil && *departmentID != "" {
		query = query.Where("department_id = ?", *departmentID)
	}
	if search != nil && *search != "" {
		query = query.Where("LOWER(name) LIKE ? OR LOWER(code) LIKE ?",
			"%"+strings.ToLower(*search)+"%",
			"%"+strings.ToLower(*search)+"%")
	}

	var rows []models.Subject
	if err := query.Find(&rows).Error; err != nil {
		return nil, err
	}

	out := make([]*model.Subject, len(rows))
	for i, s := range rows {
		out[i] = subjectToModel(s)
	}
	return out, nil
}

// Subject returns a single subject by ID (tenant-scoped).
func (r *queryResolver) Subject(ctx context.Context, id string) (*model.Subject, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	var s models.Subject
	if err := r.DB.WithContext(ctx).
		Preload("Department").
		Where("id = ? AND tenant_id = ?", id, tenantID).
		First(&s).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return subjectToModel(s), nil
}

// AcademicYears returns all academic years for the tenant.
func (r *queryResolver) AcademicYears(ctx context.Context) ([]*model.AcademicYear, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	var rows []models.AcademicYear
	if err := r.DB.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Order("start_date DESC").
		Find(&rows).Error; err != nil {
		return nil, err
	}

	out := make([]*model.AcademicYear, len(rows))
	for i, ay := range rows {
		out[i] = academicYearToModel(ay)
	}
	return out, nil
}

// ExamSchedules returns exam schedules with optional semesterNumber and examType filters.
func (r *queryResolver) ExamSchedules(ctx context.Context, semesterNumber *int, examType *string) ([]*model.ExamSchedule, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	query := r.DB.WithContext(ctx).Where("tenant_id = ?", tenantID)
	if semesterNumber != nil {
		query = query.Where("semester_number = ?", *semesterNumber)
	}
	if examType != nil && *examType != "" {
		query = query.Where("exam_type = ?", *examType)
	}

	var rows []models.ExamSchedule
	if err := query.Find(&rows).Error; err != nil {
		return nil, err
	}

	out := make([]*model.ExamSchedule, len(rows))
	for i, e := range rows {
		out[i] = examScheduleToModel(e)
	}
	return out, nil
}

// CreateSubject creates a new subject for the tenant.
func (r *mutationResolver) CreateSubject(ctx context.Context, input model.CreateSubjectInput) (*model.Subject, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	s := models.Subject{
		ID:       uuid.NewString(),
		TenantID: tenantID,
		Name:     input.Name,
		Code:     input.Code,
	}
	if input.DepartmentID != nil {
		s.DepartmentID = *input.DepartmentID
	}
	if input.Credits != nil {
		s.Credits = *input.Credits
	}
	if input.TeachingHours != nil {
		s.TeachingHours = *input.TeachingHours
	}
	if input.LabHours != nil {
		s.LabHours = *input.LabHours
	}
	if input.SemesterNumber != nil {
		s.SemesterNumber = *input.SemesterNumber
	}
	if input.Description != nil {
		s.Description = *input.Description
	}
	if input.SyllabusURL != nil {
		s.SyllabusURL = *input.SyllabusURL
	}

	if err := r.DB.WithContext(ctx).Create(&s).Error; err != nil {
		return nil, err
	}
	r.DB.WithContext(ctx).Preload("Department").Where("id = ?", s.ID).First(&s)
	return subjectToModel(s), nil
}

// UpdateSubject performs a partial update on a subject.
func (r *mutationResolver) UpdateSubject(ctx context.Context, id string, input model.UpdateSubjectInput) (*model.Subject, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{}
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.Code != nil {
		updates["code"] = *input.Code
	}
	if input.DepartmentID != nil {
		updates["department_id"] = *input.DepartmentID
	}
	if input.Credits != nil {
		updates["credits"] = *input.Credits
	}
	if input.TeachingHours != nil {
		updates["teaching_hours"] = *input.TeachingHours
	}
	if input.LabHours != nil {
		updates["lab_hours"] = *input.LabHours
	}
	if input.SemesterNumber != nil {
		updates["semester_number"] = *input.SemesterNumber
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.SyllabusURL != nil {
		updates["syllabus_url"] = *input.SyllabusURL
	}

	res := r.DB.WithContext(ctx).
		Model(&models.Subject{}).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}

	var s models.Subject
	r.DB.WithContext(ctx).Preload("Department").Where("id = ?", id).First(&s)
	return subjectToModel(s), nil
}

// DeleteSubject deletes a subject by ID (tenant-scoped).
func (r *mutationResolver) DeleteSubject(ctx context.Context, id string) (bool, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return false, err
	}

	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Delete(&models.Subject{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// CreateExamSchedule creates a new exam schedule.
func (r *mutationResolver) CreateExamSchedule(ctx context.Context, input model.CreateExamScheduleInput) (*model.ExamSchedule, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	e := models.ExamSchedule{
		ID:       uuid.NewString(),
		TenantID: tenantID,
		Name:     input.Name,
		ExamType: input.ExamType,
	}
	if input.SemesterNumber != nil {
		e.SemesterNumber = *input.SemesterNumber
	}
	if input.Instructions != nil {
		e.Instructions = *input.Instructions
	}
	if input.AcademicYearID != nil {
		e.AcademicYearID = *input.AcademicYearID
	}
	if input.StartDate != nil && *input.StartDate != "" {
		if t, err := time.Parse("2006-01-02", *input.StartDate); err == nil {
			e.StartDate = t
		}
	}
	if input.EndDate != nil && *input.EndDate != "" {
		if t, err := time.Parse("2006-01-02", *input.EndDate); err == nil {
			e.EndDate = t
		}
	}

	if err := r.DB.WithContext(ctx).Create(&e).Error; err != nil {
		return nil, err
	}
	return examScheduleToModel(e), nil
}

// UpdateExamSchedule performs a partial update on an exam schedule.
func (r *mutationResolver) UpdateExamSchedule(ctx context.Context, id string, input model.UpdateExamScheduleInput) (*model.ExamSchedule, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{}
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.ExamType != nil {
		updates["exam_type"] = *input.ExamType
	}
	if input.SemesterNumber != nil {
		updates["semester_number"] = *input.SemesterNumber
	}
	if input.Instructions != nil {
		updates["instructions"] = *input.Instructions
	}
	if input.AcademicYearID != nil {
		updates["academic_year_id"] = *input.AcademicYearID
	}
	if input.StartDate != nil && *input.StartDate != "" {
		if t, err := time.Parse("2006-01-02", *input.StartDate); err == nil {
			updates["start_date"] = t
		}
	}
	if input.EndDate != nil && *input.EndDate != "" {
		if t, err := time.Parse("2006-01-02", *input.EndDate); err == nil {
			updates["end_date"] = t
		}
	}

	res := r.DB.WithContext(ctx).
		Model(&models.ExamSchedule{}).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}

	var e models.ExamSchedule
	r.DB.WithContext(ctx).Where("id = ?", id).First(&e)
	return examScheduleToModel(e), nil
}

// PublishExamSchedule sets the published flag on an exam schedule.
func (r *mutationResolver) PublishExamSchedule(ctx context.Context, id string, published bool) (*model.ExamSchedule, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	res := r.DB.WithContext(ctx).
		Model(&models.ExamSchedule{}).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Update("published", published)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}

	var e models.ExamSchedule
	r.DB.WithContext(ctx).Where("id = ?", id).First(&e)
	return examScheduleToModel(e), nil
}

// DeleteExamSchedule deletes an exam schedule by ID.
func (r *mutationResolver) DeleteExamSchedule(ctx context.Context, id string) (bool, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return false, err
	}

	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Delete(&models.ExamSchedule{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// --- helpers ---

func subjectToModel(s models.Subject) *model.Subject {
	m := &model.Subject{
		ID:             s.ID,
		Name:           s.Name,
		Code:           s.Code,
		Credits:        toIntPtr(s.Credits),
		TeachingHours:  toIntPtr(s.TeachingHours),
		LabHours:       toIntPtr(s.LabHours),
		SemesterNumber: toIntPtr(s.SemesterNumber),
		Description:    toStrPtr(s.Description),
		SyllabusURL:    toStrPtr(s.SyllabusURL),
		DepartmentID:   toStrPtr(s.DepartmentID),
	}
	if s.Department.ID != "" {
		m.Department = &model.Department{ID: s.Department.ID, Name: s.Department.Name}
	}
	return m
}

func academicYearToModel(ay models.AcademicYear) *model.AcademicYear {
	return &model.AcademicYear{
		ID:        ay.ID,
		Name:      ay.Name,
		StartDate: ay.StartDate.Format("2006-01-02"),
		EndDate:   ay.EndDate.Format("2006-01-02"),
		IsCurrent: ay.IsCurrent,
	}
}

func examScheduleToModel(e models.ExamSchedule) *model.ExamSchedule {
	m := &model.ExamSchedule{
		ID:             e.ID,
		Name:           e.Name,
		ExamType:       e.ExamType,
		SemesterNumber: toIntPtr(e.SemesterNumber),
		Published:      e.Published,
		Instructions:   toStrPtr(e.Instructions),
		AcademicYearID: toStrPtr(e.AcademicYearID),
	}
	if !e.StartDate.IsZero() {
		d := e.StartDate.Format("2006-01-02")
		m.StartDate = &d
	}
	if !e.EndDate.IsZero() {
		d := e.EndDate.Format("2006-01-02")
		m.EndDate = &d
	}
	return m
}
```

**Note**: `toIntPtr` and `toStrPtr` are defined in `students.resolvers.go` and `employees.resolvers.go` respectively — do not redefine. If there's a conflict, move `toIntPtr` to a new `backend/graph/helpers.go` file and remove it from `students.resolvers.go`.

- [ ] **Step 2: Verify build**

```bash
cd backend && go build ./graph/... 2>&1
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd backend && git add graph/academic.resolvers.go && git commit -m "feat(graphql): subjects, exam schedules, and academic year resolvers"
```

---

### Task 4: Implement marks.resolvers.go

**Files:**
- Create: `backend/graph/marks.resolvers.go`

Handles Marks, PublishedResults, ResultSummary queries and CreateMark, PublishResults mutations. Contains grade calculation logic mirrored from `backend/handlers/marks.go`.

- [ ] **Step 1: Create marks.resolvers.go**

```go
package graph

import (
	"context"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Marks returns marks filtered by optional params. Students can only see their own marks.
func (r *queryResolver) Marks(ctx context.Context, studentID *string, subjectID *string, examType *string, semester *int) ([]*model.Mark, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	authInfo, _ := AuthFromCtx(ctx)
	query := r.DB.WithContext(ctx).
		Preload("Student").
		Preload("Student.User").
		Where("tenant_id = ?", tenantID)

	// Row-level security: students only see their own marks
	if authInfo.Role == "student" {
		var s models.Student
		if err := r.DB.WithContext(ctx).
			Where("user_id = ? AND tenant_id = ?", authInfo.UserID, tenantID).
			First(&s).Error; err == nil {
			query = query.Where("student_id = ?", s.ID)
		}
	} else if studentID != nil && *studentID != "" {
		query = query.Where("student_id = ?", *studentID)
	}

	if subjectID != nil && *subjectID != "" {
		query = query.Where("subject_id = ?", *subjectID)
	}
	if examType != nil && *examType != "" {
		query = query.Where("exam_type = ?", *examType)
	}
	if semester != nil {
		query = query.Where("semester = ?", *semester)
	}

	var rows []models.Mark
	if err := query.Find(&rows).Error; err != nil {
		return nil, err
	}

	out := make([]*model.Mark, len(rows))
	for i, m := range rows {
		out[i] = markToModel(m)
	}
	return out, nil
}

// PublishedResults returns published marks with optional filters.
func (r *queryResolver) PublishedResults(ctx context.Context, examType *string, subject *string, semester *int, courseID *string) ([]*model.Mark, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	query := r.DB.WithContext(ctx).
		Preload("Student").
		Preload("Student.User").
		Where("tenant_id = ? AND is_published = true", tenantID)

	if examType != nil && *examType != "" {
		query = query.Where("exam_type = ?", *examType)
	}
	if subject != nil && *subject != "" {
		query = query.Where("subject = ?", *subject)
	}
	if semester != nil {
		query = query.Where("semester = ?", *semester)
	}
	if courseID != nil && *courseID != "" {
		query = query.Joins("JOIN students ON marks.student_id = students.id").
			Where("students.course_id = ?", *courseID)
	}

	var rows []models.Mark
	if err := query.Find(&rows).Error; err != nil {
		return nil, err
	}

	out := make([]*model.Mark, len(rows))
	for i, m := range rows {
		out[i] = markToModel(m)
	}
	return out, nil
}

// ResultSummary returns aggregate pass/fail counts for a course+semester.
func (r *queryResolver) ResultSummary(ctx context.Context, courseID string, semester int) (*model.ResultSummary, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	var total int64
	r.DB.WithContext(ctx).
		Model(&models.Student{}).
		Where("tenant_id = ? AND course_id = ? AND semester = ?", tenantID, courseID, semester).
		Count(&total)

	var failCount int64
	r.DB.WithContext(ctx).
		Model(&models.Mark{}).
		Joins("JOIN students ON marks.student_id = students.id").
		Where("marks.tenant_id = ? AND students.course_id = ? AND marks.semester = ? AND marks.is_published = true AND marks.grade = 'F'",
			tenantID, courseID, semester).
		Distinct("marks.student_id").
		Count(&failCount)

	passCount := int(total) - int(failCount)
	if passCount < 0 {
		passCount = 0
	}

	return &model.ResultSummary{
		TotalStudents: int(total),
		PassCount:     passCount,
		FailCount:     int(failCount),
	}, nil
}

// CreateMark creates a mark entry with server-side grade calculation.
func (r *mutationResolver) CreateMark(ctx context.Context, input model.CreateMarkInput) (*model.Mark, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return nil, err
	}

	grade := calculateGrade(input.MarksObtained, input.MaxMarks)

	m := models.Mark{
		ID:             uuid.NewString(),
		TenantID:       tenantID,
		StudentID:      input.StudentID,
		Subject:        input.Subject,
		ExamType:       input.ExamType,
		Semester:       input.Semester,
		MarksObtained:  input.MarksObtained,
		MaxMarks:       input.MaxMarks,
		Grade:          grade,
		EnteredBy:      strVal(input.EnteredBy),
		AssessmentType: strVal(input.AssessmentType),
		AcademicYearID: strVal(input.AcademicYearID),
	}
	if input.SubjectID != nil {
		m.SubjectID = *input.SubjectID
	}

	if err := r.DB.WithContext(ctx).Create(&m).Error; err != nil {
		return nil, err
	}
	r.DB.WithContext(ctx).Preload("Student").Preload("Student.User").Where("id = ?", m.ID).First(&m)
	return markToModel(m), nil
}

// PublishResults bulk-publishes marks matching optional filters. Returns count updated.
func (r *mutationResolver) PublishResults(ctx context.Context, input model.PublishResultsInput) (int, error) {
	tenantID, err := r.tenantFromCtx(ctx)
	if err != nil {
		return 0, err
	}

	now := time.Now()
	query := r.DB.WithContext(ctx).
		Model(&models.Mark{}).
		Where("tenant_id = ? AND is_published = false", tenantID)

	if input.ExamType != nil && *input.ExamType != "" {
		query = query.Where("exam_type = ?", *input.ExamType)
	}
	if input.Subject != nil && *input.Subject != "" {
		query = query.Where("subject = ?", *input.Subject)
	}
	if input.Semester != nil {
		query = query.Where("semester = ?", *input.Semester)
	}
	if input.CourseID != nil && *input.CourseID != "" {
		query = query.Joins("JOIN students ON marks.student_id = students.id").
			Where("students.course_id = ?", *input.CourseID)
	}

	res := query.Updates(map[string]interface{}{
		"is_published": true,
		"published_at": now,
	})
	if res.Error != nil {
		return 0, res.Error
	}
	return int(res.RowsAffected), nil
}

// --- helpers ---

func calculateGrade(obtained, max float64) string {
	if max == 0 {
		return "N/A"
	}
	pct := (obtained / max) * 100
	switch {
	case pct >= 90:
		return "O"
	case pct >= 80:
		return "A+"
	case pct >= 70:
		return "A"
	case pct >= 60:
		return "B+"
	case pct >= 50:
		return "B"
	case pct >= 40:
		return "C"
	default:
		return "F"
	}
}

func markToModel(m models.Mark) *model.Mark {
	out := &model.Mark{
		ID:             m.ID,
		StudentID:      m.StudentID,
		Subject:        m.Subject,
		ExamType:       m.ExamType,
		Semester:       m.Semester,
		MarksObtained:  m.MarksObtained,
		MaxMarks:       m.MaxMarks,
		Grade:          toStrPtr(m.Grade),
		EnteredBy:      toStrPtr(m.EnteredBy),
		SubjectID:      toStrPtr(m.SubjectID),
		AssessmentType: toStrPtr(m.AssessmentType),
		Status:         toStrPtr(m.Status),
		AcademicYearID: toStrPtr(m.AcademicYearID),
		IsPublished:    m.IsPublished,
	}
	if m.PublishedAt != nil {
		d := m.PublishedAt.Format(time.RFC3339)
		out.PublishedAt = &d
	}
	if m.Student.ID != "" {
		out.Student = studentToModel(m.Student)
	}
	return out
}
```

**Note**: `AuthFromCtx` is the exported function from `auth_context.go` (check the actual function name — it may be `GetAuthFromCtx` or similar). Look at `employees.resolvers.go` to see how auth is extracted; use the same pattern. The `authInfo.UserID` and `authInfo.Role` field names depend on the `AuthInfo` struct in `auth_context.go`.

- [ ] **Step 2: Verify build**

```bash
cd backend && go build ./graph/... 2>&1
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd backend && git add graph/marks.resolvers.go && git commit -m "feat(graphql): marks and results resolvers with grade calculation"
```

---

### Task 5: Prune Batch 3 stubs from schema.resolvers.go

**Files:**
- Modify: `backend/graph/schema.resolvers.go`

gqlgen generated stubs for all Batch 3 methods in `schema.resolvers.go`. These are now implemented in the domain files. The duplicate declarations prevent the build from passing. Delete them from `schema.resolvers.go`.

- [ ] **Step 1: List the stubs to remove**

```bash
grep -n "func (r \*queryResolver)\|func (r \*mutationResolver)" backend/graph/schema.resolvers.go
```

Remove all methods that are implemented in `students.resolvers.go`, `academic.resolvers.go`, and `marks.resolvers.go`:
- `Students`, `Student`, `Courses`
- `Subjects`, `Subject`, `AcademicYears`, `ExamSchedules`
- `Marks`, `PublishedResults`, `ResultSummary`
- `CreateStudent`, `DeleteStudent`
- `CreateSubject`, `UpdateSubject`, `DeleteSubject`
- `CreateExamSchedule`, `UpdateExamSchedule`, `PublishExamSchedule`, `DeleteExamSchedule`
- `CreateMark`, `PublishResults`

Keep the `Health` method and any other Batch 1 methods if they weren't already moved.

- [ ] **Step 2: Verify build passes after pruning**

```bash
cd backend && go build ./graph/... 2>&1
```

Expected: no errors, no duplicate declarations.

- [ ] **Step 3: Commit**

```bash
cd backend && git add graph/schema.resolvers.go && git commit -m "chore(graphql): prune batch 3 stubs from schema.resolvers.go"
```

---

### Task 6: Frontend GraphQL queries and mutations for Batch 3

**Files:**
- Create: `frontend/graphql/queries/students.ts`
- Create: `frontend/graphql/mutations/students.ts`
- Create: `frontend/graphql/queries/academic.ts`
- Create: `frontend/graphql/mutations/academic.ts`
- Create: `frontend/graphql/queries/marks.ts`
- Create: `frontend/graphql/mutations/marks.ts`

- [ ] **Step 1: Create frontend/graphql/queries/students.ts**

```typescript
import { gql } from "@apollo/client";

export const LIST_STUDENTS = gql`
  query ListStudents($courseId: String, $semester: Int) {
    students(courseId: $courseId, semester: $semester) {
      id
      rollNumber
      section
      semester
      phone
      enrollDate
      dateOfBirth
      gender
      bloodGroup
      photoUrl
      address
      city
      state
      pincode
      nationality
      emergencyName
      emergencyPhone
      fatherName
      fatherPhone
      motherName
      motherPhone
      admissionStatus
      batch
      user {
        id
        name
        email
        role
        isActive
      }
      course {
        id
        name
        code
      }
    }
  }
`;

export const LIST_COURSES = gql`
  query ListCourses {
    courses {
      id
      name
      code
    }
  }
`;

export const GET_STUDENT = gql`
  query GetStudent($id: ID!) {
    student(id: $id) {
      id
      rollNumber
      section
      semester
      phone
      enrollDate
      dateOfBirth
      gender
      bloodGroup
      user {
        id
        name
        email
      }
      course {
        id
        name
        code
      }
    }
  }
`;
```

- [ ] **Step 2: Create frontend/graphql/mutations/students.ts**

```typescript
import { gql } from "@apollo/client";

export const CREATE_STUDENT = gql`
  mutation CreateStudent($input: CreateStudentInput!) {
    createStudent(input: $input) {
      id
      rollNumber
      user {
        id
        name
        email
      }
      course {
        id
        name
        code
      }
    }
  }
`;

export const DELETE_STUDENT = gql`
  mutation DeleteStudent($id: ID!) {
    deleteStudent(id: $id)
  }
`;
```

- [ ] **Step 3: Create frontend/graphql/queries/academic.ts**

```typescript
import { gql } from "@apollo/client";

export const LIST_SUBJECTS = gql`
  query ListSubjects($departmentId: String, $search: String) {
    subjects(departmentId: $departmentId, search: $search) {
      id
      name
      code
      credits
      teachingHours
      labHours
      semesterNumber
      description
      syllabusUrl
      departmentId
      department {
        id
        name
      }
    }
  }
`;

export const LIST_ACADEMIC_YEARS = gql`
  query ListAcademicYears {
    academicYears {
      id
      name
      startDate
      endDate
      isCurrent
    }
  }
`;

export const LIST_EXAM_SCHEDULES = gql`
  query ListExamSchedules($semesterNumber: Int, $examType: String) {
    examSchedules(semesterNumber: $semesterNumber, examType: $examType) {
      id
      name
      examType
      semesterNumber
      startDate
      endDate
      published
      instructions
      academicYearId
    }
  }
`;
```

- [ ] **Step 4: Create frontend/graphql/mutations/academic.ts**

```typescript
import { gql } from "@apollo/client";

export const CREATE_SUBJECT = gql`
  mutation CreateSubject($input: CreateSubjectInput!) {
    createSubject(input: $input) {
      id
      name
      code
      credits
      departmentId
      department {
        id
        name
      }
    }
  }
`;

export const UPDATE_SUBJECT = gql`
  mutation UpdateSubject($id: ID!, $input: UpdateSubjectInput!) {
    updateSubject(id: $id, input: $input) {
      id
      name
      code
      credits
      teachingHours
      labHours
      semesterNumber
      description
      syllabusUrl
      departmentId
      department {
        id
        name
      }
    }
  }
`;

export const DELETE_SUBJECT = gql`
  mutation DeleteSubject($id: ID!) {
    deleteSubject(id: $id)
  }
`;

export const CREATE_EXAM_SCHEDULE = gql`
  mutation CreateExamSchedule($input: CreateExamScheduleInput!) {
    createExamSchedule(input: $input) {
      id
      name
      examType
      semesterNumber
      startDate
      endDate
      published
      instructions
      academicYearId
    }
  }
`;

export const UPDATE_EXAM_SCHEDULE = gql`
  mutation UpdateExamSchedule($id: ID!, $input: UpdateExamScheduleInput!) {
    updateExamSchedule(id: $id, input: $input) {
      id
      name
      examType
      semesterNumber
      startDate
      endDate
      published
      instructions
      academicYearId
    }
  }
`;

export const PUBLISH_EXAM_SCHEDULE = gql`
  mutation PublishExamSchedule($id: ID!, $published: Boolean!) {
    publishExamSchedule(id: $id, published: $published) {
      id
      published
    }
  }
`;

export const DELETE_EXAM_SCHEDULE = gql`
  mutation DeleteExamSchedule($id: ID!) {
    deleteExamSchedule(id: $id)
  }
`;
```

- [ ] **Step 5: Create frontend/graphql/queries/marks.ts**

```typescript
import { gql } from "@apollo/client";

export const LIST_MARKS = gql`
  query ListMarks($studentId: String, $subjectId: String, $examType: String, $semester: Int) {
    marks(studentId: $studentId, subjectId: $subjectId, examType: $examType, semester: $semester) {
      id
      studentId
      subject
      examType
      semester
      marksObtained
      maxMarks
      grade
      enteredBy
      subjectId
      assessmentType
      status
      academicYearId
      isPublished
      publishedAt
      student {
        id
        rollNumber
        user {
          id
          name
        }
      }
    }
  }
`;

export const LIST_PUBLISHED_RESULTS = gql`
  query ListPublishedResults($examType: String, $subject: String, $semester: Int, $courseId: String) {
    publishedResults(examType: $examType, subject: $subject, semester: $semester, courseId: $courseId) {
      id
      studentId
      subject
      examType
      semester
      marksObtained
      maxMarks
      grade
      isPublished
      student {
        id
        rollNumber
        user {
          id
          name
        }
        course {
          id
          name
        }
      }
    }
  }
`;

export const GET_RESULT_SUMMARY = gql`
  query GetResultSummary($courseId: String!, $semester: Int!) {
    resultSummary(courseId: $courseId, semester: $semester) {
      totalStudents
      passCount
      failCount
    }
  }
`;
```

- [ ] **Step 6: Create frontend/graphql/mutations/marks.ts**

```typescript
import { gql } from "@apollo/client";

export const CREATE_MARK = gql`
  mutation CreateMark($input: CreateMarkInput!) {
    createMark(input: $input) {
      id
      studentId
      subject
      examType
      semester
      marksObtained
      maxMarks
      grade
      status
    }
  }
`;

export const PUBLISH_RESULTS = gql`
  mutation PublishResults($input: PublishResultsInput!) {
    publishResults(input: $input)
  }
`;
```

- [ ] **Step 7: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

Expected: no NEW errors in the graphql/ files. Pre-existing errors in other files are known and acceptable.

- [ ] **Step 8: Commit**

```bash
cd frontend && git add graphql/queries/students.ts graphql/mutations/students.ts graphql/queries/academic.ts graphql/mutations/academic.ts graphql/queries/marks.ts graphql/mutations/marks.ts && git commit -m "feat(graphql): batch 3 frontend queries and mutations"
```

---

### Task 7: Migrate students/page.tsx to Apollo

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/students/page.tsx`

**IMPORTANT**: The bulk CSV import feature calls `studentsAPI.bulkImport` — keep this REST call unchanged. Only the list/create/delete operations move to GraphQL.

The page currently uses:
- `dispatch(fetchStudents())` → replace with `useQuery(LIST_STUDENTS)`
- `dispatch(fetchUsers())` → replace with `useQuery(LIST_USERS)` from `graphql/queries/employees.ts` (already exists from Batch 1)
- `dispatch(fetchCourses())` → replace with `useQuery(LIST_COURSES)`
- `dispatch(createStudent(data))` → replace with `useMutation(CREATE_STUDENT)`
- `dispatch(deleteStudent(id))` → replace with `useMutation(DELETE_STUDENT)`
- `studentsAPI.bulkImport(csv)` → **keep as-is** (REST)
- `useAppSelector(s => s.auth)` → **keep as-is** (auth stays Redux until Batch 9)

- [ ] **Step 1: Read the current file**

Read `frontend/app/[tenant]/(dashboard)/students/page.tsx` fully to understand the component structure before making changes.

- [ ] **Step 2: Rewrite the data layer of students/page.tsx**

Replace the Redux imports and data fetching with Apollo. Key transformations:

**Remove these imports:**
```typescript
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchStudents, createStudent, deleteStudent } from "@/store/slices/studentSlice";
import { fetchUsers } from "@/store/slices/userSlice";
import { fetchCourses } from "@/store/slices/courseSlice"; // or wherever courses come from
```

**Add these imports:**
```typescript
import { useQuery, useMutation } from "@apollo/client";
import { LIST_STUDENTS, LIST_COURSES } from "@/graphql/queries/students";
import { CREATE_STUDENT, DELETE_STUDENT } from "@/graphql/mutations/students";
import { LIST_USERS } from "@/graphql/queries/employees";
```

**Replace Redux dispatch with Apollo hooks:**
```typescript
// Remove: const dispatch = useAppDispatch();
// Remove: useEffect(() => { dispatch(fetchStudents()); dispatch(fetchUsers()); ... }, [])
// Remove: const { students, users, courses, loading } = useAppSelector(...)

const { data: studentsData, loading: studentsLoading, refetch: refetchStudents } = useQuery(LIST_STUDENTS);
const { data: usersData } = useQuery(LIST_USERS);
const { data: coursesData } = useQuery(LIST_COURSES);

const [createStudentMutation] = useMutation(CREATE_STUDENT, {
  refetchQueries: [{ query: LIST_STUDENTS }],
});
const [deleteStudentMutation] = useMutation(DELETE_STUDENT, {
  refetchQueries: [{ query: LIST_STUDENTS }],
});

const students = studentsData?.students ?? [];
const users = usersData?.users ?? [];
const courses = coursesData?.courses ?? [];
const loading = studentsLoading;
```

**Add local types at the top of the component file (after imports):**
```typescript
type GqlStudent = {
  id: string;
  rollNumber: string;
  section?: string | null;
  semester?: number | null;
  phone?: string | null;
  enrollDate?: string | null;
  admissionStatus?: string | null;
  batch?: string | null;
  user?: { id: string; name: string; email: string; role: string; isActive: boolean } | null;
  course?: { id: string; name: string; code: string } | null;
};
type GqlUser = { id: string; name: string; email: string; role: string; isActive: boolean };
type GqlCourse = { id: string; name: string; code: string };
```

**Update field references** (snake_case → camelCase):
- `student.roll_number` → `student.rollNumber`
- `student.enroll_date` → `student.enrollDate`
- `student.admission_status` → `student.admissionStatus`
- `student.user_id` → `student.user?.id`
- `student.course_id` → `student.course?.id`

**Keep the bulk import section unchanged** — `studentsAPI.bulkImport(csvText)` stays as-is.

**Keep auth:**
```typescript
const { role } = useAppSelector((s) => s.auth);
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "students/page" | head -20
```

Expected: no errors in students/page.tsx.

- [ ] **Step 4: Commit**

```bash
cd frontend && git add "app/[tenant]/(dashboard)/students/page.tsx" && git commit -m "feat(graphql): migrate students page to Apollo (keep bulk import as REST)"
```

---

### Task 8: Migrate academic/subjects/page.tsx and academic/exams/page.tsx to Apollo

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/academic/subjects/page.tsx`
- Modify: `frontend/app/[tenant]/(dashboard)/academic/exams/page.tsx`

**Subjects page** uses:
- `dispatch(fetchSubjects())` → `useQuery(LIST_SUBJECTS)`
- `dispatch(fetchDepartments())` → `useQuery(LIST_DEPARTMENTS)` from `graphql/queries/employees.ts` (Batch 1)
- `dispatch(createSubject(data))` → `useMutation(CREATE_SUBJECT)`
- `dispatch(updateSubject({ id, ...data }))` → `useMutation(UPDATE_SUBJECT)`
- `dispatch(deleteSubject(id))` → `useMutation(DELETE_SUBJECT)`

**Exams page** uses:
- `dispatch(fetchExamSchedules())` → `useQuery(LIST_EXAM_SCHEDULES)`
- `dispatch(fetchAcademicYears())` from orgSlice → `useQuery(LIST_ACADEMIC_YEARS)` (no longer needs Redux)
- `dispatch(createExamSchedule(data))` → `useMutation(CREATE_EXAM_SCHEDULE)`
- `dispatch(updateExamSchedule({ id, ...data }))` → `useMutation(UPDATE_EXAM_SCHEDULE)`
- `dispatch(publishExamSchedule(id))` → `useMutation(PUBLISH_EXAM_SCHEDULE)`
- `dispatch(deleteExamSchedule(id))` → `useMutation(DELETE_EXAM_SCHEDULE)`

- [ ] **Step 1: Read both current page files**

Read `frontend/app/[tenant]/(dashboard)/academic/subjects/page.tsx` and `frontend/app/[tenant]/(dashboard)/academic/exams/page.tsx` fully before editing.

- [ ] **Step 2: Migrate subjects/page.tsx**

**Remove Redux imports** for academicSlice and orgSlice related to subjects/departments.

**Add Apollo imports:**
```typescript
import { useQuery, useMutation } from "@apollo/client";
import { LIST_SUBJECTS } from "@/graphql/queries/academic";
import { CREATE_SUBJECT, UPDATE_SUBJECT, DELETE_SUBJECT } from "@/graphql/mutations/academic";
import { LIST_DEPARTMENTS } from "@/graphql/queries/employees";
```

**Replace data fetching:**
```typescript
const { data: subjectsData, loading } = useQuery(LIST_SUBJECTS, {
  variables: { departmentId: selectedDepartment || undefined, search: searchText || undefined },
});
const { data: deptsData } = useQuery(LIST_DEPARTMENTS);

const [createSubjectMutation] = useMutation(CREATE_SUBJECT, {
  refetchQueries: [{ query: LIST_SUBJECTS }],
});
const [updateSubjectMutation] = useMutation(UPDATE_SUBJECT, {
  refetchQueries: [{ query: LIST_SUBJECTS }],
});
const [deleteSubjectMutation] = useMutation(DELETE_SUBJECT, {
  refetchQueries: [{ query: LIST_SUBJECTS }],
});

const subjects = subjectsData?.subjects ?? [];
const departments = deptsData?.departments ?? [];
```

**Add local types:**
```typescript
type GqlSubject = {
  id: string;
  name: string;
  code: string;
  credits?: number | null;
  teachingHours?: number | null;
  labHours?: number | null;
  semesterNumber?: number | null;
  description?: string | null;
  syllabusUrl?: string | null;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
};
type GqlDepartment = { id: string; name: string };
```

**Field mapping** (check actual page field names and map accordingly):
- `subject.teaching_hours` → `subject.teachingHours`
- `subject.lab_hours` → `subject.labHours`
- `subject.semester_number` → `subject.semesterNumber`
- `subject.syllabus_url` → `subject.syllabusUrl`
- `subject.department_id` → `subject.departmentId`

- [ ] **Step 3: Migrate exams/page.tsx**

**Remove Redux imports** for academicSlice (examSchedules) and orgSlice (academicYears).

**Add Apollo imports:**
```typescript
import { useQuery, useMutation } from "@apollo/client";
import { LIST_EXAM_SCHEDULES, LIST_ACADEMIC_YEARS } from "@/graphql/queries/academic";
import {
  CREATE_EXAM_SCHEDULE,
  UPDATE_EXAM_SCHEDULE,
  PUBLISH_EXAM_SCHEDULE,
  DELETE_EXAM_SCHEDULE,
} from "@/graphql/mutations/academic";
```

**Replace data fetching:**
```typescript
const { data: examsData, loading } = useQuery(LIST_EXAM_SCHEDULES);
const { data: academicYearsData } = useQuery(LIST_ACADEMIC_YEARS);

const [createExamMutation] = useMutation(CREATE_EXAM_SCHEDULE, {
  refetchQueries: [{ query: LIST_EXAM_SCHEDULES }],
});
const [updateExamMutation] = useMutation(UPDATE_EXAM_SCHEDULE, {
  refetchQueries: [{ query: LIST_EXAM_SCHEDULES }],
});
const [publishExamMutation] = useMutation(PUBLISH_EXAM_SCHEDULE, {
  refetchQueries: [{ query: LIST_EXAM_SCHEDULES }],
});
const [deleteExamMutation] = useMutation(DELETE_EXAM_SCHEDULE, {
  refetchQueries: [{ query: LIST_EXAM_SCHEDULES }],
});

const examSchedules = examsData?.examSchedules ?? [];
const academicYears = academicYearsData?.academicYears ?? [];
```

**Add local types:**
```typescript
type GqlExamSchedule = {
  id: string;
  name: string;
  examType: string;
  semesterNumber?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  published: boolean;
  instructions?: string | null;
  academicYearId?: string | null;
};
type GqlAcademicYear = { id: string; name: string; startDate: string; endDate: string; isCurrent: boolean };
```

**Field mapping:**
- `exam.semester_number` → `exam.semesterNumber`
- `exam.start_date` → `exam.startDate`
- `exam.end_date` → `exam.endDate`
- `exam.academic_year_id` → `exam.academicYearId`
- `year.is_current` → `year.isCurrent`
- `year.start_date` → `year.startDate`
- `year.end_date` → `year.endDate`

**Keep auth:**
```typescript
const { role } = useAppSelector((s) => s.auth);
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "subjects/page|exams/page" | head -20
```

Expected: no new errors in these files.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add "app/[tenant]/(dashboard)/academic/subjects/page.tsx" "app/[tenant]/(dashboard)/academic/exams/page.tsx" && git commit -m "feat(graphql): migrate subjects and exam schedules pages to Apollo"
```

---

### Task 9: Migrate marks/page.tsx and results/page.tsx to Apollo

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/marks/page.tsx`
- Modify: `frontend/app/[tenant]/(dashboard)/results/page.tsx`

**Marks page** uses:
- `dispatch(fetchMarks(filters))` → `useQuery(LIST_MARKS, { variables: filters })`
- `dispatch(fetchStudents())` → `useQuery(LIST_STUDENTS)` from `graphql/queries/students.ts`
- `dispatch(createMark(data))` → `useMutation(CREATE_MARK)`
- `useAppSelector(s => s.auth)` → keep for role-based display (admin/teacher can create)

**Results page** uses:
- `dispatch(publishResults(filters))` → `useMutation(PUBLISH_RESULTS)`
- `dispatch(fetchPublishedResults(filters))` → `useQuery(LIST_PUBLISHED_RESULTS, { variables: filters })`
- `dispatch(fetchResultSummary({ courseId, semester }))` → `useQuery(GET_RESULT_SUMMARY, { variables: { courseId, semester } })`
- Filters: `exam_id`/`subject_id`/`course_id` in frontend but backend takes `examType`/`subject`/`courseId` — use `examType`, `subject`, `semester`, `courseId` in GraphQL variables

- [ ] **Step 1: Read both current page files**

Read `frontend/app/[tenant]/(dashboard)/marks/page.tsx` and `frontend/app/[tenant]/(dashboard)/results/page.tsx` fully before editing.

- [ ] **Step 2: Migrate marks/page.tsx**

**Remove Redux imports** for marksSlice and studentSlice.

**Add Apollo imports:**
```typescript
import { useQuery, useMutation } from "@apollo/client";
import { LIST_MARKS } from "@/graphql/queries/marks";
import { CREATE_MARK } from "@/graphql/mutations/marks";
import { LIST_STUDENTS } from "@/graphql/queries/students";
```

**Replace data fetching:**
```typescript
const [filters, setFilters] = useState<{
  studentId?: string;
  subjectId?: string;
  examType?: string;
  semester?: number;
}>({});

const { data: marksData, loading } = useQuery(LIST_MARKS, {
  variables: filters,
});
const { data: studentsData } = useQuery(LIST_STUDENTS);

const [createMarkMutation] = useMutation(CREATE_MARK, {
  refetchQueries: [{ query: LIST_MARKS, variables: filters }],
});

const marks = marksData?.marks ?? [];
const students = studentsData?.students ?? [];
```

**Add local types:**
```typescript
type GqlMark = {
  id: string;
  studentId: string;
  subject: string;
  examType: string;
  semester: number;
  marksObtained: number;
  maxMarks: number;
  grade?: string | null;
  enteredBy?: string | null;
  subjectId?: string | null;
  assessmentType?: string | null;
  status?: string | null;
  isPublished: boolean;
  student?: {
    id: string;
    rollNumber: string;
    user?: { id: string; name: string } | null;
  } | null;
};
```

**Field mapping:**
- `mark.marks_obtained` → `mark.marksObtained`
- `mark.max_marks` → `mark.maxMarks`
- `mark.is_published` → `mark.isPublished`
- `mark.assessment_type` → `mark.assessmentType`
- `mark.student_id` → `mark.studentId`
- `mark.subject_id` → `mark.subjectId`

**Keep auth:**
```typescript
const { role } = useAppSelector((s) => s.auth);
```

- [ ] **Step 3: Migrate results/page.tsx**

**Remove Redux imports** for resultsSlice.

**Add Apollo imports:**
```typescript
import { useQuery, useMutation } from "@apollo/client";
import { LIST_PUBLISHED_RESULTS, GET_RESULT_SUMMARY } from "@/graphql/queries/marks";
import { PUBLISH_RESULTS } from "@/graphql/mutations/marks";
```

**Replace data fetching:**
```typescript
const [resultFilters, setResultFilters] = useState<{
  examType?: string;
  subject?: string;
  semester?: number;
  courseId?: string;
}>({});

const [summaryParams, setSummaryParams] = useState<{ courseId: string; semester: number } | null>(null);

const { data: resultsData, loading: resultsLoading } = useQuery(LIST_PUBLISHED_RESULTS, {
  variables: resultFilters,
});
const { data: summaryData } = useQuery(GET_RESULT_SUMMARY, {
  variables: summaryParams ?? { courseId: "", semester: 0 },
  skip: !summaryParams,
});

const [publishResultsMutation, { loading: publishing }] = useMutation(PUBLISH_RESULTS, {
  refetchQueries: [
    { query: LIST_PUBLISHED_RESULTS, variables: resultFilters },
  ],
});

const publishedResults = resultsData?.publishedResults ?? [];
const summary = summaryData?.resultSummary;
```

**Note on filter field names**: The frontend page may pass `exam_id`/`subject_id` to the Redux action. With GraphQL, the variables are `examType`, `subject`, `semester`, `courseId` (matching the schema). Check the filter state object in the existing page and rename the state fields accordingly.

**Add local types:**
```typescript
type GqlPublishedResult = {
  id: string;
  studentId: string;
  subject: string;
  examType: string;
  semester: number;
  marksObtained: number;
  maxMarks: number;
  grade?: string | null;
  isPublished: boolean;
  student?: {
    id: string;
    rollNumber: string;
    user?: { id: string; name: string } | null;
    course?: { id: string; name: string } | null;
  } | null;
};
type GqlResultSummary = { totalStudents: number; passCount: number; failCount: number };
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "marks/page|results/page" | head -20
```

Expected: no new errors in these files.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add "app/[tenant]/(dashboard)/marks/page.tsx" "app/[tenant]/(dashboard)/results/page.tsx" && git commit -m "feat(graphql): migrate marks and results pages to Apollo"
```
