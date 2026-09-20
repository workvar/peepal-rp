package graph

// Quiz builder + auto-grading resolvers for the Learning Matrix.
//
// This file adds:
//   - assignmentQuestions(assignmentId)          — admin query
//   - createLearningQuestion / update / delete   — admin mutations
//   - submitQuiz(...)                            — learner mutation
//
// Auto-grading is deliberately simple: each question is either fully right
// (awards its Points) or wrong (0). For `multi` questions the learner's
// selection must match the set of correct answers exactly.

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// ─── Query ────────────────────────────────────────────────────────────────

func (r *queryResolver) AssignmentQuestions(ctx context.Context, assignmentID string) ([]*model.LearningQuestion, error) {
	// Admin always allowed. Non-admin employees may view questions for quizzes
	// they are assigned to (so the quiz-taker can render). We accept any
	// authenticated user in the same tenant here; submitQuiz still guards the
	// actual progress write.
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	// Load assignment and verify tenant scope.
	var a models.LearningAssignment
	if err := r.DB.WithContext(ctx).First(&a, "id = ?", assignmentID).Error; err != nil {
		return nil, ErrNotFound
	}
	if err := r.assertSectionInTenant(ctx, a.SectionID, auth.TenantID); err != nil {
		return nil, err
	}

	var rows []models.LearningQuestion
	if err := r.DB.WithContext(ctx).
		Where("assignment_id = ?", assignmentID).
		Order("order_index asc").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.LearningQuestion, len(rows))
	for i, q := range rows {
		out[i] = questionToModel(q)
	}
	return out, nil
}

// ─── Mutations: question CRUD ─────────────────────────────────────────────

func (r *mutationResolver) CreateLearningQuestion(ctx context.Context, input model.CreateLearningQuestionInput) (*model.LearningQuestion, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return nil, ErrForbidden
	}
	var a models.LearningAssignment
	if err := r.DB.WithContext(ctx).First(&a, "id = ?", input.AssignmentID).Error; err != nil {
		return nil, ErrNotFound
	}
	if err := r.assertSectionInTenant(ctx, a.SectionID, auth.TenantID); err != nil {
		return nil, err
	}
	if err := validateQuestionInput(input.Kind, input.Options, input.CorrectAnswers); err != nil {
		return nil, err
	}
	orderIndex := 0
	if input.OrderIndex != nil && *input.OrderIndex > 0 {
		orderIndex = *input.OrderIndex
	} else {
		orderIndex = r.nextQuestionOrderIndex(ctx, input.AssignmentID)
	}
	points := 1.0
	if input.Points != nil {
		points = *input.Points
	}
	q := models.LearningQuestion{
		AssignmentID:   input.AssignmentID,
		Kind:           input.Kind,
		Prompt:         input.Prompt,
		Options:        encodeJSONStringArray(input.Options),
		CorrectAnswers: encodeJSONStringArray(input.CorrectAnswers),
		Points:         points,
		OrderIndex:     orderIndex,
	}
	if err := r.DB.WithContext(ctx).Create(&q).Error; err != nil {
		return nil, err
	}
	return questionToModel(q), nil
}

func (r *mutationResolver) UpdateLearningQuestion(ctx context.Context, id string, input model.UpdateLearningQuestionInput) (*model.LearningQuestion, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return nil, ErrForbidden
	}
	var q models.LearningQuestion
	if err := r.DB.WithContext(ctx).First(&q, "id = ?", id).Error; err != nil {
		return nil, ErrNotFound
	}
	var a models.LearningAssignment
	if err := r.DB.WithContext(ctx).First(&a, "id = ?", q.AssignmentID).Error; err != nil {
		return nil, ErrNotFound
	}
	if err := r.assertSectionInTenant(ctx, a.SectionID, auth.TenantID); err != nil {
		return nil, err
	}

	// Determine the effective new values for validation.
	newKind := q.Kind
	if input.Kind != nil {
		newKind = *input.Kind
	}
	newOpts := decodeJSONStringArray(q.Options)
	if input.Options != nil {
		newOpts = input.Options
	}
	newCorrect := decodeJSONStringArray(q.CorrectAnswers)
	if input.CorrectAnswers != nil {
		newCorrect = input.CorrectAnswers
	}
	if err := validateQuestionInput(newKind, newOpts, newCorrect); err != nil {
		return nil, err
	}

	updates := map[string]interface{}{}
	if input.Kind != nil {
		updates["kind"] = *input.Kind
	}
	if input.Prompt != nil {
		updates["prompt"] = *input.Prompt
	}
	if input.Options != nil {
		updates["options"] = encodeJSONStringArray(input.Options)
	}
	if input.CorrectAnswers != nil {
		updates["correct_answers"] = encodeJSONStringArray(input.CorrectAnswers)
	}
	if input.Points != nil {
		updates["points"] = *input.Points
	}
	if input.OrderIndex != nil {
		updates["order_index"] = *input.OrderIndex
	}
	if len(updates) > 0 {
		if err := r.DB.WithContext(ctx).Model(&q).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	r.DB.WithContext(ctx).First(&q, "id = ?", id)
	return questionToModel(q), nil
}

func (r *mutationResolver) DeleteLearningQuestion(ctx context.Context, id string) (bool, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return false, ErrForbidden
	}
	var q models.LearningQuestion
	if err := r.DB.WithContext(ctx).First(&q, "id = ?", id).Error; err != nil {
		return false, ErrNotFound
	}
	var a models.LearningAssignment
	if err := r.DB.WithContext(ctx).First(&a, "id = ?", q.AssignmentID).Error; err != nil {
		return false, ErrNotFound
	}
	if err := r.assertSectionInTenant(ctx, a.SectionID, auth.TenantID); err != nil {
		return false, err
	}
	return true, r.DB.WithContext(ctx).Delete(&q).Error
}

// ─── Mutation: quiz submission ────────────────────────────────────────────

func (r *mutationResolver) SubmitQuiz(ctx context.Context, employeeGoalProgressID, assignmentID string, answers []*model.QuizAnswerInput) (*model.QuizSubmissionResult, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	// Load the EGP and verify the caller owns it (admin bypass allowed for
	// testing / re-grading but not strictly required).
	var egp models.EmployeeGoalProgress
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", employeeGoalProgressID, auth.TenantID).
		First(&egp).Error; err != nil {
		return nil, ErrNotFound
	}
	if !isLearningAdmin(auth) {
		var emp models.Employee
		if err := r.DB.WithContext(ctx).
			Where("tenant_id = ? AND user_id = ?", auth.TenantID, auth.UserID).
			First(&emp).Error; err != nil {
			return nil, ErrForbidden
		}
		if emp.ID != egp.EmployeeID {
			return nil, ErrForbidden
		}
	}

	// Load assignment to get passScore & verify tenant.
	var a models.LearningAssignment
	if err := r.DB.WithContext(ctx).First(&a, "id = ?", assignmentID).Error; err != nil {
		return nil, ErrNotFound
	}
	if err := r.assertSectionInTenant(ctx, a.SectionID, auth.TenantID); err != nil {
		return nil, err
	}

	// Sequential-locking check still applies to quizzes.
	if err := r.assertItemUnlocked(ctx, egp, assignmentID, "assignment"); err != nil {
		return nil, err
	}

	// Load all questions for this quiz.
	var questions []models.LearningQuestion
	if err := r.DB.WithContext(ctx).
		Where("assignment_id = ?", assignmentID).
		Order("order_index asc").
		Find(&questions).Error; err != nil {
		return nil, err
	}
	if len(questions) == 0 {
		return nil, fmt.Errorf("%w: quiz has no questions", ErrValidation)
	}

	// Build a lookup of learner answers by question id.
	answerMap := make(map[string][]string, len(answers))
	for _, ans := range answers {
		if ans == nil {
			continue
		}
		answerMap[ans.QuestionID] = ans.Selected
	}

	// Grade.
	var score, maxScore float64
	for _, q := range questions {
		maxScore += q.Points
		learner := answerMap[q.ID]
		correct := decodeJSONStringArray(q.CorrectAnswers)
		if answersEqualSet(learner, correct) {
			score += q.Points
		}
	}
	pct := 0.0
	if maxScore > 0 {
		pct = (score / maxScore) * 100
	}
	// passScore is interpreted as a percentage threshold (0-100).
	passed := pct >= a.PassScore

	// Persist AssignmentProgress + rollup.
	var out *model.ItemProgress
	if err := r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var ap models.AssignmentProgress
		if err := tx.Where("employee_goal_progress_id = ? AND assignment_id = ?", egp.ID, assignmentID).
			First(&ap).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// Shouldn't normally happen (created on goal assignment), but be
				// defensive — the quiz might have been added after assignment.
				ap = models.AssignmentProgress{
					EmployeeGoalProgressID: egp.ID,
					AssignmentID:           assignmentID,
					Status:                 "pending",
				}
				if err := tx.Create(&ap).Error; err != nil {
					return err
				}
			} else {
				return err
			}
		}
		now := time.Now()
		ap.Score = &pct
		ap.CompletedAt = &now
		if passed {
			ap.Status = "passed"
		} else {
			ap.Status = "failed"
		}
		if err := tx.Save(&ap).Error; err != nil {
			return err
		}
		out = &model.ItemProgress{
			ID:          ap.ID,
			ItemID:      ap.AssignmentID,
			ItemType:    "assignment",
			Status:      ap.Status,
			Score:       ap.Score,
			CompletedAt: timePtrString(ap.CompletedAt),
		}

		// Rollup: if every child is done, flip EGP to completed.
		var pendingUnits int64
		tx.Model(&models.UnitProgress{}).
			Where("employee_goal_progress_id = ? AND status <> 'completed'", egp.ID).
			Count(&pendingUnits)
		var pendingAssigns int64
		tx.Model(&models.AssignmentProgress{}).
			Where("employee_goal_progress_id = ? AND status <> 'passed'", egp.ID).
			Count(&pendingAssigns)
		if pendingUnits == 0 && pendingAssigns == 0 {
			egp.Status = "completed"
			egp.CompletedAt = &now
		} else {
			egp.Status = "in_progress"
		}
		return tx.Save(&egp).Error
	}); err != nil {
		return nil, err
	}

	return &model.QuizSubmissionResult{
		Progress:   out,
		Score:      score,
		MaxScore:   maxScore,
		Percentage: pct,
		Passed:     passed,
	}, nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────

func (r *Resolver) nextQuestionOrderIndex(ctx context.Context, assignmentID string) int {
	var n int64
	r.DB.WithContext(ctx).Model(&models.LearningQuestion{}).
		Where("assignment_id = ?", assignmentID).Count(&n)
	return int(n) + 1
}

// validateQuestionInput enforces that the question's shape matches its kind.
func validateQuestionInput(kind string, options, correct []string) error {
	switch kind {
	case "mcq":
		if len(options) < 2 {
			return fmt.Errorf("%w: mcq requires at least 2 options", ErrValidation)
		}
		if len(correct) != 1 {
			return fmt.Errorf("%w: mcq requires exactly 1 correct answer", ErrValidation)
		}
	case "multi":
		if len(options) < 2 {
			return fmt.Errorf("%w: multi requires at least 2 options", ErrValidation)
		}
		if len(correct) < 1 {
			return fmt.Errorf("%w: multi requires at least 1 correct answer", ErrValidation)
		}
	case "true_false":
		if len(correct) != 1 || (correct[0] != "true" && correct[0] != "false") {
			return fmt.Errorf("%w: true_false correctAnswer must be ['true'] or ['false']", ErrValidation)
		}
	default:
		return fmt.Errorf("%w: kind must be mcq | multi | true_false", ErrValidation)
	}
	return nil
}

// encodeJSONStringArray serialises []string to JSON. Returns "[]" on nil.
func encodeJSONStringArray(xs []string) string {
	if xs == nil {
		xs = []string{}
	}
	b, _ := json.Marshal(xs)
	return string(b)
}

// decodeJSONStringArray is the inverse; tolerates empty/invalid input.
func decodeJSONStringArray(s string) []string {
	if s == "" {
		return []string{}
	}
	var out []string
	if err := json.Unmarshal([]byte(s), &out); err != nil {
		return []string{}
	}
	return out
}

// answersEqualSet returns true when two string slices contain the same
// elements regardless of order. Used for grading multi-select / mcq answers.
func answersEqualSet(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	ac := append([]string{}, a...)
	bc := append([]string{}, b...)
	sort.Strings(ac)
	sort.Strings(bc)
	for i := range ac {
		if ac[i] != bc[i] {
			return false
		}
	}
	return true
}
