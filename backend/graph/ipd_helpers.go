package graph

// Converters + occupancy helpers for the IPD/ADT resolvers (wards, beds,
// admissions). Bed occupancy is derived from the currently-admitted admission
// that references the bed.

import (
	"context"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// bedOccupancy holds the live occupant of one bed.
type bedOccupancy struct {
	AdmissionID string
	PatientID   string
	PatientName string
}

// occupancyForTenant returns a map of bedID → occupant, built from all
// currently-admitted admissions in the tenant. One query, no N+1.
func occupancyForTenant(db *gorm.DB, ctx context.Context, tenantID string) (map[string]bedOccupancy, error) {
	var rows []models.Admission
	if err := db.WithContext(ctx).Preload("Patient").
		Where("tenant_id = ? AND status = ? AND bed_id <> ''", tenantID, models.AdmissionAdmitted).
		Find(&rows).Error; err != nil {
		return nil, err
	}
	m := make(map[string]bedOccupancy, len(rows))
	for _, a := range rows {
		m[a.BedID] = bedOccupancy{
			AdmissionID: a.ID,
			PatientID:   a.PatientID,
			PatientName: patientDisplayName(a.Patient),
		}
	}
	return m, nil
}

func bedToModel(b models.Bed, occ map[string]bedOccupancy) *model.Bed {
	status := b.Status
	m := &model.Bed{
		ID:          b.ID,
		WardID:      b.WardID,
		BedNumber:   b.BedNumber,
		Bay:         toStrPtr(b.Bay),
		DailyCharge: b.DailyCharge,
	}
	if o, ok := occ[b.ID]; ok {
		status = models.BedOccupied
		m.PatientID = toStrPtr(o.PatientID)
		m.PatientName = toStrPtr(o.PatientName)
		m.AdmissionID = toStrPtr(o.AdmissionID)
	}
	m.Status = status
	return m
}

func wardToModel(w models.Ward, occ map[string]bedOccupancy) *model.Ward {
	beds := make([]*model.Bed, len(w.Beds))
	occupied := 0
	for i, b := range w.Beds {
		beds[i] = bedToModel(b, occ)
		if _, ok := occ[b.ID]; ok {
			occupied++
		}
	}
	return &model.Ward{
		ID:            w.ID,
		Code:          w.Code,
		Name:          w.Name,
		WardType:      w.WardType,
		Gender:        w.Gender,
		Floor:         toStrPtr(w.Floor),
		Active:        w.Active,
		Beds:          beds,
		BedCount:      len(beds),
		OccupiedCount: occupied,
		CreatedAt:     rfc3339OrNil(w.CreatedAt),
	}
}

// bedLabel maps a bedID → (bedNumber, wardName) to label transfer rows.
type bedLabel func(id string) (string, string)

func admissionToModel(a models.Admission, fromName bedLabel) *model.Admission {
	m := &model.Admission{
		ID:                   a.ID,
		PatientID:            a.PatientID,
		PatientName:          patientDisplayName(a.Patient),
		PatientMrn:           a.Patient.MRN,
		EncounterID:          toStrPtr(a.EncounterID),
		ClinicianID:          toStrPtr(a.ClinicianID),
		WardID:               toStrPtr(a.WardID),
		BedID:                toStrPtr(a.BedID),
		AdmissionDate:        a.AdmissionDate,
		Reason:               toStrPtr(a.Reason),
		Status:               a.Status,
		DischargeDate:        toStrPtr(a.DischargeDate),
		DischargeDiagnosis:   toStrPtr(a.DischargeDiagnosis),
		TreatmentGiven:       toStrPtr(a.TreatmentGiven),
		ConditionOnDischarge: toStrPtr(a.ConditionOnDischarge),
		FollowUpInstructions: toStrPtr(a.FollowUpInstructions),
		CreatedAt:            rfc3339OrNil(a.CreatedAt),
	}
	if a.ClinicianID != "" {
		m.ClinicianName = toStrPtr(employeeName(a.Clinician))
	}
	if a.Ward.ID != "" {
		m.WardName = toStrPtr(a.Ward.Name)
	}
	if a.Bed.ID != "" {
		m.BedNumber = toStrPtr(a.Bed.BedNumber)
	}
	transfers := make([]*model.BedTransfer, len(a.Transfers))
	for i, t := range a.Transfers {
		fromBed, fromWard := fromName(t.FromBedID)
		toBed, toWard := fromName(t.ToBedID)
		transfers[i] = &model.BedTransfer{
			ID:            t.ID,
			FromBedID:     toStrPtr(t.FromBedID),
			ToBedID:       toStrPtr(t.ToBedID),
			FromBedNumber: toStrPtr(fromBed),
			ToBedNumber:   toStrPtr(toBed),
			FromWardName:  toStrPtr(fromWard),
			ToWardName:    toStrPtr(toWard),
			TransferDate:  toStrPtr(t.TransferDate),
			Reason:        toStrPtr(t.Reason),
		}
	}
	m.Transfers = transfers
	return m
}
