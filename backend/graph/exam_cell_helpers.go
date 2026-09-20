package graph

// Shared helpers for the exam-cell modules (question bank, question papers,
// hall tickets). Kept in one small file so each resolver file stays about a
// single concern.

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// ErrPaperFinalized is returned when a caller tries to mutate a locked paper.
var ErrPaperFinalized = errors.New("this paper is finalized and can no longer be changed")

// encodeOptions stores MCQ choices as a JSON array, matching the convention
// used by Subject.UnitsJSON. An empty list is stored as a blank string so the
// column stays null-ish rather than holding a useless "[]".
func encodeOptions(opts []string) string {
	clean := make([]string, 0, len(opts))
	for _, o := range opts {
		if s := strings.TrimSpace(o); s != "" {
			clean = append(clean, s)
		}
	}
	if len(clean) == 0 {
		return ""
	}
	b, err := json.Marshal(clean)
	if err != nil {
		return ""
	}
	return string(b)
}

// decodeOptions is the inverse. Malformed JSON yields an empty list rather
// than an error — a bad options blob must never break a whole question list.
func decodeOptions(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return []string{}
	}
	var out []string
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return []string{}
	}
	return out
}

// normalizeDifficulty coerces free-text input to a known bucket, defaulting to
// medium so a typo never silently drops a question out of every generation.
func normalizeDifficulty(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case models.QDifficultyEasy:
		return models.QDifficultyEasy
	case models.QDifficultyHard:
		return models.QDifficultyHard
	default:
		return models.QDifficultyMedium
	}
}

// normalizeQuestionType coerces free-text input to a known shape, defaulting
// to long-answer.
func normalizeQuestionType(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case models.QTypeMCQ:
		return models.QTypeMCQ
	case models.QTypeShort:
		return models.QTypeShort
	case models.QTypeNumeric:
		return models.QTypeNumeric
	default:
		return models.QTypeLong
	}
}

// loadCurriculumSubject fetches a tenant's curriculum row with its subject.
// Every exam-cell write scopes through this, so a caller can never author a
// question against another tenant's curriculum.
func loadCurriculumSubject(ctx context.Context, db *gorm.DB, tenantID, id string) (models.CurriculumSubject, error) {
	var cs models.CurriculumSubject
	err := db.WithContext(ctx).
		Preload("Subject").
		Where("id = ? AND tenant_id = ?", id, tenantID).
		First(&cs).Error
	if err != nil {
		return cs, errors.New("curriculum subject not found")
	}
	return cs, nil
}

// bankQuestionToModel maps a bank row to its GraphQL shape. Named for the
// bank specifically because the learning module already owns questionToModel.
func bankQuestionToModel(q models.QuestionBankItem) *model.QuestionBankItem {
	m := &model.QuestionBankItem{
		ID:                  q.ID,
		CurriculumSubjectID: q.CurriculumSubjectID,
		QuestionText:        q.QuestionText,
		QuestionType:        q.QuestionType,
		Difficulty:          q.Difficulty,
		Marks:               q.Marks,
		Options:             decodeOptions(q.Options),
		Active:              q.Active,
	}
	m.SubjectID = toStrPtr(q.SubjectID)
	m.Unit = toStrPtr(q.Unit)
	m.Answer = toStrPtr(q.Answer)
	m.CourseOutcome = toStrPtr(q.CourseOutcome)
	m.CreatedByID = toStrPtr(q.CreatedByID)
	if !q.CreatedAt.IsZero() {
		m.CreatedAt = toStrPtr(q.CreatedAt.Format(time.RFC3339))
	}
	return m
}
