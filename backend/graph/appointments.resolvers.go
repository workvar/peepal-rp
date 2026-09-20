package graph

import (
	"context"
	"errors"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

// Resolvers for the Appointments module (healthcare industry).

var appointmentStatuses = map[string]bool{
	models.AppointmentScheduled: true,
	models.AppointmentCompleted: true,
	models.AppointmentCancelled: true,
	models.AppointmentNoShow:    true,
}

// Appointments lists appointments with optional date/clinician/patient/status filters.
func (r *queryResolver) Appointments(ctx context.Context, date *string, clinicianID *string, patientID *string, status *string) ([]*model.Appointment, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).
		Preload("Patient").Preload("Clinician.User").Preload("Department").
		Where("tenant_id = ?", auth.TenantID)

	// A clinician only ever sees the bookings made against their own name;
	// admins and front-desk staff see the whole tenant.
	if scope := appointmentViewScope(r.DB, ctx, auth); scope != "" {
		if scope == scopeNone {
			return []*model.Appointment{}, nil
		}
		q = q.Where("clinician_id = ?", scope)
	}

	if date != nil && *date != "" {
		q = q.Where("date = ?", *date)
	}
	if clinicianID != nil && *clinicianID != "" {
		q = q.Where("clinician_id = ?", *clinicianID)
	}
	if patientID != nil && *patientID != "" {
		q = q.Where("patient_id = ?", *patientID)
	}
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	var rows []models.Appointment
	if err := q.Order("date DESC, start_time ASC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Appointment, len(rows))
	for i, a := range rows {
		out[i] = appointmentToModel(a)
	}
	return out, nil
}

// Appointment fetches one booking by id — used by the printable OPD slip,
// which is opened by URL and so cannot rely on the list query's cache. The
// same view scoping as Appointments applies: a clinician only sees their own.
func (r *queryResolver) Appointment(ctx context.Context, id string) (*model.Appointment, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).
		Preload("Patient").Preload("Clinician.User").Preload("Department").
		Where("id = ? AND tenant_id = ?", id, auth.TenantID)
	if scope := appointmentViewScope(r.DB, ctx, auth); scope != "" {
		if scope == scopeNone {
			return nil, ErrNotFound
		}
		q = q.Where("clinician_id = ?", scope)
	}
	var row models.Appointment
	if err := q.First(&row).Error; err != nil {
		return nil, ErrNotFound
	}
	return appointmentToModel(row), nil
}

// CreateAppointment books a slot, rejecting a double-booked clinician.
func (r *mutationResolver) CreateAppointment(ctx context.Context, input model.CreateAppointmentInput) (*model.Appointment, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(input.Date) == "" || strings.TrimSpace(input.StartTime) == "" {
		return nil, errors.New("date and start time are required")
	}
	// A clinician may only book into their own diary; admins and front-desk
	// staff can book for anyone.
	if !canModifyAppointment(auth) && !canDecideAppointment(r.DB, ctx, auth, input.ClinicianID) {
		return nil, GQLErr("you can only book appointments against your own name")
	}
	if err := verifyPatientAndClinician(r, ctx, auth.TenantID, input.PatientID, input.ClinicianID); err != nil {
		return nil, err
	}
	if err := checkClinicianAvailability(r, ctx, auth.TenantID, input.ClinicianID, input.Date, input.StartTime); err != nil {
		return nil, err
	}

	// A clinician can hold one appointment per date + start time.
	var clash int64
	if err := r.DB.WithContext(ctx).Model(&models.Appointment{}).
		Where("tenant_id = ? AND clinician_id = ? AND date = ? AND start_time = ? AND status = ?",
			auth.TenantID, input.ClinicianID, input.Date, input.StartTime, models.AppointmentScheduled).
		Count(&clash).Error; err != nil {
		return nil, err
	}
	if clash > 0 {
		return nil, GQLErr("the clinician already has an appointment at this date and time")
	}

	a := models.Appointment{
		ID:           uuid.NewString(),
		TenantID:     auth.TenantID,
		PatientID:    input.PatientID,
		ClinicianID:  input.ClinicianID,
		DepartmentID: strVal(input.DepartmentID),
		Date:         strings.TrimSpace(input.Date),
		StartTime:    strings.TrimSpace(input.StartTime),
		EndTime:      strVal(input.EndTime),
		Reason:       strVal(input.Reason),
		Notes:        strVal(input.Notes),
		ReferredBy:   strVal(input.ReferredBy),
		Status:       models.AppointmentScheduled,
	}
	if err := r.DB.WithContext(ctx).Create(&a).Error; err != nil {
		return nil, err
	}
	return loadAppointment(r, ctx, auth.TenantID, a.ID)
}

// UpdateAppointment applies partial updates, including reschedules and status changes.
func (r *mutationResolver) UpdateAppointment(ctx context.Context, id string, input model.UpdateAppointmentInput) (*model.Appointment, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	var current models.Appointment
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		First(&current).Error; err != nil {
		return nil, ErrNotFound
	}
	if err := checkAppointmentEditRights(r.DB, ctx, auth, current, input); err != nil {
		return nil, err
	}

	updates := map[string]interface{}{}
	if input.PatientID != nil || input.ClinicianID != nil || input.Date != nil || input.StartTime != nil {
		// Re-verify references and consulting hours when the parties or the
		// slot change.
		pid, cid := current.PatientID, current.ClinicianID
		date, start := current.Date, current.StartTime
		if input.PatientID != nil {
			pid = *input.PatientID
		}
		if input.ClinicianID != nil {
			cid = *input.ClinicianID
		}
		if input.Date != nil {
			date = *input.Date
		}
		if input.StartTime != nil {
			start = *input.StartTime
		}
		if input.PatientID != nil || input.ClinicianID != nil {
			if err := verifyPatientAndClinician(r, ctx, auth.TenantID, pid, cid); err != nil {
				return nil, err
			}
		}
		if cid != "" {
			if err := checkClinicianAvailability(r, ctx, auth.TenantID, cid, date, start); err != nil {
				return nil, err
			}
		}
		setStr(updates, "patient_id", input.PatientID)
		setStr(updates, "clinician_id", input.ClinicianID)
	}
	setStr(updates, "department_id", input.DepartmentID)
	setStr(updates, "date", input.Date)
	setStr(updates, "start_time", input.StartTime)
	setStr(updates, "end_time", input.EndTime)
	setStr(updates, "reason", input.Reason)
	setStr(updates, "notes", input.Notes)
	setStr(updates, "referred_by", input.ReferredBy)
	if input.Status != nil {
		if !appointmentStatuses[*input.Status] {
			return nil, GQLErr("status must be scheduled, completed, cancelled, or no_show")
		}
		updates["status"] = *input.Status
	}

	res := r.DB.WithContext(ctx).Model(&models.Appointment{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return loadAppointment(r, ctx, auth.TenantID, id)
}

// DeleteAppointment removes an appointment.
func (r *mutationResolver) DeleteAppointment(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Delete(&models.Appointment{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// --- helpers ---

// verifyPatientAndClinician confirms both references exist in this tenant.
func verifyPatientAndClinician(r *mutationResolver, ctx context.Context, tenantID, patientID, clinicianID string) error {
	var n int64
	if err := r.DB.WithContext(ctx).Model(&models.Patient{}).
		Where("id = ? AND tenant_id = ?", patientID, tenantID).Count(&n).Error; err != nil {
		return err
	}
	if n == 0 {
		return GQLErr("patient not found")
	}
	if err := r.DB.WithContext(ctx).Model(&models.Employee{}).
		Where("id = ? AND tenant_id = ?", clinicianID, tenantID).Count(&n).Error; err != nil {
		return err
	}
	if n == 0 {
		return GQLErr("clinician not found")
	}
	return nil
}

// loadAppointment reloads one appointment with its display associations.
func loadAppointment(r *mutationResolver, ctx context.Context, tenantID, id string) (*model.Appointment, error) {
	var a models.Appointment
	if err := r.DB.WithContext(ctx).
		Preload("Patient").Preload("Clinician.User").Preload("Department").
		Where("id = ? AND tenant_id = ?", id, tenantID).
		First(&a).Error; err != nil {
		return nil, err
	}
	return appointmentToModel(a), nil
}
