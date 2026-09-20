package models

// A generated question paper. Items are snapshots of bank questions: once a
// paper exists, editing the bank never mutates it, so a printed paper and the
// stored record always agree.

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Paper lifecycle. A draft prints with a DRAFT watermark and can be
// regenerated or deleted; finalized is immutable.
const (
	PaperStatusDraft     = "draft"
	PaperStatusFinalized = "finalized"
)

// QuestionPaper is the header: what exam, which subject, and the rule that
// produced it.
type QuestionPaper struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	Title               string `gorm:"not null" json:"title"`     // "Mid Sem - Data Structures"
	ExamTypeID          string `gorm:"index" json:"exam_type_id"` // links an existing ExamType
	CurriculumSubjectID string `gorm:"not null;index" json:"curriculum_subject_id"`
	SubjectID           string `gorm:"index" json:"subject_id"`

	TotalMarks   float64 `gorm:"not null" json:"total_marks"`
	Duration     int     `json:"duration_minutes"`
	Instructions string  `gorm:"type:text" json:"instructions"`

	// GenerationRule is the JSON blueprint that produced the paper (marks per
	// difficulty, unit spread, type mix, seed). Kept so a paper can be audited
	// or regenerated identically.
	GenerationRule string `gorm:"type:text" json:"generation_rule"`
	Status         string `gorm:"default:'draft';index" json:"status"`

	Items       []QuestionPaperItem `gorm:"foreignKey:QuestionPaperID" json:"items,omitempty"`
	CreatedByID string              `gorm:"index" json:"created_by_id"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (p *QuestionPaper) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	return nil
}

// QuestionPaperItem is one frozen question on a paper.
type QuestionPaperItem struct {
	ID              string `gorm:"primaryKey" json:"id"`
	TenantID        string `gorm:"not null;index" json:"tenant_id"`
	QuestionPaperID string `gorm:"not null;index" json:"question_paper_id"`
	// SourceQuestionID points back at the bank row for analytics ("how often
	// has this question been set?"); it is not a foreign key.
	SourceQuestionID string `gorm:"index" json:"source_question_id"`

	SeqNo        int     `json:"seq_no"`
	QuestionText string  `gorm:"type:text" json:"question_text"`
	QuestionType string  `json:"question_type"`
	Marks        float64 `json:"marks"`
	Options      string  `gorm:"type:text" json:"options"`
	Section      string  `json:"section"` // A/B/C grouping by question type
}

func (i *QuestionPaperItem) BeforeCreate(tx *gorm.DB) error {
	if i.ID == "" {
		i.ID = uuid.NewString()
	}
	return nil
}
