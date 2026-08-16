# Learning Matrix Module — Design Spec
**Date:** 2026-04-19  
**Status:** Approved

---

## Overview

A learning matrix module for Peepal that allows admins to define learning goals (named courses/trainings), build them using a structured **Section → Unit + Assignment** hierarchy, assign them to departments (cascading to all employees), and track mandatory completion. Employees experience a LinkedIn Learning–style sequential sidebar with sections, units, and assignments.

---

## Section 1: Data Models

New file: `backend/models/learning.go`

### Hierarchy

```
LearningGoal
  └── LearningSection (ordered)
        ├── LearningUnit (ordered — content: video + text)
        └── LearningAssignment (ordered — assessment: completion or score)
```

Units and assignments are siblings within a section, ordered together by `order_index`. Sequential locking applies across all items (units + assignments) in order within each section, and sections unlock in sequence.

---

### LearningGoal
```go
type LearningGoal struct {
    ID          string           `gorm:"primaryKey"`
    TenantID    string           `gorm:"not null;index"`
    Title       string           `gorm:"not null"`
    Description string
    DueDate     *time.Time
    IsMandatory bool             `gorm:"default:false"`
    CreatedAt   time.Time
    UpdatedAt   time.Time
    Sections    []LearningSection `gorm:"foreignKey:GoalID;orderBy:order_index asc"`
}
```

### LearningSection
```go
type LearningSection struct {
    ID          string              `gorm:"primaryKey"`
    GoalID      string              `gorm:"not null;index"`
    Title       string              `gorm:"not null"`
    OrderIndex  int                 `gorm:"not null"`
    CreatedAt   time.Time
    UpdatedAt   time.Time
    Units       []LearningUnit       `gorm:"foreignKey:SectionID;orderBy:order_index asc"`
    Assignments []LearningAssignment `gorm:"foreignKey:SectionID;orderBy:order_index asc"`
}
```

### LearningUnit
```go
type LearningUnit struct {
    ID               string `gorm:"primaryKey"`
    SectionID        string `gorm:"not null;index"`
    Title            string `gorm:"not null"`
    Description      string
    OrderIndex       int    `gorm:"not null"`
    VideoType        string // "none" | "upload" | "external"
    VideoURL         string // external URL (YouTube, Vimeo, etc.)
    VideoStoragePath string // server file path for uploaded videos
    CreatedAt        time.Time
    UpdatedAt        time.Time
}
```

### LearningAssignment
```go
type LearningAssignment struct {
    ID             string  `gorm:"primaryKey"`
    SectionID      string  `gorm:"not null;index"`
    Title          string  `gorm:"not null"`
    Description    string
    OrderIndex     int     `gorm:"not null"`
    AssessmentType string  `gorm:"not null"` // "completion" | "score"
    PassScore      float64 // used when AssessmentType = "score" (e.g. 70.0 = 70%)
    CreatedAt      time.Time
    UpdatedAt      time.Time
}
```

### GoalAssignment
```go
type GoalAssignment struct {
    ID           string     `gorm:"primaryKey"`
    TenantID     string     `gorm:"not null;index;uniqueIndex:idx_goal_dept"`
    GoalID       string     `gorm:"not null;uniqueIndex:idx_goal_dept"`
    DepartmentID string     `gorm:"not null;uniqueIndex:idx_goal_dept"`
    Goal         LearningGoal
    Department   Department `gorm:"foreignKey:DepartmentID"`
    CreatedAt    time.Time
}
```
Creating a `GoalAssignment` triggers creation of `EmployeeGoalProgress` (and all child `UnitProgress` + `AssignmentProgress` rows) for every employee in the department.

### EmployeeGoalProgress
```go
type EmployeeGoalProgress struct {
    ID                 string               `gorm:"primaryKey"`
    TenantID           string               `gorm:"not null;index"`
    EmployeeID         string               `gorm:"not null;index;uniqueIndex:idx_emp_goal"`
    GoalID             string               `gorm:"not null;uniqueIndex:idx_emp_goal"`
    AssignmentID       string               `gorm:"not null"`
    Status             string               `gorm:"default:'not_started'"` // "not_started" | "in_progress" | "completed"
    CompletedAt        *time.Time
    CreatedAt          time.Time
    UpdatedAt          time.Time
    UnitProgress       []UnitProgress       `gorm:"foreignKey:EmployeeGoalProgressID"`
    AssignmentProgress []AssignmentProgress `gorm:"foreignKey:EmployeeGoalProgressID"`
}
```

### UnitProgress
```go
type UnitProgress struct {
    ID                     string     `gorm:"primaryKey"`
    EmployeeGoalProgressID string     `gorm:"not null;index;uniqueIndex:idx_emp_unit"`
    UnitID                 string     `gorm:"not null;uniqueIndex:idx_emp_unit"`
    Status                 string     `gorm:"default:'pending'"` // "pending" | "completed"
    CompletedAt            *time.Time
    CreatedAt              time.Time
    UpdatedAt              time.Time
}
```

### AssignmentProgress
```go
type AssignmentProgress struct {
    ID                     string     `gorm:"primaryKey"`
    EmployeeGoalProgressID string     `gorm:"not null;index;uniqueIndex:idx_emp_assignment"`
    AssignmentID           string     `gorm:"not null;uniqueIndex:idx_emp_assignment"`
    Status                 string     `gorm:"default:'pending'"` // "pending" | "passed" | "failed"
    Score                  *float64   // nullable; used for score-based assignments
    CompletedAt            *time.Time
    CreatedAt              time.Time
    UpdatedAt              time.Time
}
```

---

### Auto-complete Rule
After any `UnitProgress` or `AssignmentProgress` update, within a single DB transaction:
- If all `UnitProgress` rows are `"completed"` AND all `AssignmentProgress` rows are `"passed"`, set `EmployeeGoalProgress.status = "completed"` and `completed_at = now()`.
- Otherwise if any row is non-pending, set status to `"in_progress"`.

### Sequential Locking Rule
Items within a section are ordered together by `order_index` (units and assignments interleaved). An item at position N is accessible only when position N-1 is completed/passed. The first item in the first section is always unlocked. Sections unlock sequentially — the first item of Section N is locked until all items in Section N-1 are complete. Enforced server-side.

---

## Section 2: GraphQL Schema

Added to `backend/graph/schema.graphqls`.

### Types
```graphql
type LearningGoal {
  id: ID!
  title: String!
  description: String
  dueDate: String
  isMandatory: Boolean!
  sections: [LearningSection!]!
  createdAt: String!
}

type LearningSection {
  id: ID!
  goalId: ID!
  title: String!
  orderIndex: Int!
  items: [LearningItem!]!   # unified ordered list of units + assignments
}

# Discriminated union — frontend checks itemType to render correctly
type LearningItem {
  id: ID!
  sectionId: ID!
  itemType: String!         # "unit" | "assignment"
  orderIndex: Int!
  title: String!
  description: String

  # Unit fields (null when itemType = "assignment")
  videoType: String         # "none" | "upload" | "external"
  videoUrl: String

  # Assignment fields (null when itemType = "unit")
  assessmentType: String    # "completion" | "score"
  passScore: Float
}

type GoalAssignment {
  id: ID!
  goalId: ID!
  departmentId: ID!
  goal: LearningGoal!
  department: Department!
  createdAt: String!
}

type EmployeeGoalProgress {
  id: ID!
  employeeId: ID!
  goalId: ID!
  status: String!           # "not_started" | "in_progress" | "completed"
  completedAt: String
  goal: LearningGoal!
  itemProgress: [ItemProgress!]!
}

type ItemProgress {
  id: ID!
  itemId: ID!               # unitId or assignmentId
  itemType: String!         # "unit" | "assignment"
  status: String!           # "pending" | "completed" (unit) | "passed" | "failed" (assignment)
  score: Float
  completedAt: String
}

type ModuleVideoUpload {
  unitId: ID!
  uploadUrl: String!        # pre-signed PUT URL — browser uploads directly
  videoStoragePath: String!
}
```

### Inputs
```graphql
input CreateLearningGoalInput {
  title: String!
  description: String
  dueDate: String
  isMandatory: Boolean!
}

input UpdateLearningGoalInput {
  title: String
  description: String
  dueDate: String
  isMandatory: Boolean
}

input CreateLearningSectionInput {
  goalId: ID!
  title: String!
  orderIndex: Int!
}

input UpdateLearningSectionInput {
  title: String
  orderIndex: Int
}

input CreateLearningUnitInput {
  sectionId: ID!
  title: String!
  description: String
  orderIndex: Int!
  videoType: String
  videoUrl: String          # for external URLs
}

input UpdateLearningUnitInput {
  title: String
  description: String
  orderIndex: Int
  videoType: String
  videoUrl: String
}

input CreateLearningAssignmentInput {
  sectionId: ID!
  title: String!
  description: String
  orderIndex: Int!
  assessmentType: String!
  passScore: Float
}

input UpdateLearningAssignmentInput {
  title: String
  description: String
  orderIndex: Int
  assessmentType: String
  passScore: Float
}

input UpdateItemProgressInput {
  employeeGoalProgressId: ID!
  itemId: ID!
  itemType: String!         # "unit" | "assignment"
  status: String!           # "completed" (unit) | "passed" | "failed" (assignment)
  score: Float              # required when assessmentType = "score"
}
```

### Queries
```graphql
# Admin
learningGoals: [LearningGoal!]!
learningGoal(id: ID!): LearningGoal
goalAssignments(goalId: ID!): [GoalAssignment!]!
departmentLearningProgress(deptId: ID!): [EmployeeGoalProgress!]!

# Employee + Admin
myLearningGoals: [EmployeeGoalProgress!]!
employeeLearningGoals(employeeId: ID!): [EmployeeGoalProgress!]!
```

### Mutations
```graphql
# Goal management (admin)
createLearningGoal(input: CreateLearningGoalInput!): LearningGoal!
updateLearningGoal(id: ID!, input: UpdateLearningGoalInput!): LearningGoal!
deleteLearningGoal(id: ID!): Boolean!

# Section management (admin)
createLearningSection(input: CreateLearningSectionInput!): LearningSection!
updateLearningSection(id: ID!, input: UpdateLearningSectionInput!): LearningSection!
deleteLearningSection(id: ID!): Boolean!

# Unit management (admin)
createLearningUnit(input: CreateLearningUnitInput!): LearningItem!
updateLearningUnit(id: ID!, input: UpdateLearningUnitInput!): LearningItem!
deleteLearningUnit(id: ID!): Boolean!
uploadUnitVideo(unitId: ID!, filename: String!, contentType: String!): ModuleVideoUpload!

# Assignment management (admin)
createLearningAssignment(input: CreateLearningAssignmentInput!): LearningItem!
updateLearningAssignment(id: ID!, input: UpdateLearningAssignmentInput!): LearningItem!
deleteLearningAssignment(id: ID!): Boolean!

# Department assignment (admin)
assignGoalToDepartment(goalId: ID!, departmentId: ID!): GoalAssignment!
removeGoalAssignment(assignmentId: ID!): Boolean!

# Progress (employee marks units; admin records assignment scores)
updateItemProgress(input: UpdateItemProgressInput!): ItemProgress!
```

---

## Section 3: Frontend Pages & Components

All pages under `frontend/components/pages/[tenant]/(dashboard)/learning/`.

### Page 1 — Goal Library (`Page.tsx`) — Admin only
- Lists all learning goals: title, mandatory badge, due date, section/item count, overall completion %.
- Actions: Create goal (modal with title, description, due_date, is_mandatory), edit metadata, delete (confirmation).
- Each goal row has an **"Open Builder"** button → navigates to the course builder.

### Page 2 — Course Builder (`[goalId]/builder/Page.tsx`) — Admin only
- **Left panel**: ordered list of sections. Each section is collapsible showing its units + assignments in order.
  - Add section button at bottom.
  - Section header: title (editable inline), drag handle to reorder, delete button.
  - Within each section: ordered list of items (units and assignments interleaved).
    - Item row: drag handle, type badge (Unit / Assignment), title (editable inline), edit button, delete button.
    - "Add Unit" and "Add Assignment" buttons at the bottom of each section.
- **Right panel**: editing form for the selected item.
  - **Unit form**: title, description, video section (None / Upload / External URL).
    - External URL: text input.
    - Upload: file picker (video/*), calls `uploadUnitVideo` to get pre-signed URL, uploads directly from browser.
    - Existing video shown as thumbnail with replace/remove option.
  - **Assignment form**: title, description, assessment type selector (Completion / Score-based), pass score field (shown only for score-based).
- Reordering (drag-and-drop or up/down arrows) calls `updateLearningUnit` / `updateLearningAssignment` with new `orderIndex`.
- Reordering sections calls `updateLearningSection` with new `orderIndex`.

### Page 3 — Department Assignments (`assignments/Page.tsx`) — Admin only
- Department selector at top.
- Lists goals assigned to selected department with Assign / Remove actions.
- Per-goal expandable: employee progress table (employee name, status, items completed/total).
- Per-employee expandable: each assignment item with status + score entry field (admin records score → `updateItemProgress`).

### Page 4 — My Goals (`my-goals/Page.tsx`) — Employee view
- Card grid: goal title, mandatory badge, due date, progress bar, status chip.
- Clicking a card navigates to the goal detail view.

### Page 5 — Goal Detail (`my-goals/[goalId]/Page.tsx`) — Employee view (LinkedIn-style)
- **Left sidebar** (collapsible): sections list, each collapsible.
  - Within each section: ordered units + assignments with status icons.
    - Unit: title + status (locked 🔒 / pending ○ / completed ✓)
    - Assignment: title + status (locked 🔒 / pending ○ / passed ✓ / failed ✗)
  - Sequential locking enforced visually.
- **Main content area** (selected item):
  - Title + description.
  - **Video** (if present): iframe for YouTube/Vimeo, `<video>` tag for uploaded or direct-link files.
  - **Unit action**: "Mark as Complete" button. Disabled if already completed or locked.
  - **Assignment action**:
    - Completion-based: "Submit" button → marks passed.
    - Score-based: shows score + pass/fail once admin records it. Shows "Awaiting assessment" otherwise.
- Progress bar at top: "X of N items completed".
- Goal auto-completes visually when last item passes.

### Routing & Auth
- Admin (`admin`, `super_admin`): Goal Library, Builder, Assignments in sidebar.
- Employee: My Goals only.
- Non-admin access to admin pages returns 403.

---

## Section 4: Error Handling & Testing

### Error Handling
| Scenario | Behavior |
|---|---|
| Duplicate `assignGoalToDepartment` | GraphQL error: "Goal already assigned to this department" |
| `updateItemProgress` on locked item | GraphQL error: "Previous item must be completed first" |
| `updateItemProgress` with wrong employee | GraphQL error: not found / unauthorized |
| Score missing for score-based assignment | GraphQL error: "Score required for score-based assessment" |
| Auto-complete race condition | Status flip inside DB transaction with the progress update |
| `removeGoalAssignment` | Cascades: deletes `EmployeeGoalProgress`, `UnitProgress`, `AssignmentProgress` |
| Video upload: unsupported file type | Frontend rejects non-video/* before calling `uploadUnitVideo` |
| Video upload: file too large | Backend enforces max size (default 500 MB); returns GraphQL error |
| External URL: blank or malformed | Frontend validates URL format before saving |
| Frontend mutation failure | `react-hot-toast` error toast |
| Frontend mutation success | `react-hot-toast` success toast |
| Loading states | Skeleton loaders on sidebar and progress table |

### Resolver Tests (`graph/learning_resolvers_test.go`)
1. `assignGoalToDepartment` creates `EmployeeGoalProgress` + all `UnitProgress` + `AssignmentProgress` rows for dept employees
2. Duplicate assignment returns descriptive error
3. `updateItemProgress` on a locked item returns error
4. All units completed + all assignments passed → `EmployeeGoalProgress.status` flips to `"completed"`
5. Partial completion → status is `"in_progress"`
6. Score missing for score-based assignment returns validation error
7. `removeGoalAssignment` cascades to clean up all child progress rows
8. Section sequential locking: first item of Section 2 is locked until all Section 1 items complete

---

## File Map

### Backend (new files)
- `backend/models/learning.go` — all GORM models (Goal, Section, Unit, Assignment, GoalAssignment, EmployeeGoalProgress, UnitProgress, AssignmentProgress)
- `backend/graph/learning.resolvers.go` — all learning resolvers
- `backend/handlers/learning_video.go` — video upload handler + pre-signed URL generation
- `backend/utils/video_storage.go` — storage abstraction (local disk or S3-compatible)

### Backend (modified files)
- `backend/graph/schema.graphqls` — new types, queries, mutations
- `backend/graph/generated.go` — regenerated after schema change
- `backend/database/migrate.go` — auto-migrate new models

### Frontend (new files)
- `frontend/components/pages/[tenant]/(dashboard)/learning/Page.tsx`
- `frontend/components/pages/[tenant]/(dashboard)/learning/[goalId]/builder/Page.tsx`
- `frontend/components/pages/[tenant]/(dashboard)/learning/assignments/Page.tsx`
- `frontend/components/pages/[tenant]/(dashboard)/learning/my-goals/Page.tsx`
- `frontend/components/pages/[tenant]/(dashboard)/learning/my-goals/[goalId]/Page.tsx`
- `frontend/graphql/queries/learning.ts`
- `frontend/graphql/mutations/learning.ts`
- `frontend/queries/pages/learning/learning.ts`
- `frontend/types/pages/learning/page.ts`
