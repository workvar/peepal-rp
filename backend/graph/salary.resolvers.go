package graph

import (
	"context"
	"errors"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// ── Queries ───────────────────────────────────────────────────────────────────

func (r *queryResolver) SalaryTemplates(ctx context.Context) ([]*model.SalaryTemplate, error) {
	// Salary configuration: admin only.
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var templates []models.SalaryTemplate
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).Order("name asc").Find(&templates).Error; err != nil {
		return nil, err
	}
	out := make([]*model.SalaryTemplate, len(templates))
	for i, t := range templates {
		out[i] = salaryTemplateToModel(t)
	}
	return out, nil
}

func (r *queryResolver) SalaryAssignments(ctx context.Context, employeeID *string) ([]*model.SalaryAssignment, error) {
	// Salary data across employees: admin only.
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	q := r.DB.Where("tenant_id = ?", auth.TenantID).
		Preload("EmployeeModel").Preload("EmployeeModel.User").Preload("EmployeeModel.Department").
		Preload("TemplateModel")
	if employeeID != nil && *employeeID != "" {
		q = q.Where("employee_id = ?", *employeeID)
	}
	var assignments []models.SalaryAssignment
	if err := q.Order("effective_from desc").Find(&assignments).Error; err != nil {
		return nil, err
	}
	out := make([]*model.SalaryAssignment, len(assignments))
	for i, a := range assignments {
		out[i] = salaryAssignmentToModel(a)
	}
	return out, nil
}

// ── Template Mutations ────────────────────────────────────────────────────────

func (r *mutationResolver) CreateSalaryTemplate(ctx context.Context, input model.CreateSalaryTemplateInput) (*model.SalaryTemplate, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	if input.BasicSalary <= 0 {
		return nil, GQLErr("basic_salary must be positive")
	}
	t := models.SalaryTemplate{
		TenantID:    auth.TenantID,
		Name:        input.Name,
		BasicSalary: input.BasicSalary,
		IsActive:    true,
	}
	if input.Description != nil {
		t.Description = *input.Description
	}
	if input.Hra != nil {
		t.HRA = *input.Hra
	}
	if input.Da != nil {
		t.DA = *input.Da
	}
	if input.Ta != nil {
		t.TA = *input.Ta
	}
	if input.MedicalAllowance != nil {
		t.MedicalAllowance = *input.MedicalAllowance
	}
	if input.OtherAllowances != nil {
		t.OtherAllowances = *input.OtherAllowances
	}
	if input.Pf != nil {
		t.PF = *input.Pf
	}
	if input.Esi != nil {
		t.ESI = *input.Esi
	}
	if input.Tds != nil {
		t.TDS = *input.Tds
	}
	if input.OtherDeductions != nil {
		t.OtherDeductions = *input.OtherDeductions
	}
	if err := r.DB.Create(&t).Error; err != nil {
		return nil, err
	}
	return salaryTemplateToModel(t), nil
}

func (r *mutationResolver) UpdateSalaryTemplate(ctx context.Context, id string, input model.UpdateSalaryTemplateInput) (*model.SalaryTemplate, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var t models.SalaryTemplate
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&t).Error; err != nil {
		return nil, ErrNotFound
	}
	if input.Name != nil {
		t.Name = *input.Name
	}
	if input.Description != nil {
		t.Description = *input.Description
	}
	if input.BasicSalary != nil && *input.BasicSalary > 0 {
		t.BasicSalary = *input.BasicSalary
	}
	if input.Hra != nil {
		t.HRA = *input.Hra
	}
	if input.Da != nil {
		t.DA = *input.Da
	}
	if input.Ta != nil {
		t.TA = *input.Ta
	}
	if input.MedicalAllowance != nil {
		t.MedicalAllowance = *input.MedicalAllowance
	}
	if input.OtherAllowances != nil {
		t.OtherAllowances = *input.OtherAllowances
	}
	if input.Pf != nil {
		t.PF = *input.Pf
	}
	if input.Esi != nil {
		t.ESI = *input.Esi
	}
	if input.Tds != nil {
		t.TDS = *input.Tds
	}
	if input.OtherDeductions != nil {
		t.OtherDeductions = *input.OtherDeductions
	}
	r.DB.Save(&t)
	return salaryTemplateToModel(t), nil
}

func (r *mutationResolver) DeleteSalaryTemplate(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	var count int64
	r.DB.Model(&models.SalaryAssignment{}).
		Where("tenant_id = ? AND template_id = ? AND is_active = ?", auth.TenantID, id, true).
		Count(&count)
	if count > 0 {
		return false, GQLErr("template is in use by active assignments; reassign those employees first")
	}
	res := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.SalaryTemplate{})
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// ── Assignment Mutations ──────────────────────────────────────────────────────

func (r *mutationResolver) AssignSalaryTemplate(ctx context.Context, input model.AssignSalaryTemplateInput) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	var effectiveFrom time.Time
	if input.EffectiveFrom != nil && *input.EffectiveFrom != "" {
		parsed, err := time.Parse("2006-01-02", *input.EffectiveFrom)
		if err != nil {
			return false, GQLErr("effective_from must be YYYY-MM-DD")
		}
		effectiveFrom = parsed
	} else {
		effectiveFrom = time.Now()
	}
	var tpl models.SalaryTemplate
	if err := r.DB.Where("id = ? AND tenant_id = ?", input.TemplateID, auth.TenantID).First(&tpl).Error; err != nil {
		return false, GQLErr("template not found")
	}
	if err := r.DB.Transaction(func(tx *gorm.DB) error {
		closedAt := effectiveFrom.Add(-time.Second)
		if err := tx.Model(&models.SalaryAssignment{}).
			Where("tenant_id = ? AND employee_id = ? AND is_active = ?", auth.TenantID, input.EmployeeID, true).
			Updates(map[string]interface{}{"is_active": false, "effective_to": &closedAt}).Error; err != nil {
			return err
		}
		a := models.SalaryAssignment{
			TenantID:      auth.TenantID,
			EmployeeID:    input.EmployeeID,
			TemplateID:    input.TemplateID,
			EffectiveFrom: effectiveFrom,
			IsActive:      true,
		}
		if input.ExtraAllowance != nil {
			a.ExtraAllowance = *input.ExtraAllowance
		}
		if input.ExtraDeduction != nil {
			a.ExtraDeduction = *input.ExtraDeduction
		}
		if input.Notes != nil {
			a.Notes = *input.Notes
		}
		return tx.Create(&a).Error
	}); err != nil {
		return false, err
	}
	return true, nil
}

func (r *mutationResolver) BulkAssignSalaryTemplate(ctx context.Context, input model.BulkAssignSalaryTemplateInput) (*model.BulkAssignResult, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var effectiveFrom time.Time
	if input.EffectiveFrom != nil && *input.EffectiveFrom != "" {
		parsed, err := time.Parse("2006-01-02", *input.EffectiveFrom)
		if err != nil {
			return nil, GQLErr("effective_from must be YYYY-MM-DD")
		}
		effectiveFrom = parsed
	} else {
		effectiveFrom = time.Now()
	}
	var tpl models.SalaryTemplate
	if err := r.DB.Where("id = ? AND tenant_id = ?", input.TemplateID, auth.TenantID).First(&tpl).Error; err != nil {
		return nil, GQLErr("template not found")
	}
	assigned := 0
	if err := r.DB.Transaction(func(tx *gorm.DB) error {
		closedAt := effectiveFrom.Add(-time.Second)
		for _, empID := range input.EmployeeIds {
			if empID == "" {
				continue
			}
			tx.Model(&models.SalaryAssignment{}).
				Where("tenant_id = ? AND employee_id = ? AND is_active = ?", auth.TenantID, empID, true).
				Updates(map[string]interface{}{"is_active": false, "effective_to": &closedAt})
			a := models.SalaryAssignment{
				TenantID:      auth.TenantID,
				EmployeeID:    empID,
				TemplateID:    input.TemplateID,
				EffectiveFrom: effectiveFrom,
				IsActive:      true,
			}
			if input.ExtraAllowance != nil {
				a.ExtraAllowance = *input.ExtraAllowance
			}
			if input.ExtraDeduction != nil {
				a.ExtraDeduction = *input.ExtraDeduction
			}
			if input.Notes != nil {
				a.Notes = *input.Notes
			}
			if err := tx.Create(&a).Error; err != nil {
				return err
			}
			assigned++
		}
		return nil
	}); err != nil {
		return nil, err
	}
	return &model.BulkAssignResult{AssignedCount: assigned}, nil
}

func (r *mutationResolver) UpdateSalaryAssignment(ctx context.Context, id string, input model.UpdateSalaryAssignmentInput) (*model.SalaryAssignment, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var a models.SalaryAssignment
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&a).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if input.TemplateID != nil && *input.TemplateID != "" {
		var tpl models.SalaryTemplate
		if err := r.DB.Where("id = ? AND tenant_id = ?", *input.TemplateID, auth.TenantID).First(&tpl).Error; err != nil {
			return nil, GQLErr("template not found")
		}
		a.TemplateID = *input.TemplateID
	}
	if input.ExtraAllowance != nil {
		a.ExtraAllowance = *input.ExtraAllowance
	}
	if input.ExtraDeduction != nil {
		a.ExtraDeduction = *input.ExtraDeduction
	}
	if input.Notes != nil {
		a.Notes = *input.Notes
	}
	r.DB.Save(&a)
	r.DB.Preload("EmployeeModel").Preload("EmployeeModel.User").Preload("EmployeeModel.Department").
		Preload("TemplateModel").First(&a, "id = ?", id)
	return salaryAssignmentToModel(a), nil
}

func (r *mutationResolver) DeleteSalaryAssignment(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.SalaryAssignment{})
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// ── helpers ───────────────────────────────────────────────────────────────────

func salaryTemplateToModel(t models.SalaryTemplate) *model.SalaryTemplate {
	return &model.SalaryTemplate{
		ID:               t.ID,
		Name:             t.Name,
		Description:      t.Description,
		BasicSalary:      t.BasicSalary,
		Hra:              t.HRA,
		Da:               t.DA,
		Ta:               t.TA,
		MedicalAllowance: t.MedicalAllowance,
		OtherAllowances:  t.OtherAllowances,
		Pf:               t.PF,
		Esi:              t.ESI,
		Tds:              t.TDS,
		OtherDeductions:  t.OtherDeductions,
		IsActive:         t.IsActive,
	}
}

func salaryAssignmentToModel(a models.SalaryAssignment) *model.SalaryAssignment {
	m := &model.SalaryAssignment{
		ID:             a.ID,
		EmployeeID:     a.EmployeeID,
		TemplateID:     a.TemplateID,
		ExtraAllowance: a.ExtraAllowance,
		ExtraDeduction: a.ExtraDeduction,
		EffectiveFrom:  a.EffectiveFrom.Format("2006-01-02"),
		IsActive:       a.IsActive,
		Notes:          a.Notes,
	}
	if a.EffectiveTo != nil {
		s := a.EffectiveTo.Format("2006-01-02")
		m.EffectiveTo = &s
	}
	if a.EmployeeModel.ID != "" {
		m.Employee = employeeToModel(a.EmployeeModel)
	}
	if a.TemplateModel.ID != "" {
		m.Template = salaryTemplateToModel(a.TemplateModel)
	}
	return m
}
