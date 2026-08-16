# Phase 6 — Student Life & Campus Ops

Three campus modules: homework/assignment submission, mess/canteen management (tied to Phase 2
vendors/POs for provisioning), and transport GPS + driver attendance. Effort ~3-4 weeks. Depends on
Phase 2 (mess procurement) and existing transport/hostel modules. All GraphQL. Education-tagged.

## Modules & fine access ids

`assignments` (teacher) + student portal view, `mess`, `transport-live` (extends existing transport).

## 6a. Homework / assignment module

Distinct from the existing employee L&D `LearningAssignment` — this is student coursework. Two new
models: teacher-created assignment + student submission.

**`backend/models/student_assignment.go`**
```go
package models

const (
    AssignmentDraft     = "draft"
    AssignmentPublished = "published"
    AssignmentClosed    = "closed"
)

type StudentAssignment struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index" json:"tenant_id"`

    Title       string `gorm:"not null" json:"title"`
    Description string `gorm:"type:text" json:"description"`

    // Scope: which course-semester-subject this is set for. Reuse existing ids.
    CourseID   string `gorm:"index" json:"course_id"`
    Semester   int    `json:"semester"`
    Section    string `json:"section"`
    SubjectID  string `gorm:"index" json:"subject_id"`

    TeacherID  string   `gorm:"not null;index" json:"teacher_id"`
    Teacher    Employee `gorm:"foreignKey:TeacherID" json:"teacher,omitempty"`

    MaxMarks   float64 `gorm:"default:0" json:"max_marks"`
    DueDate    string  `gorm:"index" json:"due_date"` // YYYY-MM-DD
    // AttachmentURL: optional teacher handout (uploaded via existing upload path).
    AttachmentURL string `json:"attachment_url"`
    Status     string  `gorm:"default:'draft';index" json:"status"`

    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
func (a *StudentAssignment) BeforeCreate(tx *gorm.DB) error { /* uuid */ }

type AssignmentSubmission struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index;uniqueIndex:idx_submission_uniq" json:"tenant_id"`

    AssignmentID string `gorm:"not null;index;uniqueIndex:idx_submission_uniq" json:"assignment_id"`
    StudentID    string `gorm:"not null;index;uniqueIndex:idx_submission_uniq" json:"student_id"`
    Student      Student `gorm:"foreignKey:StudentID" json:"student,omitempty"`

    SubmittedAt   string `gorm:"index" json:"submitted_at"` // YYYY-MM-DD
    Text          string `gorm:"type:text" json:"text"`     // typed answer
    AttachmentURL string `json:"attachment_url"`            // uploaded file

    // Grading (teacher).
    Status     string  `gorm:"default:'submitted';index" json:"status"` // submitted | graded | returned
    MarksAwarded *float64 `json:"marks_awarded"`
    Feedback   string  `gorm:"type:text" json:"feedback"`
    GradedByID string  `gorm:"index" json:"graded_by_id"`

    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
func (s *AssignmentSubmission) BeforeCreate(tx *gorm.DB) error { /* uuid */ }
```
Composite unique index = one submission per (student, assignment) (resubmission overwrites via
update).

**Resolvers**:
- `graph/assignments.resolvers.go` (teacher/admin): `assignments(courseId, subjectId, status)`,
  `createAssignment`/`update`/`publishAssignment`/`closeAssignment`/`delete`,
  `assignmentSubmissions(assignmentId)`, `gradeSubmission(id, marks, feedback)`.
  `requireRole(ctx, roleAdmin, roleTeacher)`.
- `graph/assignments_portal.resolvers.go` (student self-service, unenforced like other `my*`):
  `myAssignments(status)` (published assignments for the student's course/semester/section joined
  with own submission), `submitAssignment(assignmentId, input)` (upsert own submission; block after
  `closed`/past due unless allowed). `requireRole(ctx, roleStudent)` + owns-record checks.

**File uploads** reuse the existing upload endpoint (attachments are URLs on the model, same as
`AttachmentURL` elsewhere); no new storage work.

## 6b. Mess / canteen module

Menus, daily attendance/opt-in, and expenses that tie into Phase 2 vendors/POs for provisioning.

**`backend/models/mess.go`**
```go
type MessMenu struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index" json:"tenant_id"`
    // Weekly template: day + meal → items. DayOfWeek 0..6, Meal enum.
    DayOfWeek int    `gorm:"index" json:"day_of_week"`
    Meal      string `gorm:"index" json:"meal"` // breakfast | lunch | snacks | dinner
    Items     string `gorm:"type:text" json:"items"` // JSON/newline list
    HostelBlockID string `gorm:"index" json:"hostel_block_id"` // optional per-block menu
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
func (m *MessMenu) BeforeCreate(tx *gorm.DB) error { /* uuid */ }

type MessAttendance struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index;uniqueIndex:idx_messatt_uniq" json:"tenant_id"`
    StudentID string `gorm:"not null;index;uniqueIndex:idx_messatt_uniq" json:"student_id"`
    Date     string `gorm:"not null;index;uniqueIndex:idx_messatt_uniq" json:"date"` // YYYY-MM-DD
    Meal     string `gorm:"not null;uniqueIndex:idx_messatt_uniq" json:"meal"`
    Present  bool   `gorm:"default:true" json:"present"` // consumed / opted-in
    CreatedAt time.Time `json:"created_at"`
}
func (m *MessAttendance) BeforeCreate(tx *gorm.DB) error { /* uuid */ }

// MessExpense: provisioning cost, optionally linked to a Phase 2 PurchaseOrder.
type MessExpense struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index" json:"tenant_id"`
    Date     string `gorm:"index" json:"date"`
    Category string `json:"category"` // groceries | gas | staff | other
    Description string `json:"description"`
    Amount   float64 `gorm:"not null;default:0" json:"amount"`
    VendorID string  `gorm:"index" json:"vendor_id"`          // Phase 2 vendor
    PurchaseOrderID string `gorm:"index" json:"purchase_order_id"` // Phase 2 PO link
    CreatedAt time.Time `json:"created_at"`
}
func (m *MessExpense) BeforeCreate(tx *gorm.DB) error { /* uuid */ }
```
Composite unique on `MessAttendance` = one row per (student, date, meal).

**Resolvers** `graph/mess.resolvers.go`: menu CRUD; `messAttendance(date, meal)` + a bulk
`markMessAttendance(date, meal, studentIds)` (roster-style, like the existing bulk attendance);
`messExpenses(from, to)` + CRUD. `requireRole(ctx, roleAdmin, roleStaff)`. `myMessMenu` self-service
for students (this week's menu for their block). Expenses reference Phase 2 vendors/POs; when Phase 3
is live, `MessExpense` can post to GL (debit `mess_expense`, credit `cash`/`ap_vendors`) — add that
system account and posting call if Phase 3 precedes this.

## 6c. Transport GPS + driver attendance

Extend the existing `TransportVehicle` with a last-known position; add a driver-attendance model
keyed to the existing `Employee`.

**Add to `models.TransportVehicle`:**
```go
Latitude   float64 `gorm:"default:0" json:"latitude"`
Longitude  float64 `gorm:"default:0" json:"longitude"`
LastPingAt *time.Time `json:"last_ping_at"` // when position last updated
DriverEmployeeID string `gorm:"index" json:"driver_employee_id"` // link driver to Employee (was free-text DriverName)
```
Keep existing `DriverName`/`DriverPhone` for backward compatibility; `DriverEmployeeID` is the new
canonical link enabling driver attendance.

**`backend/models/driver_attendance.go`**
```go
type DriverAttendance struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index;uniqueIndex:idx_driveratt_uniq" json:"tenant_id"`
    EmployeeID string `gorm:"not null;index;uniqueIndex:idx_driveratt_uniq" json:"employee_id"`
    Employee   Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
    VehicleID  string `gorm:"index" json:"vehicle_id"`
    Date       string `gorm:"not null;index;uniqueIndex:idx_driveratt_uniq" json:"date"` // YYYY-MM-DD
    CheckInAt  string `json:"check_in_at"`  // HH:MM
    CheckOutAt string `json:"check_out_at"`
    Status     string `gorm:"default:'present'" json:"status"` // present | absent | leave
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
func (d *DriverAttendance) BeforeCreate(tx *gorm.DB) error { /* uuid */ }
```

**Resolvers** `graph/transport_live.resolvers.go`:
- `pingVehicleLocation(vehicleId, lat, lng)` — updates position + `LastPingAt`. Called by a manual
  check-in on the driver's device or a device webhook; keep it a GraphQL mutation gated
  `requireRole(ctx, roleAdmin, roleStaff)` (driver logs in as staff). For a live GPS feed later, a
  lightweight REST ping endpoint can be added, but manual/periodic ping via GraphQL is the Phase 6
  scope.
- `liveVehicles` — all vehicles with position + `LastPingAt` for the map.
- `driverAttendance(date)` + `markDriverAttendance(input)` / `driverCheckIn`/`driverCheckOut`.

## Schema

Add all six models' types + inputs + queries/mutations to `schema.graphqls` under
`# ── Student Life ──` / `# ── Mess ──` / `# ── Transport Live ──` banners; new vehicle fields to
`type TransportVehicle`. Run `regen.sh`.

## Access / subscription / industry

`access_registry.go` `AccessModules`:
```go
{"assignments",    "Assignments",   "Academics", []string{"admin", "teacher"}},
{"mess",           "Mess & Canteen","Campus",    []string{"admin", "staff"}},
{"transport-live", "Live Transport","Campus",    []string{"admin", "staff"}},
```
`subscription_modules.go` `defaultPageMap`: `assignments` → `academic`; `mess` → `hostel` (or a new
`campus` coarse module — recommend reusing `hostel`/`transport` coarse modules if they exist,
otherwise `campus`); `transport-live` → existing `transport` coarse module. `access_industries.go`:
tag all three `{TenantTypeEducation}` (mirror frontend). Student portal views
(`portal/assignments`, portal mess menu) are self-service → add `portal`-style modules to
`ROLE_LOCKED_MODULES` in `lib/access.ts` so they don't leak into admin nav.
`opAccess` (`access_enforce.go`): map writes — assignment create/publish/close/grade →
`assignments`; mess menu/attendance/expense writes → `mess`; `pingVehicleLocation`/driver-attendance
writes → `transport-live`. Leave `myAssignments`/`submitAssignment`/`myMessMenu`/`liveVehicles`
reads unenforced (self-service/dashboard).

## PDF

Optional: assignment grade sheet and mess monthly expense report reuse the standard loader→template
→handler→route pattern. Not required for MVP.

## Frontend

Pages: `academic/assignments` (teacher) + `portal/assignments` (student); `hostel/mess` (staff) +
portal mess menu; `transport/live` (map). Components:
- assignments: teacher `Page.tsx`/`AssignmentModal.tsx`/`SubmissionsTable.tsx`/`GradeModal.tsx`;
  student `Page.tsx`/`SubmitModal.tsx`.
- mess: `MenuGrid.tsx` (week × meal), `MessAttendanceGrid.tsx`, `ExpenseTable.tsx` (with vendor/PO
  pickers reusing Phase 2 queries).
- transport-live: a map view (`LiveMap.tsx`) plotting `liveVehicles` lat/lng (Leaflet/Google
  Maps embed), `DriverAttendanceTable.tsx`.
GraphQL docs in `graphql/queries|mutations/campus.ts` (or split assignments/mess/transport). Nav
rows under Academics/Campus sections; gate with `<Can>`.

## Cascade

Per-person models: add to `deleteStudentCascade` — delete `AssignmentSubmission`, `MessAttendance`
by student. Add to `deleteEmployeeCascade` — delete `DriverAttendance` by employee; blank
`StudentAssignment.TeacherID`? No: assignments should not be orphaned to blank — instead block
teacher deletion when they own published assignments, or reassign. Simpler: delete draft
assignments, block if published (`GQLErr`), consistent with in-code referential guards. Also blank
`TransportVehicle.DriverEmployeeID` when the driver employee is deleted.

## Test / done

- `graph/assignments_test.go`: submit upserts one row per (student, assignment); grading sets marks;
  submission blocked after close.
- `graph/mess_test.go`: attendance unique per (student, date, meal); expense links a valid vendor/PO.
- `graph/transport_live_test.go`: `pingVehicleLocation` updates position + `LastPingAt`; driver
  attendance unique per (employee, date).
- `--migrate` (5 new tables + TransportVehicle columns); `regen.sh` + `go build` + `npm run build` clean.
