package graph

// Question paper resolvers. Generation runs buildPaper (question_paper_gen.go)
// over the tenant's active pool, then persists the header plus a frozen copy
// of every selected question in one transaction.

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func (r *queryResolver) QuestionPapers(ctx context.Context, curriculumSubjectID *string, status *string) ([]*model.QuestionPaper, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).
		Preload("Items", func(db *gorm.DB) *gorm.DB { return db.Order("seq_no ASC") }).
		Where("tenant_id = ?", auth.TenantID)
	if curriculumSubjectID != nil && strings.TrimSpace(*curriculumSubjectID) != "" {
		q = q.Where("curriculum_subject_id = ?", strings.TrimSpace(*curriculumSubjectID))
	}
	if status != nil && strings.TrimSpace(*status) != "" {
		q = q.Where("status = ?", strings.TrimSpace(*status))
	}

	var rows []models.QuestionPaper
	if err := q.Order("created_at DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.QuestionPaper, len(rows))
	for i, row := range rows {
		out[i] = paperToModel(row)
	}
	return out, nil
}

func (r *queryResolver) QuestionPaper(ctx context.Context, id string) (*model.QuestionPaper, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	paper, err := loadQuestionPaper(ctx, r.DB, auth.TenantID, id)
	if err != nil {
		return nil, err
	}
	return paperToModel(paper), nil
}

// GenerateQuestionPaper builds a draft paper from the bank. The rule is stored
// alongside the result so the same paper can be audited or reproduced.
func (r *mutationResolver) GenerateQuestionPaper(ctx context.Context, input model.GenerateQuestionPaperInput) (*model.QuestionPaper, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return nil, errors.New("paper title is required")
	}
	cs, err := loadCurriculumSubject(ctx, r.DB, auth.TenantID, input.CurriculumSubjectID)
	if err != nil {
		return nil, err
	}

	// Pull the whole active pool for this curriculum subject; buildPaper does
	// the filtering so the selection rules live in one testable place.
	var pool []models.QuestionBankItem
	if err := r.DB.WithContext(ctx).
		Where("tenant_id = ? AND curriculum_subject_id = ? AND active = ?", auth.TenantID, cs.ID, true).
		Find(&pool).Error; err != nil {
		return nil, err
	}

	rule := ruleFromInput(input, cs.ID)
	seed := int64(intVal(input.Seed))
	if seed == 0 {
		seed = time.Now().UnixNano()
	}
	items, err := buildPaper(pool, rule, seed)
	if err != nil {
		return nil, err
	}

	paper := models.QuestionPaper{
		ID:                  uuid.NewString(),
		TenantID:            auth.TenantID,
		Title:               title,
		ExamTypeID:          strings.TrimSpace(strVal(input.ExamTypeID)),
		CurriculumSubjectID: cs.ID,
		SubjectID:           cs.SubjectID,
		TotalMarks:          input.TotalMarks,
		Duration:            intVal(input.DurationMinutes),
		Instructions:        strings.TrimSpace(strVal(input.Instructions)),
		GenerationRule:      encodeRule(rule, seed),
		Status:              models.PaperStatusDraft,
		CreatedByID:         auth.UserID,
	}

	// Header and items land together — a paper with no questions is never a
	// state the reader has to handle.
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&paper).Error; err != nil {
			return err
		}
		for i := range items {
			items[i].ID = uuid.NewString()
			items[i].TenantID = auth.TenantID
			items[i].QuestionPaperID = paper.ID
		}
		return tx.Create(&items).Error
	})
	if err != nil {
		return nil, err
	}

	paper.Items = items
	return paperToModel(paper), nil
}

// FinalizeQuestionPaper locks a draft. Finalized papers print without the
// DRAFT watermark and reject further edits.
func (r *mutationResolver) FinalizeQuestionPaper(ctx context.Context, id string) (*model.QuestionPaper, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}
	res := r.DB.WithContext(ctx).
		Model(&models.QuestionPaper{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Update("status", models.PaperStatusFinalized)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	paper, err := loadQuestionPaper(ctx, r.DB, auth.TenantID, id)
	if err != nil {
		return nil, err
	}
	return paperToModel(paper), nil
}

func (r *mutationResolver) DeleteQuestionPaper(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return false, err
	}
	paper, err := loadQuestionPaper(ctx, r.DB, auth.TenantID, id)
	if err != nil {
		return false, err
	}
	if paper.Status == models.PaperStatusFinalized {
		return false, ErrPaperFinalized
	}

	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("question_paper_id = ? AND tenant_id = ?", id, auth.TenantID).
			Delete(&models.QuestionPaperItem{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ? AND tenant_id = ?", id, auth.TenantID).
			Delete(&models.QuestionPaper{}).Error
	})
	if err != nil {
		return false, err
	}
	return true, nil
}

// --- helpers ---

// loadQuestionPaper fetches one paper with its items in print order.
func loadQuestionPaper(ctx context.Context, db *gorm.DB, tenantID, id string) (models.QuestionPaper, error) {
	var paper models.QuestionPaper
	err := db.WithContext(ctx).
		Preload("Items", func(d *gorm.DB) *gorm.DB { return d.Order("seq_no ASC") }).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		First(&paper).Error
	if err != nil {
		return paper, ErrNotFound
	}
	return paper, nil
}

// ruleFromInput translates the GraphQL input into the generator's rule shape.
func ruleFromInput(input model.GenerateQuestionPaperInput, curriculumSubjectID string) PaperRule {
	rule := PaperRule{
		CurriculumSubjectID: curriculumSubjectID,
		TotalMarks:          input.TotalMarks,
		UnitSpread:          input.Units,
	}
	if len(input.ByDifficulty) > 0 {
		rule.ByDifficulty = map[string]float64{}
		for _, d := range input.ByDifficulty {
			if d == nil || d.Marks <= 0 {
				continue
			}
			rule.ByDifficulty[normalizeDifficulty(d.Difficulty)] += d.Marks
		}
	}
	if len(input.TypeMix) > 0 {
		rule.TypeMix = map[string]int{}
		for _, t := range input.TypeMix {
			if t == nil || t.Count <= 0 {
				continue
			}
			rule.TypeMix[normalizeQuestionType(t.QuestionType)] += t.Count
		}
	}
	return rule
}

// encodeRule serializes the rule + seed for the audit column. A failure here
// must not fail generation, so it degrades to an empty blueprint.
func encodeRule(rule PaperRule, seed int64) string {
	blob := struct {
		PaperRule
		Seed int64 `json:"seed"`
	}{PaperRule: rule, Seed: seed}
	b, err := json.Marshal(blob)
	if err != nil {
		return ""
	}
	return string(b)
}

func paperToModel(p models.QuestionPaper) *model.QuestionPaper {
	m := &model.QuestionPaper{
		ID:                  p.ID,
		Title:               p.Title,
		CurriculumSubjectID: p.CurriculumSubjectID,
		TotalMarks:          p.TotalMarks,
		Status:              p.Status,
		Items:               make([]*model.QuestionPaperItem, len(p.Items)),
	}
	m.ExamTypeID = toStrPtr(p.ExamTypeID)
	m.SubjectID = toStrPtr(p.SubjectID)
	m.Instructions = toStrPtr(p.Instructions)
	m.GenerationRule = toStrPtr(p.GenerationRule)
	m.CreatedByID = toStrPtr(p.CreatedByID)
	if p.Duration > 0 {
		m.DurationMinutes = toIntPtr(p.Duration)
	}
	if !p.CreatedAt.IsZero() {
		m.CreatedAt = toStrPtr(p.CreatedAt.Format(time.RFC3339))
	}
	for i, item := range p.Items {
		m.Items[i] = paperItemToModel(item)
	}
	return m
}

func paperItemToModel(i models.QuestionPaperItem) *model.QuestionPaperItem {
	m := &model.QuestionPaperItem{
		ID:           i.ID,
		SeqNo:        i.SeqNo,
		QuestionText: i.QuestionText,
		QuestionType: i.QuestionType,
		Marks:        i.Marks,
		Options:      decodeOptions(i.Options),
	}
	m.SourceQuestionID = toStrPtr(i.SourceQuestionID)
	m.Section = toStrPtr(i.Section)
	return m
}
