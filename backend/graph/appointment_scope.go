package graph

import (
	"context"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// Visibility and action rules for the Appointments module.
//
//	admin / super_admin : see everything, may edit and may accept/decline
//	staff (front desk)  : see everything, may book/reschedule/delete,
//	                      may NOT accept or decline on a clinician's behalf
//	everyone else       : see only the bookings where they are the clinician,
//	                      and may only accept/decline those
//
// "scopeNone" is returned when a caller is neither an admin nor staff and has
// no employee record, so the query matches nothing instead of everything.
const scopeNone = "__none__"

// isAppointmentAdmin reports whether the caller has the org-wide view.
func isAppointmentAdmin(auth AuthContext) bool {
	return auth.IsSuperAdmin ||
		auth.Role == roleAdmin ||
		auth.Role == string(models.RoleSuperAdmin)
}

// callerEmployeeID resolves the employee record linked to the logged-in user,
// or "" when the account has no employee profile (e.g. a pure admin login).
func callerEmployeeID(db *gorm.DB, ctx context.Context, auth AuthContext) string {
	var emp models.Employee
	if err := db.WithContext(ctx).Select("id").
		Where("user_id = ? AND tenant_id = ?", auth.UserID, auth.TenantID).
		First(&emp).Error; err != nil {
		return ""
	}
	return emp.ID
}

// appointmentViewScope returns the clinician id the caller's list must be
// filtered by. "" means no filter (full tenant view).
func appointmentViewScope(db *gorm.DB, ctx context.Context, auth AuthContext) string {
	if isAppointmentAdmin(auth) || auth.Role == roleStaff {
		return ""
	}
	if id := callerEmployeeID(db, ctx, auth); id != "" {
		return id
	}
	return scopeNone
}

// canDecideAppointment reports whether the caller may accept (complete) or
// decline (cancel) a booking: admins, or the clinician it belongs to.
func canDecideAppointment(db *gorm.DB, ctx context.Context, auth AuthContext, clinicianID string) bool {
	if isAppointmentAdmin(auth) {
		return true
	}
	return clinicianID != "" && callerEmployeeID(db, ctx, auth) == clinicianID
}

// canModifyAppointment reports whether the caller may change the booking's
// details (patient, clinician, slot, reason). Admins and front-desk staff can;
// clinicians can only decide on their own appointments, not rewrite them.
func canModifyAppointment(auth AuthContext) bool {
	return isAppointmentAdmin(auth) || auth.Role == roleStaff
}

// touchesAppointmentDetails reports whether an update changes anything other
// than the status.
func touchesAppointmentDetails(in model.UpdateAppointmentInput) bool {
	return in.PatientID != nil || in.ClinicianID != nil || in.DepartmentID != nil ||
		in.Date != nil || in.StartTime != nil || in.EndTime != nil ||
		in.Reason != nil || in.Notes != nil
}

// checkAppointmentEditRights enforces the split between deciding an
// appointment (admin or the assigned clinician) and rewriting one
// (admin or front-desk staff).
func checkAppointmentEditRights(
	db *gorm.DB, ctx context.Context, auth AuthContext,
	current models.Appointment, in model.UpdateAppointmentInput,
) error {
	if in.Status != nil && !canDecideAppointment(db, ctx, auth, current.ClinicianID) {
		return GQLErr("only an admin or the assigned clinician can accept or decline this appointment")
	}
	if touchesAppointmentDetails(in) && !canModifyAppointment(auth) {
		return GQLErr("only an admin or front-desk staff can reschedule or edit an appointment")
	}
	return nil
}
