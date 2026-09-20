package graph

// Shared converters and query builders for the clinical resolvers
// (patients / appointments / encounters).

import (
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// setStr adds a trimmed string field to a partial-update map when the input
// pointer is non-nil.
func setStr(updates map[string]interface{}, column string, v *string) {
	if v != nil {
		updates[column] = strings.TrimSpace(*v)
	}
}

// patientFilterQuery builds the shared WHERE clause for Patients/PatientsCount.
func patientFilterQuery(db *gorm.DB, tenantID string, search *string, status *string) *gorm.DB {
	q := db.Where("tenant_id = ?", tenantID)
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	if search != nil && strings.TrimSpace(*search) != "" {
		like := "%" + strings.ToLower(strings.TrimSpace(*search)) + "%"
		q = q.Where(
			"(LOWER(first_name || ' ' || last_name) LIKE ? OR LOWER(mrn) LIKE ? OR phone LIKE ?)",
			like, like, like,
		)
	}
	return q
}

// patientDisplayName renders "First Last" without a trailing space when the
// last name is blank.
func patientDisplayName(p models.Patient) string {
	return strings.TrimSpace(p.FirstName + " " + p.LastName)
}

func rfc3339OrNil(t time.Time) *string {
	if t.IsZero() {
		return nil
	}
	s := t.Format(time.RFC3339)
	return &s
}

func patientToModel(p models.Patient) *model.Patient {
	return &model.Patient{
		ID:                p.ID,
		Mrn:               p.MRN,
		Uhid:              toStrPtr(p.UHID),
		FirstName:         p.FirstName,
		LastName:          toStrPtr(p.LastName),
		Gender:            toStrPtr(p.Gender),
		DateOfBirth:       toStrPtr(p.DateOfBirth),
		BloodGroup:        toStrPtr(p.BloodGroup),
		Phone:             toStrPtr(p.Phone),
		Email:             toStrPtr(p.Email),
		Address:           toStrPtr(p.Address),
		City:              toStrPtr(p.City),
		State:             toStrPtr(p.State),
		Pincode:           toStrPtr(p.Pincode),
		EmergencyName:     toStrPtr(p.EmergencyName),
		EmergencyPhone:    toStrPtr(p.EmergencyPhone),
		Allergies:         toStrPtr(p.Allergies),
		ChronicConditions: toStrPtr(p.ChronicConditions),
		Status:            p.Status,
		RegisteredAt:      rfc3339OrNil(p.RegisteredAt),
		CreatedAt:         rfc3339OrNil(p.CreatedAt),
	}
}

func appointmentToModel(a models.Appointment) *model.Appointment {
	m := &model.Appointment{
		ID:            a.ID,
		PatientID:     a.PatientID,
		PatientName:   patientDisplayName(a.Patient),
		PatientMrn:    a.Patient.MRN,
		ClinicianID:   a.ClinicianID,
		ClinicianName: a.Clinician.User.Name,
		Date:          a.Date,
		StartTime:     a.StartTime,
		EndTime:       toStrPtr(a.EndTime),
		Reason:        toStrPtr(a.Reason),
		Notes:         toStrPtr(a.Notes),
		ReferredBy:    toStrPtr(a.ReferredBy),
		Status:        a.Status,
		CreatedAt:     rfc3339OrNil(a.CreatedAt),
	}
	m.DepartmentID = toStrPtr(a.DepartmentID)
	if a.Department.ID != "" {
		m.DepartmentName = toStrPtr(a.Department.Name)
	}
	return m
}

func encounterToModel(e models.Encounter) *model.Encounter {
	return &model.Encounter{
		ID:               e.ID,
		PatientID:        e.PatientID,
		PatientName:      patientDisplayName(e.Patient),
		PatientMrn:       e.Patient.MRN,
		PatientAllergies: toStrPtr(e.Patient.Allergies),
		ClinicianID:      e.ClinicianID,
		ClinicianName:    e.Clinician.User.Name,
		AppointmentID:    toStrPtr(e.AppointmentID),
		CrNumber:         toStrPtr(e.CRNumber),
		VisitType:        e.VisitType,
		VisitDate:        e.VisitDate,
		ChiefComplaint:   toStrPtr(e.ChiefComplaint),
		Diagnosis:        toStrPtr(e.Diagnosis),
		Vitals:           toStrPtr(e.Vitals),
		Prescription:     toStrPtr(e.Prescription),
		Notes:            toStrPtr(e.Notes),
		FollowUpDate:     toStrPtr(e.FollowUpDate),
		Status:           e.Status,
		CreatedAt:        rfc3339OrNil(e.CreatedAt),
	}
}
