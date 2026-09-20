package graph

import (
	"context"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

// Resolvers for OT scheduling — healthcare industry, Phase 4. Theatres and the
// surgeries booked into them; a theatre cannot be double-booked for an
// overlapping time slot on the same day.

// ── Theatres ─────────────────────────────────────────────────────────────────

func (r *queryResolver) OperationTheatres(ctx context.Context, includeInactive *bool) ([]*model.OperationTheatre, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID)
	if includeInactive == nil || !*includeInactive {
		q = q.Where("active = ?", true)
	}
	var rows []models.OperationTheatre
	if err := q.Order("name ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.OperationTheatre, len(rows))
	for i, t := range rows {
		out[i] = theatreToModel(t)
	}
	return out, nil
}

func (r *mutationResolver) CreateOperationTheatre(ctx context.Context, input model.CreateOperationTheatreInput) (*model.OperationTheatre, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	code := strings.TrimSpace(input.Code)
	name := strings.TrimSpace(input.Name)
	if code == "" || name == "" {
		return nil, GQLErr("theatre code and name are required")
	}
	t := models.OperationTheatre{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		Code: code, Name: name, Location: strVal(input.Location), Active: true,
	}
	if err := r.DB.WithContext(ctx).Create(&t).Error; err != nil {
		return nil, uniqueErr(err, "a theatre with this code already exists")
	}
	return theatreToModel(t), nil
}

func (r *mutationResolver) UpdateOperationTheatre(ctx context.Context, id string, input model.UpdateOperationTheatreInput) (*model.OperationTheatre, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	setStr(updates, "code", input.Code)
	setStr(updates, "name", input.Name)
	setStr(updates, "location", input.Location)
	if input.Active != nil {
		updates["active"] = *input.Active
	}
	res := r.DB.WithContext(ctx).Model(&models.OperationTheatre{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates)
	if res.Error != nil {
		return nil, uniqueErr(res.Error, "a theatre with this code already exists")
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	var t models.OperationTheatre
	r.DB.WithContext(ctx).First(&t, "id = ?", id)
	return theatreToModel(t), nil
}

func (r *mutationResolver) DeleteOperationTheatre(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	var booked int64
	r.DB.WithContext(ctx).Model(&models.SurgerySchedule{}).
		Where("theatre_id = ? AND tenant_id = ? AND status = ?", id, auth.TenantID, models.SurgeryScheduled).Count(&booked)
	if booked > 0 {
		return false, GQLErr("theatre has scheduled surgeries; cancel them first")
	}
	res := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.OperationTheatre{})
	return res.RowsAffected > 0, res.Error
}

// ── Surgeries ────────────────────────────────────────────────────────────────

func (r *queryResolver) Surgeries(ctx context.Context, date *string, theatreID *string, status *string) ([]*model.SurgerySchedule, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Preload("Patient").Preload("Theatre").Preload("Surgeon.User").
		Where("tenant_id = ?", auth.TenantID)
	if date != nil && *date != "" {
		q = q.Where("scheduled_date = ?", *date)
	}
	if theatreID != nil && *theatreID != "" {
		q = q.Where("theatre_id = ?", *theatreID)
	}
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	var rows []models.SurgerySchedule
	if err := q.Order("scheduled_date DESC, start_time ASC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.SurgerySchedule, len(rows))
	for i, s := range rows {
		out[i] = surgeryToModel(s)
	}
	return out, nil
}

func (r *mutationResolver) ScheduleSurgery(ctx context.Context, input model.ScheduleSurgeryInput) (*model.SurgerySchedule, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	if !patientExists(r.DB, ctx, auth.TenantID, input.PatientID) {
		return nil, GQLErr("patient not found")
	}
	if !theatreExists(r, ctx, auth.TenantID, input.TheatreID) {
		return nil, GQLErr("theatre not found")
	}
	procedure := strings.TrimSpace(input.ProcedureName)
	if procedure == "" {
		return nil, GQLErr("procedure name is required")
	}
	if input.EndTime <= input.StartTime {
		return nil, GQLErr("end time must be after start time")
	}
	surgeon := strVal(input.SurgeonID)
	if surgeon != "" && !employeeExists(r.DB, ctx, auth.TenantID, surgeon) {
		return nil, GQLErr("surgeon not found")
	}
	// Overlap check: same theatre + date, active bookings, times overlap.
	var clash int64
	if err := r.DB.WithContext(ctx).Model(&models.SurgerySchedule{}).
		Where("tenant_id = ? AND theatre_id = ? AND scheduled_date = ? AND status <> ?",
			auth.TenantID, input.TheatreID, input.ScheduledDate, models.SurgeryCancelled).
		Where("start_time < ? AND end_time > ?", input.EndTime, input.StartTime).
		Count(&clash).Error; err != nil {
		return nil, err
	}
	if clash > 0 {
		return nil, GQLErr("theatre is already booked for an overlapping slot")
	}
	s := models.SurgerySchedule{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		PatientID: input.PatientID, TheatreID: input.TheatreID, SurgeonID: surgeon,
		ProcedureName: procedure, AnesthesiaType: strVal(input.AnesthesiaType),
		ScheduledDate: input.ScheduledDate, StartTime: input.StartTime, EndTime: input.EndTime,
		Status: models.SurgeryScheduled, Notes: strVal(input.Notes),
	}
	if err := r.DB.WithContext(ctx).Create(&s).Error; err != nil {
		return nil, err
	}
	return r.reloadSurgery(ctx, auth.TenantID, s.ID)
}

func (r *mutationResolver) SetSurgeryStatus(ctx context.Context, id string, status string) (*model.SurgerySchedule, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	allowed := map[string]bool{
		models.SurgeryInProgress: true, models.SurgeryCompleted: true, models.SurgeryScheduled: true,
	}
	if !allowed[status] {
		return nil, GQLErr("status must be scheduled, in_progress, or completed")
	}
	res := r.DB.WithContext(ctx).Model(&models.SurgerySchedule{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Update("status", status)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return r.reloadSurgery(ctx, auth.TenantID, id)
}

func (r *mutationResolver) CancelSurgery(ctx context.Context, id string) (*model.SurgerySchedule, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	res := r.DB.WithContext(ctx).Model(&models.SurgerySchedule{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Update("status", models.SurgeryCancelled)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return r.reloadSurgery(ctx, auth.TenantID, id)
}

// ── helpers ──────────────────────────────────────────────────────────────────

func theatreExists(r *mutationResolver, ctx context.Context, tenantID, id string) bool {
	var n int64
	r.DB.WithContext(ctx).Model(&models.OperationTheatre{}).
		Where("id = ? AND tenant_id = ?", id, tenantID).Count(&n)
	return n > 0
}

func (r *mutationResolver) reloadSurgery(ctx context.Context, tenantID, id string) (*model.SurgerySchedule, error) {
	var s models.SurgerySchedule
	if err := r.DB.WithContext(ctx).Preload("Patient").Preload("Theatre").Preload("Surgeon.User").
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&s).Error; err != nil {
		return nil, err
	}
	return surgeryToModel(s), nil
}

func theatreToModel(t models.OperationTheatre) *model.OperationTheatre {
	return &model.OperationTheatre{
		ID: t.ID, Code: t.Code, Name: t.Name, Location: toStrPtr(t.Location), Active: t.Active,
	}
}

func surgeryToModel(s models.SurgerySchedule) *model.SurgerySchedule {
	m := &model.SurgerySchedule{
		ID: s.ID, PatientID: s.PatientID, PatientName: patientDisplayName(s.Patient), PatientMrn: s.Patient.MRN,
		TheatreID: s.TheatreID, TheatreName: s.Theatre.Name,
		SurgeonID: toStrPtr(s.SurgeonID), ProcedureName: s.ProcedureName,
		AnesthesiaType: toStrPtr(s.AnesthesiaType), ScheduledDate: s.ScheduledDate,
		StartTime: s.StartTime, EndTime: s.EndTime, Status: s.Status, Notes: toStrPtr(s.Notes),
		CreatedAt: rfc3339OrNil(s.CreatedAt),
	}
	if s.SurgeonID != "" {
		m.SurgeonName = toStrPtr(employeeName(s.Surgeon))
	}
	return m
}
