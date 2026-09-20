package models

// Exam-cell question bank. Questions are authored per CurriculumSubject, so a
// question automatically inherits the course + semester + subject it belongs
// to and a paper generator can pull a pool with one scope filter.

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Question difficulty buckets. The paper generator fills a marks target per
// bucket, so these strings are also the keys of PaperRule.ByDifficulty.
const (
	QDifficultyEasy   = "easy"
	QDifficultyMedium = "medium"
	QDifficultyHard   = "hard"
)

// Question shapes. MCQ carries Options; the rest leave it blank.
const (
	QTypeMCQ     = "mcq"
	QTypeShort   = "short"
	QTypeLong    = "long"
	QTypeNumeric = "numeric"
)

// QuestionDifficulties / QuestionTypes are the accepted vocabularies, shared
// with the bulk uploader's enum validation.
var (
	QuestionDifficulties = []string{QDifficultyEasy, QDifficultyMedium, QDifficultyHard}
	QuestionTypes        = []string{QTypeMCQ, QTypeShort, QTypeLong, QTypeNumeric}
)

// QuestionBankItem is one reusable question in the bank.
type QuestionBankItem struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	// Scope: which curriculum subject (course + semester + subject) owns it.
	CurriculumSubjectID string `gorm:"not null;index" json:"curriculum_subject_id"`
	// SubjectID is denormalized off the curriculum row so a teacher can list
	// "every question I have for this subject" without a join.
	SubjectID string `gorm:"index" json:"subject_id"`
	// Unit is a free-text label matched against Subject.UnitsJSON titles; the
	// generator uses it to spread questions across the syllabus.
	Unit string `json:"unit"`

	QuestionText string  `gorm:"type:text;not null" json:"question_text"`
	QuestionType string  `gorm:"default:'long'" json:"question_type"`
	Difficulty   string  `gorm:"default:'medium';index" json:"difficulty"`
	Marks        float64 `gorm:"not null;default:1" json:"marks"`

	// Options is a JSON array of choice strings for MCQs (stored as text, the
	// same convention as Subject.UnitsJSON); blank for every other type.
	Options string `gorm:"type:text" json:"options"`
	Answer  string `gorm:"type:text" json:"answer"` // model answer / correct option

	CourseOutcome string `json:"course_outcome"` // optional CO tag (CO1, CO2, …)
	Active        bool   `gorm:"default:true" json:"active"`
	// CreatedByID is historical authorship — blanked, never cascaded, when the
	// authoring employee is deleted (see deleteEmployeeCascade).
	CreatedByID string `gorm:"index" json:"created_by_id"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (q *QuestionBankItem) BeforeCreate(tx *gorm.DB) error {
	if q.ID == "" {
		q.ID = uuid.NewString()
	}
	return nil
}
