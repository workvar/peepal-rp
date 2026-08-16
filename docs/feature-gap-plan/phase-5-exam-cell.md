# Phase 5 — Academic Exam Cell

Question bank scoped per curriculum subject, rule-based question-paper generation with PDF export,
and hall-ticket generation with QR (Phase 1) for attendance verification. Effort ~4 weeks. Depends
on Phase 1 (QR) and the existing exam-types/curriculum modules. Marksheet/result announcement
already exist (`grading.go`, `results.go`) — no new work there. All GraphQL. Education-tagged.

## Modules & fine access ids

`question-bank`, `question-papers`, `hall-tickets`. Coarse subscription module: existing `academic`.

## 1. Question bank

**`backend/models/question_bank.go`** — scoped to a `CurriculumSubject` (existing model from the
curriculum module), so questions inherit course-semester context.
```go
package models

// Question difficulty + type.
const (
    QDifficultyEasy   = "easy"
    QDifficultyMedium = "medium"
    QDifficultyHard   = "hard"
)
const (
    QTypeMCQ     = "mcq"
    QTypeShort   = "short"
    QTypeLong    = "long"
    QTypeNumeric = "numeric"
)

type QuestionBankItem struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index" json:"tenant_id"`

    // Scope: which curriculum subject (course+semester+subject) this belongs to.
    CurriculumSubjectID string `gorm:"not null;index" json:"curriculum_subject_id"`
    SubjectID           string `gorm:"index" json:"subject_id"` // denormalized for quick filter
    Unit                string `json:"unit"`                    // unit/topic label from Subject.Units

    QuestionText string `gorm:"type:text;not null" json:"question_text"`
    QuestionType string `gorm:"default:'long'" json:"question_type"`
    Difficulty   string `gorm:"default:'medium';index" json:"difficulty"`
    Marks        float64 `gorm:"not null;default:1" json:"marks"`

    // Options is a free-form JSON array for MCQs (stored as text, like
    // Subject.Units and Encounter.Vitals); blank for non-MCQ.
    Options string `gorm:"type:text" json:"options"`
    Answer  string `gorm:"type:text" json:"answer"` // model answer / correct option

    CourseOutcome string `json:"course_outcome"` // optional CO tag for mapping
    Active   bool   `gorm:"default:true" json:"active"`
    CreatedByID string `gorm:"index" json:"created_by_id"`

    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
func (q *QuestionBankItem) BeforeCreate(tx *gorm.DB) error { /* uuid */ }
```

**Resolver** `graph/question_bank.resolvers.go`: `questionBank(curriculumSubjectId, unit, difficulty, type)`
list, `createQuestionBankItem`/`update`/`delete`. Writes `requireRole(ctx, roleAdmin, roleTeacher)`
(teachers author for their subjects). Reads `requireAuth`.

**Bulk**: `handlers/bulk/schema_question_bank.go` — teachers import questions from CSV; fields
curriculum_subject (resolve by course_code+semester+subject_code via a new lookup), unit,
question_text (required), question_type, difficulty, marks, answer. Reuse the GraphQL-loop or REST
bulk pattern (question bank is a good REST-bulk fit: high row counts).

## 2. Question paper generation

**`backend/models/question_paper.go`** — a generated paper (header + selected questions frozen).
```go
type QuestionPaper struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index" json:"tenant_id"`

    Title      string `gorm:"not null" json:"title"`      // "Mid Sem - Data Structures"
    ExamTypeID string `gorm:"index" json:"exam_type_id"`  // links the existing ExamType
    CurriculumSubjectID string `gorm:"not null;index" json:"curriculum_subject_id"`
    SubjectID  string `gorm:"index" json:"subject_id"`

    TotalMarks float64 `gorm:"not null" json:"total_marks"`
    Duration   int     `json:"duration_minutes"`
    Instructions string `gorm:"type:text" json:"instructions"`

    // GenerationRule is the JSON blueprint used (marks per difficulty, unit
    // spread) kept for audit/regeneration; stored as text.
    GenerationRule string `gorm:"type:text" json:"generation_rule"`
    Status   string `gorm:"default:'draft';index" json:"status"` // draft | finalized

    Items []QuestionPaperItem `gorm:"foreignKey:QuestionPaperID" json:"items,omitempty"`
    CreatedByID string `gorm:"index" json:"created_by_id"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
func (p *QuestionPaper) BeforeCreate(tx *gorm.DB) error { /* uuid */ }

// QuestionPaperItem snapshots one selected question (text frozen so later bank
// edits don't mutate a finalized paper).
type QuestionPaperItem struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index" json:"tenant_id"`
    QuestionPaperID string `gorm:"not null;index" json:"question_paper_id"`
    SourceQuestionID string `gorm:"index" json:"source_question_id"`
    SeqNo    int    `json:"seq_no"`
    QuestionText string `gorm:"type:text" json:"question_text"`
    QuestionType string `json:"question_type"`
    Marks    float64 `json:"marks"`
    Options  string  `gorm:"type:text" json:"options"`
    Section  string  `json:"section"` // A/B/C grouping by type/marks
}
func (i *QuestionPaperItem) BeforeCreate(tx *gorm.DB) error { /* uuid */ }
```

**Generation logic** `backend/graph/question_paper_gen.go` (pure function, unit-testable):
```go
type PaperRule struct {
    CurriculumSubjectID string
    TotalMarks float64
    ByDifficulty map[string]float64 // {"easy":20,"medium":50,"hard":30} as marks or weights
    UnitSpread   []string           // units to cover (blank = all)
    TypeMix      map[string]int     // desired count by question type
}
// buildPaper selects QuestionBankItems from the pool to satisfy rule as closely
// as possible (greedy fill by difficulty bucket + unit round-robin), returns the
// ordered item list. Deterministic given a seed so "regenerate" is reproducible;
// random seed for variety across sections/sets.
func buildPaper(pool []models.QuestionBankItem, rule PaperRule, seed int64) ([]models.QuestionPaperItem, error)
```
Resolver `graph/question_papers.resolvers.go`: `generateQuestionPaper(input)` runs `buildPaper`
over the tenant-scoped active pool and persists paper + items; `finalizeQuestionPaper(id)` locks it;
plus list/get/delete. `requireRole(ctx, roleAdmin, roleTeacher)`.

**PDF**: loader `QuestionPaperForPDF` → `pdf-template/question_paper.go` (`BuildQuestionPaperPDF`:
institute header, title/marks/duration/instructions, sectioned question list) → handler → route
`GET /api/v1/exam-cell/papers/:id/pdf` guarded `RequireRole("admin","teacher")`. Watermark "DRAFT"
until finalized.

## 3. Hall tickets

**`backend/models/hall_ticket.go`** — ties `ExamSchedule` (existing dated exam) + student.
```go
type HallTicket struct {
    ID       string `gorm:"primaryKey" json:"id"`
    TenantID string `gorm:"not null;index;uniqueIndex:idx_hallticket_uniq" json:"tenant_id"`

    ExamScheduleID string `gorm:"not null;index;uniqueIndex:idx_hallticket_uniq" json:"exam_schedule_id"`
    StudentID      string `gorm:"not null;index;uniqueIndex:idx_hallticket_uniq" json:"student_id"`
    Student        Student `gorm:"foreignKey:StudentID" json:"student,omitempty"`

    TicketNumber string `gorm:"not null;index" json:"ticket_number"` // HT-%06d per tenant
    SeatNumber   string `json:"seat_number"`
    ExamCenter   string `json:"exam_center"`

    // Eligibility gate: issued only when the student clears the check (fees/attendance).
    Eligible     bool   `gorm:"default:true" json:"eligible"`
    HoldReason   string `json:"hold_reason"`
    IssuedOn     string `json:"issued_on"` // YYYY-MM-DD
    Status       string `gorm:"default:'issued';index" json:"status"` // issued | held | revoked

    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
func (h *HallTicket) BeforeCreate(tx *gorm.DB) error { /* uuid */ }
```
The composite unique index enforces one ticket per (student, exam schedule).

**Resolver** `graph/hall_tickets.resolvers.go`:
- `issueHallTickets(examScheduleId, input)` — bulk-issue for all enrolled students in the schedule's
  course/semester, running an eligibility check (optionally gate on fee dues via existing fee
  queries and attendance %; a student who fails is stored `Eligible=false, Status="held"` with a
  reason rather than skipped, so the office sees the hold). Idempotent per (student, schedule).
- `revokeHallTicket(id)`, `releaseHallTicketHold(id)`.
- `hallTickets(examScheduleId, status)` admin list; `myHallTickets` self-service for students
  (unenforced, portal query).
`requireRole(ctx, roleAdmin, roleStaff)` for issue/revoke.

**PDF with QR (Phase 1 payoff)**: loader `HallTicketForPDF` → `pdf-template/hall_ticket.go`
(`BuildHallTicketPDF`: institute header, student photo/name/roll, exam schedule table, seat/center,
`d.QRTopRight(qrcode.VerifyURL(baseURL, tenantID, "hallticket", ht.ID), 24)`) → handlers → routes:
`GET /api/v1/exam-cell/hall-tickets/:id/pdf` (admin/staff) and `GET /api/v1/exam-cell/hall-tickets/me/pdf?examScheduleId=` (self-service student). The QR encodes a signed verify payload; a future
scan endpoint (`GET /verify`) confirms authenticity + marks exam attendance — note this as the
Phase 1 `Sign`/`VerifyURL` consumer.

## 4. Schema

Add `QuestionBankItem`, `QuestionPaper`(+`Item`), `HallTicket` types, their inputs
(`CreateQuestionBankItemInput`, `GenerateQuestionPaperInput` with the rule shape,
`IssueHallTicketsInput`), and the queries/mutations above to `schema.graphqls` under a
`# ── Exam Cell ──` banner. Run `regen.sh`.

## 5. Access / subscription / industry

`access_registry.go` `AccessModules`:
```go
{"question-bank",   "Question Bank",   "Exam Cell", []string{"admin", "teacher"}},
{"question-papers", "Question Papers", "Exam Cell", []string{"admin", "teacher"}},
{"hall-tickets",    "Hall Tickets",    "Exam Cell", []string{"admin", "staff"}},
```
`subscription_modules.go` `defaultPageMap`: all three → existing `academic` coarse module.
`access_industries.go` `moduleIndustries`: tag all three `{TenantTypeEducation}` (mirror in frontend
`MODULE_INDUSTRIES`). `opAccess` (`access_enforce.go`): map writes —
`createQuestionBankItem`/`update`/`delete` → `question-bank`;
`generateQuestionPaper`/`finalizeQuestionPaper`/`deleteQuestionPaper` → `question-papers`;
`issueHallTickets`/`revokeHallTicket`/`releaseHallTicketHold` → `hall-tickets`. Leave
`questionBank`/`myHallTickets` reads unenforced (dropdown/self-service); enforce
`questionPapers`/`hallTickets` admin reads.

## 6. Frontend

Pages (thin re-exports) under `/[tenant]/(dashboard)/academic/`: `question-bank`, `question-papers`,
`hall-tickets`. Components per module:
- question-bank: `Page.tsx`, `useQuestionBank.ts`, `types.ts`, `QuestionTable.tsx`, `QuestionModal.tsx`,
  plus a Bulk trio + `<BulkUploadButton resource="question_bank" />`.
- question-papers: `Page.tsx`, `useQuestionPapers.ts`, `GenerateModal.tsx` (rule builder: marks per
  difficulty, units, type mix), `PaperPreview.tsx`, PDF download button.
- hall-tickets: `Page.tsx`, `useHallTickets.ts`, `IssueModal.tsx` (pick exam schedule → preview
  eligibility list → issue), `HallTicketTable.tsx` with per-row PDF + hold/revoke; use the Phase 1
  `CodeImage`/`qrSrc` helper for an on-screen QR preview. Student portal: `portal/hall-tickets` page
  reusing `myHallTickets` + `me/pdf`.
GraphQL docs in `graphql/queries/exam-cell.ts` + `mutations/exam-cell.ts`. Nav: new "Exam Cell"
group in `navConfig.ts` (education-only, surfaces via industry map) + `BASE_MODULES` rows. Gate
buttons with `<Can module="…" action="…">`.

## Cascade

`QuestionBankItem` (created_by), `HallTicket` (student) reference people. Add to
`deleteStudentCascade`: delete `HallTicket` by student. `QuestionBankItem.CreatedByID` is
historical authorship — blank it (don't delete questions) when the authoring employee is removed:
add a `Model(&QuestionBankItem{}).Where("created_by_id = ? AND tenant_id = ?").Update("created_by_id","")`
to `deleteEmployeeCascade`.

## Test / done

- `graph/question_paper_gen_test.go`: `buildPaper` hits target total marks and difficulty spread
  within tolerance, respects unit filter, and is deterministic for a fixed seed.
- `graph/hall_tickets_test.go`: issue is idempotent per (student, schedule); ineligible students
  land as `held` with a reason; QR payload verifies.
- `--migrate` (3 tables + composite indexes); `regen.sh` + `go build` + `npm run build` clean.
