package graph

import (
	"context"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Admission (ADT) resolvers — healthcare industry, Phase 3. Admit places a
// patient on a bed, transfer moves them, discharge frees the bed and captures
// the discharge summary.

func admissionQuery(db *gorm.DB) *gorm.DB {
	return db.Preload("Patient").Preload("Clinician.User").
		Preload("Ward").Preload("Bed").
		Preload("Transfers", func(d *gorm.DB) *gorm.DB { return d.Order("created_at ASC") })
}

// bedNameLookup returns a resolver that maps a bedID → (bedNumber, wardName),
// used to label transfer rows.
func (r *Resolver) bedNameLookup(ctx context.Context, tenantID string) func(string) (string, string) {
	var beds []models.Bed
	r.DB.WithContext(ctx).Preload("Ward").Where("tenant_id = ?", tenantID).Find(&beds)
	idx := make(map[string]models.Bed, len(beds))
	for _, b := range beds {
		idx[b.ID] = b
	}
	return func(id string) (string, string) {
		b, ok := idx[id]
		if !ok {
			return "", ""
		}
		return b.BedNumber, b.Ward.Name
	}
}

func (r *queryResolver) Admissions(ctx context.Context, patientID *string, wardID *string, status *string) ([]*model.Admission, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := admissionQuery(r.DB.WithContext(ctx)).Where("tenant_id = ?", auth.TenantID)
	if patientID != nil && *patientID != "" {
		q = q.Where("patient_id = ?", *patientID)
	}
	if wardID != nil && *wardID != "" {
		q = q.Where("ward_id = ?", *wardID)
	}
	// Default to currently-admitted unless a status is given.
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	} else {
		q = q.Where("status = ?", models.AdmissionAdmitted)
	}
	var rows []models.Admission
	if err := q.Order("admission_date DESC, created_at DESC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	lookup := r.bedNameLookup(ctx, auth.TenantID)
	out := make([]*model.Admission, len(rows))
	for i, a := range rows {
		out[i] = admissionToModel(a, lookup)
	}
	return out, nil
}

func (r *queryResolver) Admission(ctx context.Context, id string) (*model.Admission, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var a models.Admission
	if err := admissionQuery(r.DB.WithContext(ctx)).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&a).Error; err != nil {
		return nil, ErrNotFound
	}
	lookup := r.bedNameLookup(ctx, auth.TenantID)
	return admissionToModel(a, lookup), nil
}

// CreateAdmission admits a patient to a bed, marking the bed occupied and,
// optionally, opening a linked IPD encounter.
func (r *mutationResolver) CreateAdmission(ctx context.Context, input model.CreateAdmissionInput) (*model.Admission, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	var patient models.Patient
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", input.PatientID, auth.TenantID).First(&patient).Error; err != nil {
		return nil, GQLErr("patient not found")
	}
	clinician := strVal(input.ClinicianID)
	if clinician != "" && !employeeExists(r.DB, ctx, auth.TenantID, clinician) {
		return nil, GQLErr("admitting clinician not found")
	}

	admissionDate := strVal(input.AdmissionDate)
	if admissionDate == "" {
		admissionDate = time.Now().Format("2006-01-02")
	}

	admission := models.Admission{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		PatientID: patient.ID, ClinicianID: clinician,
		WardID: input.WardID, BedID: input.BedID,
		AdmissionDate: admissionDate, Reason: strVal(input.Reason),
		Status: models.AdmissionAdmitted,
	}

	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Bed must belong to the ward, the tenant, and be free.
		var bed models.Bed
		if err := tx.Where("id = ? AND tenant_id = ? AND ward_id = ?", input.BedID, auth.TenantID, input.WardID).
			First(&bed).Error; err != nil {
			return GQLErr("bed not found in the selected ward")
		}
		if bed.Status != models.BedAvailable {
			return GQLErr("bed is not available")
		}
		var busy int64
		if err := tx.Model(&models.Admission{}).
			Where("bed_id = ? AND status = ?", input.BedID, models.AdmissionAdmitted).
			Count(&busy).Error; err != nil {
			return err
		}
		if busy > 0 {
			return GQLErr("bed is already occupied")
		}
		// A patient can only hold one active admission at a time.
		var already int64
		if err := tx.Model(&models.Admission{}).
			Where("patient_id = ? AND tenant_id = ? AND status = ?", patient.ID, auth.TenantID, models.AdmissionAdmitted).
			Count(&already).Error; err != nil {
			return err
		}
		if already > 0 {
			return GQLErr("patient is already admitted")
		}
		// Enforce the ward gender policy.
		var ward models.Ward
		if err := tx.Where("id = ? AND tenant_id = ?", input.WardID, auth.TenantID).First(&ward).Error; err != nil {
			return GQLErr("ward not found")
		}
		if ward.Gender != models.WardGenderAny && patient.Gender != "" &&
			!strings.EqualFold(patient.Gender, ward.Gender) {
			return GQLErr("ward is restricted to " + ward.Gender + " patients")
		}

		if input.OpenEncounter != nil && *input.OpenEncounter {
			clin := clinician
			if clin == "" {
				return GQLErr("select an admitting clinician to open an encounter")
			}
			enc := models.Encounter{
				ID: uuid.NewString(), TenantID: auth.TenantID,
				PatientID: patient.ID, ClinicianID: clin,
				VisitType: models.VisitIPD, VisitDate: admissionDate,
				ChiefComplaint: admission.Reason, Status: models.EncounterOpen,
			}
			if err := tx.Create(&enc).Error; err != nil {
				return err
			}
			admission.EncounterID = enc.ID
		}

		if err := tx.Create(&admission).Error; err != nil {
			return err
		}
		return tx.Model(&models.Bed{}).Where("id = ?", input.BedID).
			Update("status", models.BedOccupied).Error
	})
	if err != nil {
		return nil, err
	}
	return (&queryResolver{r.Resolver}).Admission(ctx, admission.ID)
}

// TransferAdmission moves an admitted patient to a new bed, logging a transfer.
func (r *mutationResolver) TransferAdmission(ctx context.Context, input model.TransferAdmissionInput) (*model.Admission, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	transferDate := strVal(input.TransferDate)
	if transferDate == "" {
		transferDate = time.Now().Format("2006-01-02")
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var a models.Admission
		if err := tx.Where("id = ? AND tenant_id = ?", input.AdmissionID, auth.TenantID).First(&a).Error; err != nil {
			return ErrNotFound
		}
		if a.Status != models.AdmissionAdmitted {
			return GQLErr("only admitted patients can be transferred")
		}
		if input.ToBedID == a.BedID {
			return GQLErr("patient is already on that bed")
		}
		var toBed models.Bed
		if err := tx.Where("id = ? AND tenant_id = ?", input.ToBedID, auth.TenantID).First(&toBed).Error; err != nil {
			return GQLErr("destination bed not found")
		}
		if toBed.Status != models.BedAvailable {
			return GQLErr("destination bed is not available")
		}
		transfer := models.BedTransfer{
			ID: uuid.NewString(), TenantID: auth.TenantID, AdmissionID: a.ID,
			FromBedID: a.BedID, ToBedID: toBed.ID,
			FromWardID: a.WardID, ToWardID: toBed.WardID,
			TransferDate: transferDate, Reason: strVal(input.Reason),
		}
		if err := tx.Create(&transfer).Error; err != nil {
			return err
		}
		// Free the old bed, occupy the new, move the admission.
		if a.BedID != "" {
			if err := tx.Model(&models.Bed{}).Where("id = ?", a.BedID).
				Update("status", models.BedAvailable).Error; err != nil {
				return err
			}
		}
		if err := tx.Model(&models.Bed{}).Where("id = ?", toBed.ID).
			Update("status", models.BedOccupied).Error; err != nil {
			return err
		}
		return tx.Model(&models.Admission{}).Where("id = ?", a.ID).
			Updates(map[string]interface{}{"bed_id": toBed.ID, "ward_id": toBed.WardID}).Error
	})
	if err != nil {
		return nil, err
	}
	return (&queryResolver{r.Resolver}).Admission(ctx, input.AdmissionID)
}

// DischargeAdmission frees the bed, closes any linked encounter, and records
// the discharge summary.
func (r *mutationResolver) DischargeAdmission(ctx context.Context, input model.DischargeAdmissionInput) (*model.Admission, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	dischargeDate := strVal(input.DischargeDate)
	if dischargeDate == "" {
		dischargeDate = time.Now().Format("2006-01-02")
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var a models.Admission
		if err := tx.Where("id = ? AND tenant_id = ?", input.AdmissionID, auth.TenantID).First(&a).Error; err != nil {
			return ErrNotFound
		}
		if a.Status == models.AdmissionDischarged {
			return GQLErr("patient is already discharged")
		}
		if a.BedID != "" {
			if err := tx.Model(&models.Bed{}).Where("id = ?", a.BedID).
				Update("status", models.BedAvailable).Error; err != nil {
				return err
			}
		}
		if a.EncounterID != "" {
			tx.Model(&models.Encounter{}).Where("id = ?", a.EncounterID).
				Update("status", models.EncounterClosed)
		}
		return tx.Model(&models.Admission{}).Where("id = ?", a.ID).
			Updates(map[string]interface{}{
				"status":                 models.AdmissionDischarged,
				"discharge_date":         dischargeDate,
				"discharge_diagnosis":    strVal(input.DischargeDiagnosis),
				"treatment_given":        strVal(input.TreatmentGiven),
				"condition_on_discharge": strVal(input.ConditionOnDischarge),
				"follow_up_instructions": strVal(input.FollowUpInstructions),
			}).Error
	})
	if err != nil {
		return nil, err
	}
	return (&queryResolver{r.Resolver}).Admission(ctx, input.AdmissionID)
}
