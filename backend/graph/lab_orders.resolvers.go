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

// Lab order + result resolvers. Orders are placed against a patient (usually
// from an encounter); results are entered per line and auto-flagged.

func labOrderQuery(db *gorm.DB) *gorm.DB {
	return db.Preload("Patient").Preload("OrderedBy.User").
		Preload("Items", func(d *gorm.DB) *gorm.DB { return d.Order("created_at ASC") })
}

func (r *queryResolver) LabOrders(ctx context.Context, patientID *string, encounterID *string, status *string, date *string) ([]*model.LabOrder, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := labOrderQuery(r.DB.WithContext(ctx)).Where("tenant_id = ?", auth.TenantID)
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
	var rows []models.LabOrder
	if err := q.Order("order_date DESC, created_at DESC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.LabOrder, len(rows))
	for i, o := range rows {
		out[i] = labOrderToModel(o)
	}
	return out, nil
}

func (r *queryResolver) LabOrder(ctx context.Context, id string) (*model.LabOrder, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var o models.LabOrder
	if err := labOrderQuery(r.DB.WithContext(ctx)).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&o).Error; err != nil {
		return nil, ErrNotFound
	}
	return labOrderToModel(o), nil
}

func (r *mutationResolver) CreateLabOrder(ctx context.Context, input model.CreateLabOrderInput) (*model.LabOrder, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	if !patientExists(r.DB, ctx, auth.TenantID, input.PatientID) {
		return nil, GQLErr("patient not found")
	}
	if len(input.Tests) == 0 {
		return nil, GQLErr("select at least one test")
	}
	orderedBy := strVal(input.OrderedByID)
	if orderedBy != "" && !employeeExists(r.DB, ctx, auth.TenantID, orderedBy) {
		return nil, GQLErr("ordering clinician not found")
	}
	orderDate := strVal(input.OrderDate)
	if orderDate == "" {
		orderDate = time.Now().Format("2006-01-02")
	}

	order := models.LabOrder{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		PatientID: input.PatientID, EncounterID: strVal(input.EncounterID),
		OrderedByID: orderedBy, OrderDate: orderDate,
		Status: models.LabOrderOrdered, Notes: strVal(input.Notes),
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&order).Error; err != nil {
			return err
		}
		for _, ti := range input.Tests {
			var t models.LabTest
			if err := tx.Where("id = ? AND tenant_id = ?", ti.TestID, auth.TenantID).First(&t).Error; err != nil {
				return GQLErr("test not found: " + ti.TestID)
			}
			item := models.LabOrderItem{
				ID: uuid.NewString(), TenantID: auth.TenantID, OrderID: order.ID,
				TestID: t.ID, TestCode: t.Code, TestName: t.Name, Unit: t.Unit,
				RefLow: t.RefLow, RefHigh: t.RefHigh, RefText: t.RefText, Price: t.Price,
			}
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return (&queryResolver{r.Resolver}).LabOrder(ctx, order.ID)
}

// EnterLabResults writes per-line results, auto-flags each, and advances the
// order to resulted once every line has a value.
func (r *mutationResolver) EnterLabResults(ctx context.Context, orderID string, results []*model.LabResultInput) (*model.LabOrder, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	var order models.LabOrder
	if err := r.DB.WithContext(ctx).Preload("Items").
		Where("id = ? AND tenant_id = ?", orderID, auth.TenantID).First(&order).Error; err != nil {
		return nil, ErrNotFound
	}
	if order.Status == models.LabOrderCancelled {
		return nil, GQLErr("cannot result a cancelled order")
	}
	now := time.Now()
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, res := range results {
			var item *models.LabOrderItem
			for i := range order.Items {
				if order.Items[i].ID == res.ItemID {
					item = &order.Items[i]
					break
				}
			}
			if item == nil {
				return GQLErr("result line not on this order: " + res.ItemID)
			}
			flag := computeLabFlag(res.ResultValue, item.RefLow, item.RefHigh)
			if err := tx.Model(&models.LabOrderItem{}).Where("id = ?", item.ID).
				Updates(map[string]interface{}{
					"result_value": strings.TrimSpace(res.ResultValue),
					"flag":         flag,
					"resulted_at":  now,
				}).Error; err != nil {
				return err
			}
			item.ResultValue = res.ResultValue
		}
		// Advance status: resulted if all lines now have a value, else collected.
		allResulted := true
		for _, it := range order.Items {
			if strings.TrimSpace(it.ResultValue) == "" {
				allResulted = false
				break
			}
		}
		status := models.LabOrderCollected
		if allResulted {
			status = models.LabOrderResulted
		}
		return tx.Model(&models.LabOrder{}).Where("id = ?", order.ID).
			Update("status", status).Error
	})
	if err != nil {
		return nil, err
	}
	return (&queryResolver{r.Resolver}).LabOrder(ctx, order.ID)
}

func (r *mutationResolver) CancelLabOrder(ctx context.Context, id string) (*model.LabOrder, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	res := r.DB.WithContext(ctx).Model(&models.LabOrder{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Update("status", models.LabOrderCancelled)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return (&queryResolver{r.Resolver}).LabOrder(ctx, id)
}
