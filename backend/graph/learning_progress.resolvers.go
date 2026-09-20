package graph

// Learning Matrix progress and assignment resolvers: assignment item CRUD, department goal assignments, and employee progress queries/updates.

import (
	"context"
	"errors"
	"fmt"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// ─── Queries: Assignments and progress ────────────────────────────────────

func (r *queryResolver) GoalAssignments(ctx context.Context, goalID string) ([]*model.GoalAssignmentItem, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return nil, ErrForbidden
	}
	var rows []models.GoalAssignment
	if err := r.DB.WithContext(ctx).
		Preload("Goal").Preload("Department").
		Where("tenant_id = ? AND goal_id = ?", auth.TenantID, goalID).
		Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.GoalAssignmentItem, len(rows))
	for i, ga := range rows {
		out[i] = goalAssignmentToModel(r.DB.WithContext(ctx), ga)
	}
	return out, nil
}

func (r *queryResolver) DepartmentLearningProgress(ctx context.Context, deptID string) ([]*model.EmployeeGoalProgress, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return nil, ErrForbidden
	}
	// Find all employees in the department, then fetch their progress rows.
	var employeeIDs []string
	if err := r.DB.WithContext(ctx).Model(&models.Employee{}).
		Where("tenant_id = ? AND department_id = ?", auth.TenantID, deptID).
		Pluck("id", &employeeIDs).Error; err != nil {
		return nil, err
	}
	if len(employeeIDs) == 0 {
		return []*model.EmployeeGoalProgress{}, nil
	}
	var progress []models.EmployeeGoalProgress
	if err := r.DB.WithContext(ctx).
		Preload("Goal").
		Where("tenant_id = ? AND employee_id IN ?", auth.TenantID, employeeIDs).
		Find(&progress).Error; err != nil {
		return nil, err
	}
	out := make([]*model.EmployeeGoalProgress, len(progress))
	for i, p := range progress {
		out[i] = employeeGoalProgressToModel(r.DB.WithContext(ctx), p)
	}
	return out, nil
}

func (r *queryResolver) MyLearningGoals(ctx context.Context) ([]*model.EmployeeGoalProgress, error) {
	// Self-service: scoped to the caller's own employee record below.
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	// Locate the employee record for the caller.
	var emp models.Employee
	if err := r.DB.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", auth.TenantID, auth.UserID).
		First(&emp).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return []*model.EmployeeGoalProgress{}, nil
		}
		return nil, err
	}
	return r.fetchEmployeeGoals(ctx, auth.TenantID, emp.ID)
}

func (r *queryResolver) EmployeeLearningGoals(ctx context.Context, employeeID string) ([]*model.EmployeeGoalProgress, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	// Admin may view any employee; non-admins only themselves.
	if !isLearningAdmin(auth) {
		var emp models.Employee
		if err := r.DB.WithContext(ctx).
			Where("tenant_id = ? AND user_id = ?", auth.TenantID, auth.UserID).
			First(&emp).Error; err != nil || emp.ID != employeeID {
			return nil, ErrForbidden
		}
	}
	return r.fetchEmployeeGoals(ctx, auth.TenantID, employeeID)
}

func (r *Resolver) fetchEmployeeGoals(ctx context.Context, tenantID, employeeID string) ([]*model.EmployeeGoalProgress, error) {
	var rows []models.EmployeeGoalProgress
	if err := r.DB.WithContext(ctx).
		Preload("Goal").
		Where("tenant_id = ? AND employee_id = ?", tenantID, employeeID).
		Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.EmployeeGoalProgress, len(rows))
	for i, p := range rows {
		out[i] = employeeGoalProgressToModel(r.DB.WithContext(ctx), p)
	}
	return out, nil
}

// ─── Mutations: Assignment ────────────────────────────────────────────────

func (r *mutationResolver) CreateLearningAssignment(ctx context.Context, input model.CreateLearningAssignmentInput) (*model.LearningItem, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return nil, ErrForbidden
	}
	if err := r.assertSectionInTenant(ctx, input.SectionID, auth.TenantID); err != nil {
		return nil, err
	}
	if input.AssessmentType != "completion" && input.AssessmentType != "score" {
		return nil, fmt.Errorf("%w: assessmentType must be 'completion' or 'score'", ErrValidation)
	}
	orderIndex := input.OrderIndex
	if orderIndex <= 0 {
		orderIndex = r.nextSectionOrderIndex(ctx, input.SectionID)
	}
	a := models.LearningAssignment{
		SectionID:      input.SectionID,
		Title:          input.Title,
		Description:    stringOrEmpty(input.Description),
		OrderIndex:     orderIndex,
		AssessmentType: input.AssessmentType,
		PassScore:      floatVal(input.PassScore),
	}
	if err := r.DB.WithContext(ctx).Create(&a).Error; err != nil {
		return nil, err
	}
	return assignmentToItemModel(a), nil
}

func (r *mutationResolver) UpdateLearningAssignment(ctx context.Context, id string, input model.UpdateLearningAssignmentInput) (*model.LearningItem, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return nil, ErrForbidden
	}
	var a models.LearningAssignment
	if err := r.DB.WithContext(ctx).First(&a, "id = ?", id).Error; err != nil {
		return nil, ErrNotFound
	}
	if err := r.assertSectionInTenant(ctx, a.SectionID, auth.TenantID); err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	if input.Title != nil {
		updates["title"] = *input.Title
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.OrderIndex != nil {
		updates["order_index"] = *input.OrderIndex
	}
	if input.AssessmentType != nil {
		if *input.AssessmentType != "completion" && *input.AssessmentType != "score" {
			return nil, fmt.Errorf("%w: invalid assessmentType", ErrValidation)
		}
		updates["assessment_type"] = *input.AssessmentType
	}
	if input.PassScore != nil {
		updates["pass_score"] = *input.PassScore
	}
	if len(updates) > 0 {
		if err := r.DB.WithContext(ctx).Model(&a).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	r.DB.WithContext(ctx).First(&a, "id = ?", id)
	return assignmentToItemModel(a), nil
}

func (r *mutationResolver) DeleteLearningAssignment(ctx context.Context, id string) (bool, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return false, ErrForbidden
	}
	var a models.LearningAssignment
	if err := r.DB.WithContext(ctx).First(&a, "id = ?", id).Error; err != nil {
		return false, ErrNotFound
	}
	if err := r.assertSectionInTenant(ctx, a.SectionID, auth.TenantID); err != nil {
		return false, err
	}
	return true, r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		tx.Where("assignment_id = ?", id).Delete(&models.AssignmentProgress{})
		return tx.Delete(&a).Error
	})
}

// ─── Mutations: Department assignment ─────────────────────────────────────

func (r *mutationResolver) AssignGoalToDepartment(ctx context.Context, goalID, departmentID string) (*model.GoalAssignmentItem, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return nil, ErrForbidden
	}
	if err := r.assertGoalInTenant(ctx, goalID, auth.TenantID); err != nil {
		return nil, err
	}

	// Guard against duplicate assignment.
	var existing int64
	r.DB.WithContext(ctx).Model(&models.GoalAssignment{}).
		Where("tenant_id = ? AND goal_id = ? AND department_id = ?", auth.TenantID, goalID, departmentID).
		Count(&existing)
	if existing > 0 {
		return nil, fmt.Errorf("%w: goal already assigned to this department", ErrValidation)
	}

	var ga models.GoalAssignment
	if err := r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		ga = models.GoalAssignment{
			TenantID:     auth.TenantID,
			GoalID:       goalID,
			DepartmentID: departmentID,
		}
		if err := tx.Create(&ga).Error; err != nil {
			return err
		}

		// Create progress rows for every employee in the department.
		var employees []models.Employee
		if err := tx.Where("tenant_id = ? AND department_id = ?", auth.TenantID, departmentID).
			Find(&employees).Error; err != nil {
			return err
		}
		// Gather units + assignments of the goal for child-progress creation.
		var sectionIDs []string
		tx.Model(&models.LearningSection{}).Where("goal_id = ?", goalID).Pluck("id", &sectionIDs)
		var units []models.LearningUnit
		var assigns []models.LearningAssignment
		if len(sectionIDs) > 0 {
			tx.Where("section_id IN ?", sectionIDs).Find(&units)
			tx.Where("section_id IN ?", sectionIDs).Find(&assigns)
		}
		for _, emp := range employees {
			egp := models.EmployeeGoalProgress{
				TenantID:     auth.TenantID,
				EmployeeID:   emp.ID,
				GoalID:       goalID,
				AssignmentID: ga.ID,
				Status:       "not_started",
			}
			if err := tx.Create(&egp).Error; err != nil {
				return err
			}
			for _, u := range units {
				if err := tx.Create(&models.UnitProgress{
					EmployeeGoalProgressID: egp.ID,
					UnitID:                 u.ID,
					Status:                 "pending",
				}).Error; err != nil {
					return err
				}
			}
			for _, a := range assigns {
				if err := tx.Create(&models.AssignmentProgress{
					EmployeeGoalProgressID: egp.ID,
					AssignmentID:           a.ID,
					Status:                 "pending",
				}).Error; err != nil {
					return err
				}
			}
		}
		return nil
	}); err != nil {
		return nil, err
	}

	// Reload with preloads.
	r.DB.WithContext(ctx).Preload("Goal").Preload("Department").First(&ga, "id = ?", ga.ID)
	return goalAssignmentToModel(r.DB.WithContext(ctx), ga), nil
}

func (r *mutationResolver) RemoveGoalAssignment(ctx context.Context, assignmentID string) (bool, error) {
	auth := AuthFromCtx(ctx)
	if !isLearningAdmin(auth) {
		return false, ErrForbidden
	}
	var ga models.GoalAssignment
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", assignmentID, auth.TenantID).
		First(&ga).Error; err != nil {
		return false, ErrNotFound
	}
	return true, r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Cascade: remove all employee progress for this assignment_id.
		var progIDs []string
		tx.Model(&models.EmployeeGoalProgress{}).
			Where("assignment_id = ?", assignmentID).Pluck("id", &progIDs)
		if len(progIDs) > 0 {
			tx.Where("employee_goal_progress_id IN ?", progIDs).Delete(&models.UnitProgress{})
			tx.Where("employee_goal_progress_id IN ?", progIDs).Delete(&models.AssignmentProgress{})
		}
		tx.Where("assignment_id = ?", assignmentID).Delete(&models.EmployeeGoalProgress{})
		return tx.Delete(&ga).Error
	})
}

// ─── Mutations: Progress ──────────────────────────────────────────────────

func (r *mutationResolver) UpdateItemProgress(ctx context.Context, input model.UpdateItemProgressInput) (*model.ItemProgress, error) {
	// Ownership (admin or owning employee) is enforced below.
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	var egp models.EmployeeGoalProgress
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", input.EmployeeGoalProgressID, auth.TenantID).
		First(&egp).Error; err != nil {
		return nil, ErrNotFound
	}

	// Authorization: admin OR the owning employee for unit completion.
	isAdmin := isLearningAdmin(auth)
	if !isAdmin {
		// Caller must own this EGP row.
		var emp models.Employee
		if err := r.DB.WithContext(ctx).
			Where("tenant_id = ? AND user_id = ?", auth.TenantID, auth.UserID).
			First(&emp).Error; err != nil {
			return nil, ErrForbidden
		}
		if emp.ID != egp.EmployeeID {
			return nil, ErrForbidden
		}
		// Score-based assignment progress may only be recorded by admin.
		if input.ItemType == "assignment" {
			var a models.LearningAssignment
			if err := r.DB.WithContext(ctx).First(&a, "id = ?", input.ItemID).Error; err == nil {
				if a.AssessmentType == "score" {
					return nil, ErrForbidden
				}
			}
		}
	}

	// Enforce sequential locking.
	if err := r.assertItemUnlocked(ctx, egp, input.ItemID, input.ItemType); err != nil {
		return nil, err
	}

	var out *model.ItemProgress
	if err := r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		switch input.ItemType {
		case "unit":
			var up models.UnitProgress
			if err := tx.Where("employee_goal_progress_id = ? AND unit_id = ?", egp.ID, input.ItemID).
				First(&up).Error; err != nil {
				return ErrNotFound
			}
			if input.Status != "completed" {
				return fmt.Errorf("%w: units only accept status 'completed'", ErrValidation)
			}
			up.Status = "completed"
			up.CompletedAt = &now
			if err := tx.Save(&up).Error; err != nil {
				return err
			}
			out = &model.ItemProgress{
				ID:          up.ID,
				ItemID:      up.UnitID,
				ItemType:    "unit",
				Status:      up.Status,
				CompletedAt: timePtrString(up.CompletedAt),
			}
		case "assignment":
			var ap models.AssignmentProgress
			if err := tx.Where("employee_goal_progress_id = ? AND assignment_id = ?", egp.ID, input.ItemID).
				First(&ap).Error; err != nil {
				return ErrNotFound
			}
			var a models.LearningAssignment
			if err := tx.First(&a, "id = ?", input.ItemID).Error; err != nil {
				return ErrNotFound
			}
			if a.AssessmentType == "score" && input.Score == nil {
				return fmt.Errorf("%w: score required for score-based assessment", ErrValidation)
			}
			if input.Status != "passed" && input.Status != "failed" {
				return fmt.Errorf("%w: assignment status must be 'passed' or 'failed'", ErrValidation)
			}
			ap.Status = input.Status
			if input.Score != nil {
				ap.Score = input.Score
				// Auto-derive pass/fail for score-based if score provided but status not explicit.
				if a.AssessmentType == "score" {
					if *input.Score >= a.PassScore {
						ap.Status = "passed"
					} else {
						ap.Status = "failed"
					}
				}
			}
			ap.CompletedAt = &now
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
		default:
			return fmt.Errorf("%w: itemType must be 'unit' or 'assignment'", ErrValidation)
		}

		// Auto-complete rollup: if every child is done, flip EGP to completed.
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
	return out, nil
}
