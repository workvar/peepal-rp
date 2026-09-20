package graph

import (
	"context"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// Patient portal — healthcare industry, Phase 5. Admins create a login for a
// patient record; the patient then signs in (role=patient) and sees only their
// own care via the my* queries below (role-locked, like the student portal).

// CreatePatientLogin provisions a patient's self-service account and links it to
// the patient record. Admin/staff only.
func (r *mutationResolver) CreatePatientLogin(ctx context.Context, patientID string, email string, password *string) (*model.Patient, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	email = strings.TrimSpace(email)
	if email == "" {
		return nil, GQLErr("an email is required for a patient login")
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var patient models.Patient
		if err := tx.Where("id = ? AND tenant_id = ?", patientID, auth.TenantID).First(&patient).Error; err != nil {
			return GQLErr("patient not found")
		}
		if patient.UserID != "" {
			return GQLErr("this patient already has a login")
		}
		name := strings.TrimSpace(patient.FirstName + " " + patient.LastName)
		userID, cerr := createLoginAccount(tx, auth.TenantID, name, email, strVal(password), models.RolePatient)
		if cerr != nil {
			return cerr
		}
		return tx.Model(&models.Patient{}).Where("id = ?", patient.ID).Update("user_id", userID).Error
	})
	if err != nil {
		return nil, err
	}
	return (&queryResolver{r.Resolver}).Patient(ctx, patientID)
}

// ── Portal queries (scoped to the logged-in patient) ─────────────────────────

// patientForCaller returns the Patient row linked to the caller's user account.
func (r *Resolver) patientForCaller(ctx context.Context) (models.Patient, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return models.Patient{}, err
	}
	var p models.Patient
	if err := r.DB.WithContext(ctx).
		Where("user_id = ? AND tenant_id = ?", auth.UserID, auth.TenantID).First(&p).Error; err != nil {
		return models.Patient{}, GQLErr("no patient profile is linked to this account")
	}
	return p, nil
}

func (r *queryResolver) MyPatientProfile(ctx context.Context) (*model.Patient, error) {
	p, err := r.patientForCaller(ctx)
	if err != nil {
		return nil, err
	}
	return patientToModel(p), nil
}

func (r *queryResolver) MyPatientSummary(ctx context.Context) (*model.PatientPortalSummary, error) {
	p, err := r.patientForCaller(ctx)
	if err != nil {
		return nil, err
	}
	db := r.DB.WithContext(ctx)
	var appts, visits, labs, refs int64
	db.Model(&models.Appointment{}).Where("patient_id = ? AND status = ?", p.ID, models.AppointmentScheduled).Count(&appts)
	db.Model(&models.Encounter{}).Where("patient_id = ?", p.ID).Count(&visits)
	db.Model(&models.LabOrder{}).Where("patient_id = ?", p.ID).Count(&labs)
	db.Model(&models.Referral{}).Where("patient_id = ? AND status IN ?", p.ID, []string{models.ReferralPending, models.ReferralAccepted}).Count(&refs)
	return &model.PatientPortalSummary{
		UpcomingAppointments: int(appts), Visits: int(visits),
		LabOrders: int(labs), ActiveReferrals: int(refs),
	}, nil
}

func (r *queryResolver) MyPatientAppointments(ctx context.Context) ([]*model.Appointment, error) {
	p, err := r.patientForCaller(ctx)
	if err != nil {
		return nil, err
	}
	var rows []models.Appointment
	if err := r.DB.WithContext(ctx).Preload("Patient").Preload("Clinician.User").Preload("Department").
		Where("patient_id = ? AND tenant_id = ?", p.ID, p.TenantID).
		Order("date DESC, start_time DESC").Limit(200).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Appointment, len(rows))
	for i, a := range rows {
		out[i] = appointmentToModel(a)
	}
	return out, nil
}

func (r *queryResolver) MyPatientVisits(ctx context.Context) ([]*model.Encounter, error) {
	p, err := r.patientForCaller(ctx)
	if err != nil {
		return nil, err
	}
	var rows []models.Encounter
	if err := r.DB.WithContext(ctx).Preload("Patient").Preload("Clinician.User").
		Where("patient_id = ? AND tenant_id = ?", p.ID, p.TenantID).
		Order("visit_date DESC").Limit(200).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Encounter, len(rows))
	for i, e := range rows {
		out[i] = encounterToModel(e)
	}
	return out, nil
}

func (r *queryResolver) MyPatientLabOrders(ctx context.Context) ([]*model.LabOrder, error) {
	p, err := r.patientForCaller(ctx)
	if err != nil {
		return nil, err
	}
	var rows []models.LabOrder
	if err := labOrderQuery(r.DB.WithContext(ctx)).
		Where("patient_id = ? AND tenant_id = ?", p.ID, p.TenantID).
		Order("order_date DESC").Limit(200).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.LabOrder, len(rows))
	for i, o := range rows {
		out[i] = labOrderToModel(o)
	}
	return out, nil
}

func (r *queryResolver) MyPatientRadiologyOrders(ctx context.Context) ([]*model.RadiologyOrder, error) {
	p, err := r.patientForCaller(ctx)
	if err != nil {
		return nil, err
	}
	var rows []models.RadiologyOrder
	if err := r.DB.WithContext(ctx).Preload("Patient").Preload("OrderedBy.User").Preload("ReportedBy.User").
		Where("patient_id = ? AND tenant_id = ?", p.ID, p.TenantID).
		Order("order_date DESC").Limit(200).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.RadiologyOrder, len(rows))
	for i, o := range rows {
		out[i] = radiologyOrderToModel(o)
	}
	return out, nil
}

func (r *queryResolver) MyPatientReferrals(ctx context.Context) ([]*model.Referral, error) {
	p, err := r.patientForCaller(ctx)
	if err != nil {
		return nil, err
	}
	var rows []models.Referral
	if err := r.DB.WithContext(ctx).Preload("Patient").Preload("FromClinician.User").
		Where("patient_id = ? AND tenant_id = ?", p.ID, p.TenantID).
		Order("created_at DESC").Limit(200).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Referral, len(rows))
	for i, ref := range rows {
		out[i] = referralToModel(ref)
	}
	return out, nil
}

func (r *queryResolver) MyPatientTeleConsults(ctx context.Context) ([]*model.TeleConsult, error) {
	p, err := r.patientForCaller(ctx)
	if err != nil {
		return nil, err
	}
	var rows []models.TeleConsult
	if err := r.DB.WithContext(ctx).Preload("Patient").Preload("Clinician.User").
		Where("patient_id = ? AND tenant_id = ?", p.ID, p.TenantID).
		Order("scheduled_at DESC").Limit(200).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.TeleConsult, len(rows))
	for i, t := range rows {
		out[i] = teleConsultToModel(t)
	}
	return out, nil
}
