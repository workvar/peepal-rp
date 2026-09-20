package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ─── Learning Matrix Models ───────────────────────────────────────────────
// This file implements the Learning Matrix module. Hierarchy:
//   LearningGoal → LearningSection → [LearningUnit, LearningAssignment]
// Progress is tracked per employee:
//   EmployeeGoalProgress → [UnitProgress, AssignmentProgress]

// ─── LearningGoal ─────────────────────────────────────────────────────────

// LearningGoal is a named course/training that can be assigned to departments.
type LearningGoal struct {
	ID          string            `gorm:"primaryKey" json:"id"`
	TenantID    string            `gorm:"not null;index" json:"tenant_id"`
	Title       string            `gorm:"not null" json:"title"`
	Description string            `json:"description"`
	DueDate     *time.Time        `json:"due_date"`
	IsMandatory bool              `gorm:"default:false" json:"is_mandatory"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
	Sections    []LearningSection `gorm:"foreignKey:GoalID" json:"sections,omitempty"`
}

func (g *LearningGoal) BeforeCreate(tx *gorm.DB) error {
	if g.ID == "" {
		g.ID = uuid.NewString()
	}
	return nil
}

// ─── LearningSection ──────────────────────────────────────────────────────

// LearningSection groups ordered units + assignments within a goal.
type LearningSection struct {
	ID          string               `gorm:"primaryKey" json:"id"`
	GoalID      string               `gorm:"not null;index" json:"goal_id"`
	Title       string               `gorm:"not null" json:"title"`
	OrderIndex  int                  `gorm:"not null" json:"order_index"`
	CreatedAt   time.Time            `json:"created_at"`
	UpdatedAt   time.Time            `json:"updated_at"`
	Units       []LearningUnit       `gorm:"foreignKey:SectionID" json:"units,omitempty"`
	Assignments []LearningAssignment `gorm:"foreignKey:SectionID" json:"assignments,omitempty"`
}

func (s *LearningSection) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}

// ─── LearningUnit ─────────────────────────────────────────────────────────

// LearningUnit is a content item: video + markdown reading + text description.
// A unit can have any combination of video and markdown content; "reading" is
// just a unit with VideoType='none' and non-empty Content.
type LearningUnit struct {
	ID               string    `gorm:"primaryKey" json:"id"`
	SectionID        string    `gorm:"not null;index" json:"section_id"`
	Title            string    `gorm:"not null" json:"title"`
	Description      string    `json:"description"`
	OrderIndex       int       `gorm:"not null" json:"order_index"`
	VideoType        string    `gorm:"default:'none'" json:"video_type"` // none | upload | external
	VideoURL         string    `json:"video_url"`
	VideoStoragePath string    `json:"video_storage_path"`
	Content          string    `gorm:"type:text" json:"content"` // markdown reading material
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func (u *LearningUnit) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.NewString()
	}
	return nil
}

// ─── LearningAssignment ───────────────────────────────────────────────────

// LearningAssignment is an assessment item — completion or score-based.
type LearningAssignment struct {
	ID             string    `gorm:"primaryKey" json:"id"`
	SectionID      string    `gorm:"not null;index" json:"section_id"`
	Title          string    `gorm:"not null" json:"title"`
	Description    string    `json:"description"`
	OrderIndex     int       `gorm:"not null" json:"order_index"`
	AssessmentType string    `gorm:"not null;default:'completion'" json:"assessment_type"` // completion | score
	PassScore      float64   `gorm:"default:0" json:"pass_score"`                          // used when AssessmentType = score
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (a *LearningAssignment) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}

// ─── LearningQuestion ─────────────────────────────────────────────────────

// LearningQuestion is one question inside a LearningAssignment (quiz).
// Kind controls grading:
//   - mcq:         exactly one correct answer (index into Options)
//   - multi:       one or more correct answers; all must match to earn points
//   - true_false:  correct answer is stored as "true" or "false" in CorrectAnswers[0]
//
// Options and CorrectAnswers are stored as JSON text for portability across DBs.
// Options is a JSON array of strings (display labels). CorrectAnswers is a JSON
// array of strings — for mcq/multi these are option indices ("0","1",…); for
// true_false it is a single-element array "['true']" or "['false']".
type LearningQuestion struct {
	ID             string    `gorm:"primaryKey" json:"id"`
	AssignmentID   string    `gorm:"not null;index" json:"assignment_id"`
	Kind           string    `gorm:"not null;default:'mcq'" json:"kind"` // mcq | multi | true_false
	Prompt         string    `gorm:"type:text;not null" json:"prompt"`
	Options        string    `gorm:"type:text" json:"options"`         // JSON array of option labels
	CorrectAnswers string    `gorm:"type:text" json:"correct_answers"` // JSON array of correct option indices
	Points         float64   `gorm:"default:1" json:"points"`
	OrderIndex     int       `gorm:"not null" json:"order_index"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (q *LearningQuestion) BeforeCreate(tx *gorm.DB) error {
	if q.ID == "" {
		q.ID = uuid.NewString()
	}
	return nil
}

// ─── GoalAssignment (goal → department) ───────────────────────────────────

// GoalAssignment links a learning goal to a department; all employees in the
// department get an EmployeeGoalProgress created automatically.
type GoalAssignment struct {
	ID           string       `gorm:"primaryKey" json:"id"`
	TenantID     string       `gorm:"not null;index;uniqueIndex:idx_goal_dept" json:"tenant_id"`
	GoalID       string       `gorm:"not null;uniqueIndex:idx_goal_dept" json:"goal_id"`
	DepartmentID string       `gorm:"not null;uniqueIndex:idx_goal_dept" json:"department_id"`
	Goal         LearningGoal `gorm:"foreignKey:GoalID" json:"goal,omitempty"`
	Department   Department   `gorm:"foreignKey:DepartmentID" json:"department,omitempty"`
	CreatedAt    time.Time    `json:"created_at"`
}

func (ga *GoalAssignment) BeforeCreate(tx *gorm.DB) error {
	if ga.ID == "" {
		ga.ID = uuid.NewString()
	}
	return nil
}

// ─── EmployeeGoalProgress ─────────────────────────────────────────────────

// EmployeeGoalProgress is the per-employee tracker for an assigned goal.
type EmployeeGoalProgress struct {
	ID                 string               `gorm:"primaryKey" json:"id"`
	TenantID           string               `gorm:"not null;index" json:"tenant_id"`
	EmployeeID         string               `gorm:"not null;index;uniqueIndex:idx_emp_goal" json:"employee_id"`
	GoalID             string               `gorm:"not null;uniqueIndex:idx_emp_goal" json:"goal_id"`
	AssignmentID       string               `gorm:"not null" json:"assignment_id"`       // FK back to GoalAssignment
	Status             string               `gorm:"default:'not_started'" json:"status"` // not_started | in_progress | completed
	CompletedAt        *time.Time           `json:"completed_at"`
	CreatedAt          time.Time            `json:"created_at"`
	UpdatedAt          time.Time            `json:"updated_at"`
	Goal               LearningGoal         `gorm:"foreignKey:GoalID" json:"goal,omitempty"`
	UnitProgress       []UnitProgress       `gorm:"foreignKey:EmployeeGoalProgressID" json:"unit_progress,omitempty"`
	AssignmentProgress []AssignmentProgress `gorm:"foreignKey:EmployeeGoalProgressID" json:"assignment_progress,omitempty"`
}

func (egp *EmployeeGoalProgress) BeforeCreate(tx *gorm.DB) error {
	if egp.ID == "" {
		egp.ID = uuid.NewString()
	}
	return nil
}

// ─── UnitProgress ─────────────────────────────────────────────────────────

// UnitProgress tracks one employee's progress through one unit.
type UnitProgress struct {
	ID                     string     `gorm:"primaryKey" json:"id"`
	EmployeeGoalProgressID string     `gorm:"not null;index;uniqueIndex:idx_emp_unit" json:"employee_goal_progress_id"`
	UnitID                 string     `gorm:"not null;uniqueIndex:idx_emp_unit" json:"unit_id"`
	Status                 string     `gorm:"default:'pending'" json:"status"` // pending | completed
	CompletedAt            *time.Time `json:"completed_at"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

func (up *UnitProgress) BeforeCreate(tx *gorm.DB) error {
	if up.ID == "" {
		up.ID = uuid.NewString()
	}
	return nil
}

// ─── AssignmentProgress ───────────────────────────────────────────────────

// AssignmentProgress tracks one employee's result on one assignment.
type AssignmentProgress struct {
	ID                     string     `gorm:"primaryKey" json:"id"`
	EmployeeGoalProgressID string     `gorm:"not null;index;uniqueIndex:idx_emp_assignment" json:"employee_goal_progress_id"`
	AssignmentID           string     `gorm:"not null;uniqueIndex:idx_emp_assignment" json:"assignment_id"`
	Status                 string     `gorm:"default:'pending'" json:"status"` // pending | passed | failed
	Score                  *float64   `json:"score"`                           // nullable — only for score-based
	CompletedAt            *time.Time `json:"completed_at"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

func (ap *AssignmentProgress) BeforeCreate(tx *gorm.DB) error {
	if ap.ID == "" {
		ap.ID = uuid.NewString()
	}
	return nil
}
