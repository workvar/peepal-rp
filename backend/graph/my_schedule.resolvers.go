package graph

import (
	"context"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"
)

// MyClinicianCalendar — a clinician's own calendar. The admin Schedules and
// Appointments pages are staff tools; a doctor logging in just wants to see
// which patients have been booked into their consulting windows. This query is
// scoped to the caller's own employee record, so it needs no module grant.

func (r *queryResolver) MyClinicianCalendar(ctx context.Context, from string, to string) (*model.MyClinicianCalendar, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	var emp models.Employee
	if err := r.DB.WithContext(ctx).Preload("User").
		Where("user_id = ? AND tenant_id = ?", auth.UserID, auth.TenantID).
		First(&emp).Error; err != nil {
		return nil, GQLErr("no employee profile is linked to this account")
	}

	from, to = strings.TrimSpace(from), strings.TrimSpace(to)
	if from == "" || to == "" {
		return nil, GQLErr("from and to dates are required")
	}
	if from > to {
		from, to = to, from
	}

	windows, err := clinicianWindows(r, ctx, auth.TenantID, emp.ID)
	if err != nil {
		return nil, err
	}
	appointments, err := clinicianAppointments(r, ctx, auth.TenantID, emp.ID, from, to)
	if err != nil {
		return nil, err
	}

	return &model.MyClinicianCalendar{
		ClinicianID:   emp.ID,
		ClinicianName: emp.User.Name,
		Windows:       windows,
		Appointments:  appointments,
	}, nil
}

// clinicianWindows loads every weekly consulting window for one clinician.
func clinicianWindows(r *queryResolver, ctx context.Context, tenantID, clinicianID string) ([]*model.ClinicianSchedule, error) {
	var rows []models.ClinicianSchedule
	if err := r.DB.WithContext(ctx).Preload("Clinician.User").
		Where("tenant_id = ? AND clinician_id = ?", tenantID, clinicianID).
		Order("day_of_week ASC, start_time ASC").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.ClinicianSchedule, len(rows))
	for i, s := range rows {
		out[i] = clinicianScheduleToModel(s)
	}
	return out, nil
}

// clinicianAppointments loads one clinician's bookings inside a date range.
func clinicianAppointments(r *queryResolver, ctx context.Context, tenantID, clinicianID, from, to string) ([]*model.Appointment, error) {
	var rows []models.Appointment
	if err := r.DB.WithContext(ctx).
		Preload("Patient").Preload("Clinician.User").Preload("Department").
		Where("tenant_id = ? AND clinician_id = ? AND date BETWEEN ? AND ?",
			tenantID, clinicianID, from, to).
		Order("date ASC, start_time ASC").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Appointment, len(rows))
	for i, a := range rows {
		out[i] = appointmentToModel(a)
	}
	return out, nil
}
