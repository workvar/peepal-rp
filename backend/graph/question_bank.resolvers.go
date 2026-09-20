package graph

// Question bank CRUD. Questions are authored per curriculum subject; teachers
// write for the subjects they teach, admins for anything. Reads are open to
// any authenticated user because the paper generator previews the pool.

import (
	"context"
	"errors"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

// QuestionBank lists the pool for one curriculum subject. Filters stack, and
// retired questions are hidden unless asked for.
func (r *queryResolver) QuestionBank(
	ctx context.Context,
	curriculumSubjectID string,
	unit *string,
	difficulty *string,
	questionType *string,
	includeInactive *bool,
) ([]*model.QuestionBankItem, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	q := r.DB.WithContext(ctx).
		Where("tenant_id = ? AND curriculum_subject_id = ?", auth.TenantID, curriculumSubjectID)
	if unit != nil && strings.TrimSpace(*unit) != "" {
		q = q.Where("unit = ?", strings.TrimSpace(*unit))
	}
	if difficulty != nil && strings.TrimSpace(*difficulty) != "" {
		q = q.Where("difficulty = ?", normalizeDifficulty(*difficulty))
	}
	if questionType != nil && strings.TrimSpace(*questionType) != "" {
		q = q.Where("question_type = ?", normalizeQuestionType(*questionType))
	}
	if !derefBool(includeInactive) {
		q = q.Where("active = ?", true)
	}

	var rows []models.QuestionBankItem
	if err := q.Order("unit ASC, difficulty ASC, created_at ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.QuestionBankItem, len(rows))
	for i, row := range rows {
		out[i] = bankQuestionToModel(row)
	}
	return out, nil
}

func (r *mutationResolver) CreateQuestionBankItem(ctx context.Context, input model.CreateQuestionBankItemInput) (*model.QuestionBankItem, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}
	text := strings.TrimSpace(input.QuestionText)
	if text == "" {
		return nil, errors.New("question text is required")
	}
	// Scoping through the curriculum row both validates the tenant and gives
	// us the subject id to denormalize.
	cs, err := loadCurriculumSubject(ctx, r.DB, auth.TenantID, input.CurriculumSubjectID)
	if err != nil {
		return nil, err
	}

	q := models.QuestionBankItem{
		ID:                  uuid.NewString(),
		TenantID:            auth.TenantID,
		CurriculumSubjectID: cs.ID,
		SubjectID:           cs.SubjectID,
		QuestionText:        text,
		QuestionType:        normalizeQuestionType(strVal(input.QuestionType)),
		Difficulty:          normalizeDifficulty(strVal(input.Difficulty)),
		Marks:               floatVal(input.Marks),
		Options:             encodeOptions(input.Options),
		Answer:              strings.TrimSpace(strVal(input.Answer)),
		CourseOutcome:       strings.TrimSpace(strVal(input.CourseOutcome)),
		Unit:                strings.TrimSpace(strVal(input.Unit)),
		Active:              true,
		CreatedByID:         auth.UserID,
	}
	if q.Marks <= 0 {
		q.Marks = 1
	}
	if input.Active != nil {
		q.Active = *input.Active
	}
	if err := r.DB.WithContext(ctx).Create(&q).Error; err != nil {
		return nil, err
	}
	return bankQuestionToModel(q), nil
}

func (r *mutationResolver) UpdateQuestionBankItem(ctx context.Context, id string, input model.UpdateQuestionBankItemInput) (*model.QuestionBankItem, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{}
	if input.Unit != nil {
		updates["unit"] = strings.TrimSpace(*input.Unit)
	}
	if input.QuestionText != nil {
		text := strings.TrimSpace(*input.QuestionText)
		if text == "" {
			return nil, errors.New("question text cannot be blank")
		}
		updates["question_text"] = text
	}
	if input.QuestionType != nil {
		updates["question_type"] = normalizeQuestionType(*input.QuestionType)
	}
	if input.Difficulty != nil {
		updates["difficulty"] = normalizeDifficulty(*input.Difficulty)
	}
	if input.Marks != nil && *input.Marks > 0 {
		updates["marks"] = *input.Marks
	}
	if input.Options != nil {
		updates["options"] = encodeOptions(input.Options)
	}
	if input.Answer != nil {
		updates["answer"] = strings.TrimSpace(*input.Answer)
	}
	if input.CourseOutcome != nil {
		updates["course_outcome"] = strings.TrimSpace(*input.CourseOutcome)
	}
	if input.Active != nil {
		updates["active"] = *input.Active
	}

	if len(updates) > 0 {
		res := r.DB.WithContext(ctx).
			Model(&models.QuestionBankItem{}).
			Where("id = ? AND tenant_id = ?", id, auth.TenantID).
			Updates(updates)
		if res.Error != nil {
			return nil, res.Error
		}
		if res.RowsAffected == 0 {
			return nil, ErrNotFound
		}
	}

	var q models.QuestionBankItem
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		First(&q).Error; err != nil {
		return nil, ErrNotFound
	}
	return bankQuestionToModel(q), nil
}

// DeleteQuestionBankItem removes a question from the pool. Papers already
// generated keep their frozen copy, so deleting here never rewrites history.
func (r *mutationResolver) DeleteQuestionBankItem(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Delete(&models.QuestionBankItem{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}
