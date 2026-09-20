package graph

import (
	"context"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

// Resolvers for Telemedicine — healthcare industry, Phase 5. Remote video
// consultations between a patient and a clinician.

func (r *queryResolver) TeleConsults(ctx context.Context, status *string, date *string) ([]*model.TeleConsult, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Preload("Patient").Preload("Clinician.User").
		Where("tenant_id = ?", auth.TenantID)
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	if date != nil && *date != "" {
		q = q.Where("DATE(scheduled_at) = ?", *date)
	}
	var rows []models.TeleConsult
	if err := q.Order("scheduled_at DESC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.TeleConsult, len(rows))
	for i, t := range rows {
		out[i] = teleConsultToModel(t)
	}
	return out, nil
}

func (r *mutationResolver) ScheduleTeleConsult(ctx context.Context, input model.ScheduleTeleConsultInput) (*model.TeleConsult, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	if !patientExists(r.DB, ctx, auth.TenantID, input.PatientID) {
		return nil, GQLErr("patient not found")
	}
	clinician := strVal(input.ClinicianID)
	if clinician != "" && !employeeExists(r.DB, ctx, auth.TenantID, clinician) {
		return nil, GQLErr("clinician not found")
	}
	scheduledAt, perr := time.Parse(time.RFC3339, input.ScheduledAt)
	if perr != nil {
		return nil, GQLErr("scheduledAt must be an RFC3339 timestamp")
	}
	t := models.TeleConsult{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		PatientID: input.PatientID, ClinicianID: clinician,
		ScheduledAt: scheduledAt, MeetingLink: strVal(input.MeetingLink),
		Status: models.TeleScheduled, Reason: strVal(input.Reason),
	}
	if err := r.DB.WithContext(ctx).Create(&t).Error; err != nil {
		return nil, err
	}
	return r.reloadTele(ctx, auth.TenantID, t.ID)
}

func (r *mutationResolver) UpdateTeleConsult(ctx context.Context, id string, input model.UpdateTeleConsultInput) (*model.TeleConsult, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	setStr(updates, "meeting_link", input.MeetingLink)
	setStr(updates, "notes", input.Notes)
	if input.ScheduledAt != nil && *input.ScheduledAt != "" {
		if ts, perr := time.Parse(time.RFC3339, *input.ScheduledAt); perr == nil {
			updates["scheduled_at"] = ts
		}
	}
	if input.Status != nil {
		valid := map[string]bool{
			models.TeleScheduled: true, models.TeleInProgress: true,
			models.TeleCompleted: true, models.TeleCancelled: true,
		}
		if !valid[*input.Status] {
			return nil, GQLErr("invalid status")
		}
		updates["status"] = *input.Status
	}
	if len(updates) == 0 {
		return nil, GQLErr("nothing to update")
	}
	res := r.DB.WithContext(ctx).Model(&models.TeleConsult{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return r.reloadTele(ctx, auth.TenantID, id)
}

func (r *mutationResolver) CancelTeleConsult(ctx context.Context, id string) (*model.TeleConsult, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	res := r.DB.WithContext(ctx).Model(&models.TeleConsult{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Update("status", models.TeleCancelled)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return r.reloadTele(ctx, auth.TenantID, id)
}

func (r *mutationResolver) reloadTele(ctx context.Context, tenantID, id string) (*model.TeleConsult, error) {
	var t models.TeleConsult
	if err := r.DB.WithContext(ctx).Preload("Patient").Preload("Clinician.User").
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&t).Error; err != nil {
		return nil, err
	}
	return teleConsultToModel(t), nil
}

func teleConsultToModel(t models.TeleConsult) *model.TeleConsult {
	m := &model.TeleConsult{
		ID: t.ID, PatientID: t.PatientID, PatientName: patientDisplayName(t.Patient), PatientMrn: t.Patient.MRN,
		ClinicianID: toStrPtr(t.ClinicianID),
		ScheduledAt: t.ScheduledAt.Format("2006-01-02T15:04:05Z07:00"),
		MeetingLink: toStrPtr(t.MeetingLink), Status: t.Status,
		Reason: toStrPtr(t.Reason), Notes: toStrPtr(strings.TrimSpace(t.Notes)),
		CreatedAt: rfc3339OrNil(t.CreatedAt),
	}
	if t.ClinicianID != "" {
		m.ClinicianName = toStrPtr(employeeName(t.Clinician))
	}
	return m
}
