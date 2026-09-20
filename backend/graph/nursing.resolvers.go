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

// Resolvers for the Nursing station — vitals charting + medication
// administration record (MAR) for admitted patients.

var medRoutes = map[string]bool{
	"oral": true, "iv": true, "im": true, "sc": true, "topical": true,
	"inhaled": true, "other": true,
}
var medAdminStatuses = map[string]bool{
	models.MedGiven: true, models.MedHeld: true, models.MedRefused: true,
}

// ── Vitals ───────────────────────────────────────────────────────────────────

func (r *queryResolver) VitalsRecords(ctx context.Context, admissionID string) ([]*model.VitalsRecord, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var rows []models.VitalsRecord
	if err := r.DB.WithContext(ctx).Preload("RecordedBy.User").
		Where("admission_id = ? AND tenant_id = ?", admissionID, auth.TenantID).
		Order("recorded_at DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.VitalsRecord, len(rows))
	for i, v := range rows {
		out[i] = vitalsToModel(v)
	}
	return out, nil
}

func (r *mutationResolver) RecordVitals(ctx context.Context, input model.RecordVitalsInput) (*model.VitalsRecord, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	patientID, ok := r.loadAdmissionPatient(auth.TenantID, input.AdmissionID)
	if !ok {
		return nil, GQLErr("admission not found")
	}
	recordedBy := strVal(input.RecordedByID)
	if recordedBy != "" && !employeeExists(r.DB, ctx, auth.TenantID, recordedBy) {
		return nil, GQLErr("recording staff not found")
	}
	v := models.VitalsRecord{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		AdmissionID: input.AdmissionID, PatientID: patientID,
		RecordedByID: recordedBy,
		TempC:        floatVal(input.TempC),
		Pulse:        intVal(input.Pulse),
		RespRate:     intVal(input.RespRate),
		BpSystolic:   intVal(input.BpSystolic),
		BpDiastolic:  intVal(input.BpDiastolic),
		Spo2:         intVal(input.Spo2),
		PainScore:    intVal(input.PainScore),
		Notes:        strVal(input.Notes),
	}
	if input.RecordedAt != nil && *input.RecordedAt != "" {
		if t, perr := time.Parse(time.RFC3339, *input.RecordedAt); perr == nil {
			v.RecordedAt = t
		}
	}
	if err := r.DB.WithContext(ctx).Create(&v).Error; err != nil {
		return nil, err
	}
	if recordedBy != "" {
		r.DB.WithContext(ctx).Preload("RecordedBy.User").First(&v, "id = ?", v.ID)
	}
	return vitalsToModel(v), nil
}

// ── Medication orders (MAR) ──────────────────────────────────────────────────

func medOrderQuery(db *gorm.DB) *gorm.DB {
	return db.Preload("OrderedBy.User").
		Preload("Administrations", func(d *gorm.DB) *gorm.DB { return d.Order("administered_at DESC") }).
		Preload("Administrations.AdministeredBy.User")
}

func (r *queryResolver) MedicationOrders(ctx context.Context, admissionID string, includeDiscontinued *bool) ([]*model.MedicationOrder, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := medOrderQuery(r.DB.WithContext(ctx)).
		Where("admission_id = ? AND tenant_id = ?", admissionID, auth.TenantID)
	if includeDiscontinued == nil || !*includeDiscontinued {
		q = q.Where("status = ?", models.MedOrderActive)
	}
	var rows []models.MedicationOrder
	if err := q.Order("created_at DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.MedicationOrder, len(rows))
	for i, o := range rows {
		out[i] = medOrderToModel(o)
	}
	return out, nil
}

func (r *mutationResolver) CreateMedicationOrder(ctx context.Context, input model.CreateMedicationOrderInput) (*model.MedicationOrder, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	patientID, ok := r.loadAdmissionPatient(auth.TenantID, input.AdmissionID)
	if !ok {
		return nil, GQLErr("admission not found")
	}
	name := strings.TrimSpace(input.DrugName)
	if name == "" {
		return nil, GQLErr("drug name is required")
	}
	if input.Route != nil && *input.Route != "" && !medRoutes[*input.Route] {
		return nil, GQLErr("invalid route")
	}
	orderedBy := strVal(input.OrderedByID)
	if orderedBy != "" && !employeeExists(r.DB, ctx, auth.TenantID, orderedBy) {
		return nil, GQLErr("ordering clinician not found")
	}
	o := models.MedicationOrder{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		AdmissionID: input.AdmissionID, PatientID: patientID,
		DrugID: strVal(input.DrugID), DrugName: name,
		Dose: strVal(input.Dose), Route: strVal(input.Route), Frequency: strVal(input.Frequency),
		OrderedByID: orderedBy, StartDate: strVal(input.StartDate), EndDate: strVal(input.EndDate),
		Status: models.MedOrderActive, Notes: strVal(input.Notes),
	}
	if err := r.DB.WithContext(ctx).Create(&o).Error; err != nil {
		return nil, err
	}
	return r.reloadMedOrder(ctx, auth.TenantID, o.ID)
}

func (r *mutationResolver) DiscontinueMedicationOrder(ctx context.Context, id string) (*model.MedicationOrder, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	res := r.DB.WithContext(ctx).Model(&models.MedicationOrder{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Update("status", models.MedOrderDiscontinued)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return r.reloadMedOrder(ctx, auth.TenantID, id)
}

func (r *mutationResolver) RecordMedicationAdministration(ctx context.Context, input model.RecordAdministrationInput) (*model.MedicationOrder, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	var order models.MedicationOrder
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", input.MedicationOrderID, auth.TenantID).First(&order).Error; err != nil {
		return nil, ErrNotFound
	}
	if order.Status != models.MedOrderActive {
		return nil, GQLErr("medication order is discontinued")
	}
	status := models.MedGiven
	if input.Status != nil && *input.Status != "" {
		if !medAdminStatuses[*input.Status] {
			return nil, GQLErr("status must be given, held, or refused")
		}
		status = *input.Status
	}
	by := strVal(input.AdministeredByID)
	if by != "" && !employeeExists(r.DB, ctx, auth.TenantID, by) {
		return nil, GQLErr("administering staff not found")
	}
	a := models.MedicationAdministration{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		MedicationOrderID: order.ID, AdministeredByID: by,
		Status: status, Notes: strVal(input.Notes),
	}
	if input.AdministeredAt != nil && *input.AdministeredAt != "" {
		if t, perr := time.Parse(time.RFC3339, *input.AdministeredAt); perr == nil {
			a.AdministeredAt = t
		}
	}
	if err := r.DB.WithContext(ctx).Create(&a).Error; err != nil {
		return nil, err
	}
	return r.reloadMedOrder(ctx, auth.TenantID, order.ID)
}

func (r *mutationResolver) reloadMedOrder(ctx context.Context, tenantID, id string) (*model.MedicationOrder, error) {
	var o models.MedicationOrder
	if err := medOrderQuery(r.DB.WithContext(ctx)).
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&o).Error; err != nil {
		return nil, err
	}
	return medOrderToModel(o), nil
}
