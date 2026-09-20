package graph

import (
	"context"
	"errors"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

// Resolvers for Clinician Schedules (healthcare industry): weekly availability
// windows that appointment booking validates against (see appointment_rules.go).

// ClinicianSchedules lists availability windows, optionally for one clinician.
// Left unenforced in opAccess so the appointment form can show availability.
func (r *queryResolver) ClinicianSchedules(ctx context.Context, clinicianID *string) ([]*model.ClinicianSchedule, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).
		Preload("Clinician.User").
		Where("tenant_id = ?", auth.TenantID)
	if clinicianID != nil && *clinicianID != "" {
		q = q.Where("clinician_id = ?", *clinicianID)
	}
	var rows []models.ClinicianSchedule
	if err := q.Order("clinician_id ASC, day_of_week ASC, start_time ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.ClinicianSchedule, len(rows))
	for i, s := range rows {
		out[i] = clinicianScheduleToModel(s)
	}
	return out, nil
}

func (r *mutationResolver) CreateClinicianSchedule(ctx context.Context, input model.CreateClinicianScheduleInput) (*model.ClinicianSchedule, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if input.DayOfWeek < 0 || input.DayOfWeek > 6 {
		return nil, errors.New("dayOfWeek must be 0 (Sunday) through 6 (Saturday)")
	}
	if !validHHMM(input.StartTime) || !validHHMM(input.EndTime) || input.StartTime >= input.EndTime {
		return nil, errors.New("start/end must be HH:MM with start before end")
	}
	var n int64
	if err := r.DB.WithContext(ctx).Model(&models.Employee{}).
		Where("id = ? AND tenant_id = ?", input.ClinicianID, auth.TenantID).
		Count(&n).Error; err != nil {
		return nil, err
	}
	if n == 0 {
		return nil, GQLErr("clinician not found")
	}

	slot := 15
	if input.SlotMinutes != nil && *input.SlotMinutes > 0 {
		slot = *input.SlotMinutes
	}
	s := models.ClinicianSchedule{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		ClinicianID: input.ClinicianID, DayOfWeek: input.DayOfWeek,
		StartTime: input.StartTime, EndTime: input.EndTime,
		SlotMinutes: slot, Active: true,
	}
	if err := r.DB.WithContext(ctx).Create(&s).Error; err != nil {
		return nil, err
	}
	return loadClinicianSchedule(r, ctx, auth.TenantID, s.ID)
}

func (r *mutationResolver) UpdateClinicianSchedule(ctx context.Context, id string, input model.UpdateClinicianScheduleInput) (*model.ClinicianSchedule, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	if input.DayOfWeek != nil {
		if *input.DayOfWeek < 0 || *input.DayOfWeek > 6 {
			return nil, errors.New("dayOfWeek must be 0 (Sunday) through 6 (Saturday)")
		}
		updates["day_of_week"] = *input.DayOfWeek
	}
	if input.StartTime != nil {
		if !validHHMM(*input.StartTime) {
			return nil, errors.New("startTime must be HH:MM")
		}
		updates["start_time"] = *input.StartTime
	}
	if input.EndTime != nil {
		if !validHHMM(*input.EndTime) {
			return nil, errors.New("endTime must be HH:MM")
		}
		updates["end_time"] = *input.EndTime
	}
	if input.SlotMinutes != nil {
		if *input.SlotMinutes <= 0 {
			return nil, errors.New("slotMinutes must be positive")
		}
		updates["slot_minutes"] = *input.SlotMinutes
	}
	if input.Active != nil {
		updates["active"] = *input.Active
	}
	res := r.DB.WithContext(ctx).Model(&models.ClinicianSchedule{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return loadClinicianSchedule(r, ctx, auth.TenantID, id)
}

func (r *mutationResolver) DeleteClinicianSchedule(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Delete(&models.ClinicianSchedule{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// ── helpers ──────────────────────────────────────────────────────────────────

func clinicianScheduleToModel(s models.ClinicianSchedule) *model.ClinicianSchedule {
	return &model.ClinicianSchedule{
		ID: s.ID, ClinicianID: s.ClinicianID, ClinicianName: s.Clinician.User.Name,
		DayOfWeek: s.DayOfWeek, StartTime: s.StartTime, EndTime: s.EndTime,
		SlotMinutes: s.SlotMinutes, Active: s.Active,
	}
}

func loadClinicianSchedule(r *mutationResolver, ctx context.Context, tenantID, id string) (*model.ClinicianSchedule, error) {
	var s models.ClinicianSchedule
	if err := r.DB.WithContext(ctx).
		Preload("Clinician.User").
		Where("id = ? AND tenant_id = ?", id, tenantID).
		First(&s).Error; err != nil {
		return nil, err
	}
	return clinicianScheduleToModel(s), nil
}
