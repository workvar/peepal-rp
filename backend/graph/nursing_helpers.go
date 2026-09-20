package graph

// Converters for the nursing resolvers (vitals + MAR).

import (
	"collegeerp/graph/model"
	"collegeerp/models"
)

func vitalsToModel(v models.VitalsRecord) *model.VitalsRecord {
	m := &model.VitalsRecord{
		ID:           v.ID,
		AdmissionID:  v.AdmissionID,
		PatientID:    v.PatientID,
		RecordedByID: toStrPtr(v.RecordedByID),
		RecordedAt:   v.RecordedAt.Format("2006-01-02T15:04:05Z07:00"),
		TempC:        v.TempC,
		Pulse:        v.Pulse,
		RespRate:     v.RespRate,
		BpSystolic:   v.BpSystolic,
		BpDiastolic:  v.BpDiastolic,
		Spo2:         v.Spo2,
		PainScore:    v.PainScore,
		Notes:        toStrPtr(v.Notes),
	}
	if v.RecordedByID != "" {
		m.RecordedByName = toStrPtr(employeeName(v.RecordedBy))
	}
	return m
}

func medAdminToModel(a models.MedicationAdministration) *model.MedicationAdministration {
	m := &model.MedicationAdministration{
		ID:               a.ID,
		AdministeredByID: toStrPtr(a.AdministeredByID),
		AdministeredAt:   a.AdministeredAt.Format("2006-01-02T15:04:05Z07:00"),
		Status:           a.Status,
		Notes:            toStrPtr(a.Notes),
	}
	if a.AdministeredByID != "" {
		m.AdministeredByName = toStrPtr(employeeName(a.AdministeredBy))
	}
	return m
}

func medOrderToModel(o models.MedicationOrder) *model.MedicationOrder {
	admins := make([]*model.MedicationAdministration, len(o.Administrations))
	for i, a := range o.Administrations {
		admins[i] = medAdminToModel(a)
	}
	m := &model.MedicationOrder{
		ID:              o.ID,
		AdmissionID:     o.AdmissionID,
		PatientID:       o.PatientID,
		DrugID:          toStrPtr(o.DrugID),
		DrugName:        o.DrugName,
		Dose:            toStrPtr(o.Dose),
		Route:           toStrPtr(o.Route),
		Frequency:       toStrPtr(o.Frequency),
		OrderedByID:     toStrPtr(o.OrderedByID),
		StartDate:       toStrPtr(o.StartDate),
		EndDate:         toStrPtr(o.EndDate),
		Status:          o.Status,
		Notes:           toStrPtr(o.Notes),
		Administrations: admins,
		CreatedAt:       rfc3339OrNil(o.CreatedAt),
	}
	if o.OrderedByID != "" {
		m.OrderedByName = toStrPtr(employeeName(o.OrderedBy))
	}
	return m
}

// loadAdmissionForNursing fetches an admission scoped to the tenant, returning
// its patient id. Used to derive patient_id and validate ownership.
func (r *Resolver) loadAdmissionPatient(tenantID, admissionID string) (string, bool) {
	var a models.Admission
	if err := r.DB.Where("id = ? AND tenant_id = ?", admissionID, tenantID).First(&a).Error; err != nil {
		return "", false
	}
	return a.PatientID, true
}
