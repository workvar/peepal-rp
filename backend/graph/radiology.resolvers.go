package graph

import (
	"context"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

// Resolvers for the Radiology module — healthcare industry, Phase 3.
// Study catalog + imaging orders that a radiologist later reports on.

var radModalities = map[string]bool{
	"xray": true, "ct": true, "mri": true, "ultrasound": true,
	"mammography": true, "other": true,
}

// ── Study catalog ────────────────────────────────────────────────────────────

func (r *queryResolver) RadiologyStudies(ctx context.Context, search *string, includeInactive *bool) ([]*model.RadiologyStudy, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID)
	if includeInactive == nil || !*includeInactive {
		q = q.Where("active = ?", true)
	}
	if search != nil && strings.TrimSpace(*search) != "" {
		like := "%" + strings.ToLower(strings.TrimSpace(*search)) + "%"
		q = q.Where("(LOWER(name) LIKE ? OR LOWER(code) LIKE ?)", like, like)
	}
	var rows []models.RadiologyStudy
	if err := q.Order("name ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.RadiologyStudy, len(rows))
	for i, s := range rows {
		out[i] = radiologyStudyToModel(s)
	}
	return out, nil
}

func (r *mutationResolver) CreateRadiologyStudy(ctx context.Context, input model.CreateRadiologyStudyInput) (*model.RadiologyStudy, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	code := strings.TrimSpace(input.Code)
	name := strings.TrimSpace(input.Name)
	if code == "" || name == "" {
		return nil, GQLErr("study code and name are required")
	}
	modality := "xray"
	if input.Modality != nil && *input.Modality != "" {
		if !radModalities[*input.Modality] {
			return nil, GQLErr("modality must be xray, ct, mri, ultrasound, mammography, or other")
		}
		modality = *input.Modality
	}
	s := models.RadiologyStudy{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		Code: code, Name: name, Modality: modality,
		BodyPart: strVal(input.BodyPart), Price: floatVal(input.Price), Active: true,
	}
	if err := r.DB.WithContext(ctx).Create(&s).Error; err != nil {
		return nil, uniqueErr(err, "a study with this code already exists")
	}
	return radiologyStudyToModel(s), nil
}

func (r *mutationResolver) UpdateRadiologyStudy(ctx context.Context, id string, input model.UpdateRadiologyStudyInput) (*model.RadiologyStudy, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	setStr(updates, "code", input.Code)
	setStr(updates, "name", input.Name)
	setStr(updates, "body_part", input.BodyPart)
	if input.Modality != nil {
		if !radModalities[*input.Modality] {
			return nil, GQLErr("modality must be xray, ct, mri, ultrasound, mammography, or other")
		}
		updates["modality"] = *input.Modality
	}
	if input.Price != nil {
		updates["price"] = *input.Price
	}
	if input.Active != nil {
		updates["active"] = *input.Active
	}
	res := r.DB.WithContext(ctx).Model(&models.RadiologyStudy{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates)
	if res.Error != nil {
		return nil, uniqueErr(res.Error, "a study with this code already exists")
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	var s models.RadiologyStudy
	if err := r.DB.WithContext(ctx).Where("id = ?", id).First(&s).Error; err != nil {
		return nil, err
	}
	return radiologyStudyToModel(s), nil
}

func (r *mutationResolver) DeleteRadiologyStudy(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.RadiologyStudy{})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

// ── Orders + reports ─────────────────────────────────────────────────────────

func (r *queryResolver) RadiologyOrders(ctx context.Context, patientID *string, encounterID *string, status *string, date *string) ([]*model.RadiologyOrder, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).
		Preload("Patient").Preload("OrderedBy.User").Preload("ReportedBy.User").
		Where("tenant_id = ?", auth.TenantID)
	if patientID != nil && *patientID != "" {
		q = q.Where("patient_id = ?", *patientID)
	}
	if encounterID != nil && *encounterID != "" {
		q = q.Where("encounter_id = ?", *encounterID)
	}
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	if date != nil && *date != "" {
		q = q.Where("order_date = ?", *date)
	}
	var rows []models.RadiologyOrder
	if err := q.Order("order_date DESC, created_at DESC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.RadiologyOrder, len(rows))
	for i, o := range rows {
		out[i] = radiologyOrderToModel(o)
	}
	return out, nil
}

func (r *queryResolver) RadiologyOrder(ctx context.Context, id string) (*model.RadiologyOrder, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var o models.RadiologyOrder
	if err := r.DB.WithContext(ctx).
		Preload("Patient").Preload("OrderedBy.User").Preload("ReportedBy.User").
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&o).Error; err != nil {
		return nil, ErrNotFound
	}
	return radiologyOrderToModel(o), nil
}

func (r *mutationResolver) CreateRadiologyOrder(ctx context.Context, input model.CreateRadiologyOrderInput) (*model.RadiologyOrder, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	if !patientExists(r.DB, ctx, auth.TenantID, input.PatientID) {
		return nil, GQLErr("patient not found")
	}
	var study models.RadiologyStudy
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", input.StudyID, auth.TenantID).First(&study).Error; err != nil {
		return nil, GQLErr("study not found")
	}
	orderedBy := strVal(input.OrderedByID)
	if orderedBy != "" && !employeeExists(r.DB, ctx, auth.TenantID, orderedBy) {
		return nil, GQLErr("ordering clinician not found")
	}
	orderDate := strVal(input.OrderDate)
	if orderDate == "" {
		orderDate = time.Now().Format("2006-01-02")
	}
	o := models.RadiologyOrder{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		PatientID: input.PatientID, EncounterID: strVal(input.EncounterID),
		OrderedByID: orderedBy,
		StudyID:     study.ID, StudyCode: study.Code, StudyName: study.Name,
		Modality: study.Modality, BodyPart: study.BodyPart, Price: study.Price,
		OrderDate: orderDate, Status: models.RadOrderOrdered, Notes: strVal(input.Notes),
	}
	if err := r.DB.WithContext(ctx).Create(&o).Error; err != nil {
		return nil, err
	}
	return (&queryResolver{r.Resolver}).RadiologyOrder(ctx, o.ID)
}

func (r *mutationResolver) SetRadiologyOrderStatus(ctx context.Context, id string, status string) (*model.RadiologyOrder, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	allowed := map[string]bool{
		models.RadOrderScheduled: true, models.RadOrderCompleted: true, models.RadOrderCancelled: true,
	}
	if !allowed[status] {
		return nil, GQLErr("status must be scheduled, completed, or cancelled")
	}
	res := r.DB.WithContext(ctx).Model(&models.RadiologyOrder{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Update("status", status)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return (&queryResolver{r.Resolver}).RadiologyOrder(ctx, id)
}

func (r *mutationResolver) ReportRadiologyOrder(ctx context.Context, id string, input model.RadiologyReportInput) (*model.RadiologyOrder, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(input.Findings) == "" || strings.TrimSpace(input.Impression) == "" {
		return nil, GQLErr("findings and impression are required")
	}
	reportedBy := strVal(input.ReportedByID)
	if reportedBy != "" && !employeeExists(r.DB, ctx, auth.TenantID, reportedBy) {
		return nil, GQLErr("reporting radiologist not found")
	}
	now := time.Now()
	res := r.DB.WithContext(ctx).Model(&models.RadiologyOrder{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Updates(map[string]interface{}{
			"findings":       strings.TrimSpace(input.Findings),
			"impression":     strings.TrimSpace(input.Impression),
			"reported_by_id": reportedBy,
			"reported_at":    now,
			"status":         models.RadOrderReported,
		})
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return (&queryResolver{r.Resolver}).RadiologyOrder(ctx, id)
}
