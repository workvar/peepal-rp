package graph

import (
	"context"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Resolvers for Dietary / kitchen — healthcare industry, Phase 5. A diet plan
// per admitted patient and a log of meals served.

var dietTypes = map[string]bool{
	"normal": true, "diabetic": true, "renal": true, "cardiac": true,
	"soft": true, "liquid": true, "npo": true,
}
var mealTypes = map[string]bool{
	"breakfast": true, "lunch": true, "dinner": true, "snack": true,
}
var mealStatuses = map[string]bool{
	"served": true, "refused": true, "held": true,
}

func dietPlanQuery(db *gorm.DB) *gorm.DB {
	return db.Preload("Servings", func(d *gorm.DB) *gorm.DB { return d.Order("served_at DESC") })
}

func (r *queryResolver) DietPlans(ctx context.Context, admissionID string, includeDiscontinued *bool) ([]*model.DietPlan, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := dietPlanQuery(r.DB.WithContext(ctx)).
		Where("admission_id = ? AND tenant_id = ?", admissionID, auth.TenantID)
	if includeDiscontinued == nil || !*includeDiscontinued {
		q = q.Where("status = ?", models.DietActive)
	}
	var rows []models.DietPlan
	if err := q.Order("created_at DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.DietPlan, len(rows))
	for i, d := range rows {
		out[i] = dietPlanToModel(d)
	}
	return out, nil
}

func (r *mutationResolver) CreateDietPlan(ctx context.Context, input model.CreateDietPlanInput) (*model.DietPlan, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	patientID, ok := r.loadAdmissionPatient(auth.TenantID, input.AdmissionID)
	if !ok {
		return nil, GQLErr("admission not found")
	}
	dietType := "normal"
	if input.DietType != nil && *input.DietType != "" {
		if !dietTypes[*input.DietType] {
			return nil, GQLErr("invalid diet type")
		}
		dietType = *input.DietType
	}
	d := models.DietPlan{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		AdmissionID: input.AdmissionID, PatientID: patientID,
		DietType: dietType, Calories: intVal(input.Calories),
		Restrictions: strVal(input.Restrictions), Notes: strVal(input.Notes),
		Status: models.DietActive,
	}
	if err := r.DB.WithContext(ctx).Create(&d).Error; err != nil {
		return nil, err
	}
	return r.reloadDietPlan(ctx, auth.TenantID, d.ID)
}

func (r *mutationResolver) UpdateDietPlan(ctx context.Context, id string, input model.UpdateDietPlanInput) (*model.DietPlan, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	setStr(updates, "restrictions", input.Restrictions)
	setStr(updates, "notes", input.Notes)
	if input.DietType != nil {
		if !dietTypes[*input.DietType] {
			return nil, GQLErr("invalid diet type")
		}
		updates["diet_type"] = *input.DietType
	}
	if input.Calories != nil {
		updates["calories"] = *input.Calories
	}
	res := r.DB.WithContext(ctx).Model(&models.DietPlan{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return r.reloadDietPlan(ctx, auth.TenantID, id)
}

func (r *mutationResolver) DiscontinueDietPlan(ctx context.Context, id string) (*model.DietPlan, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	res := r.DB.WithContext(ctx).Model(&models.DietPlan{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Update("status", models.DietDiscontinued)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return r.reloadDietPlan(ctx, auth.TenantID, id)
}

func (r *mutationResolver) RecordMealServing(ctx context.Context, input model.RecordMealServingInput) (*model.DietPlan, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	var plan models.DietPlan
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", input.DietPlanID, auth.TenantID).First(&plan).Error; err != nil {
		return nil, ErrNotFound
	}
	if !mealTypes[input.MealType] {
		return nil, GQLErr("invalid meal type")
	}
	status := "served"
	if input.Status != nil && *input.Status != "" {
		if !mealStatuses[*input.Status] {
			return nil, GQLErr("status must be served, refused, or held")
		}
		status = *input.Status
	}
	s := models.MealServing{
		ID: uuid.NewString(), TenantID: auth.TenantID, DietPlanID: plan.ID,
		MealType: input.MealType, Status: status, Notes: strVal(input.Notes),
	}
	if err := r.DB.WithContext(ctx).Create(&s).Error; err != nil {
		return nil, err
	}
	return r.reloadDietPlan(ctx, auth.TenantID, plan.ID)
}

func (r *mutationResolver) reloadDietPlan(ctx context.Context, tenantID, id string) (*model.DietPlan, error) {
	var d models.DietPlan
	if err := dietPlanQuery(r.DB.WithContext(ctx)).
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&d).Error; err != nil {
		return nil, err
	}
	return dietPlanToModel(d), nil
}

func dietPlanToModel(d models.DietPlan) *model.DietPlan {
	servings := make([]*model.MealServing, len(d.Servings))
	for i, s := range d.Servings {
		servings[i] = &model.MealServing{
			ID: s.ID, MealType: s.MealType,
			ServedAt: s.ServedAt.Format("2006-01-02T15:04:05Z07:00"),
			Status:   s.Status, Notes: toStrPtr(s.Notes),
		}
	}
	return &model.DietPlan{
		ID: d.ID, AdmissionID: d.AdmissionID, PatientID: d.PatientID,
		DietType: d.DietType, Calories: d.Calories, Restrictions: toStrPtr(d.Restrictions),
		Notes: toStrPtr(d.Notes), Status: d.Status, Servings: servings,
		CreatedAt: rfc3339OrNil(d.CreatedAt),
	}
}
