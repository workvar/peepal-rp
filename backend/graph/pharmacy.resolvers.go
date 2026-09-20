package graph

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Resolvers for the Pharmacy module (healthcare industry): drug catalog with
// live stock, and dispenses that decrement it atomically.

var drugForms = map[string]bool{
	"tablet": true, "capsule": true, "syrup": true, "injection": true,
	"ointment": true, "drops": true, "other": true,
}

// ── Drug catalog ─────────────────────────────────────────────────────────────

func (r *queryResolver) Drugs(ctx context.Context, search *string, includeInactive *bool) ([]*model.Drug, error) {
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
		q = q.Where("(LOWER(name) LIKE ? OR LOWER(generic_name) LIKE ?)", like, like)
	}
	var rows []models.Drug
	if err := q.Order("name ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Drug, len(rows))
	for i, d := range rows {
		out[i] = drugToModel(d)
	}
	return out, nil
}

func (r *mutationResolver) CreateDrug(ctx context.Context, input model.CreateDrugInput) (*model.Drug, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, errors.New("drug name is required")
	}
	form := "tablet"
	if input.Form != nil && *input.Form != "" {
		if !drugForms[*input.Form] {
			return nil, GQLErr("form must be tablet, capsule, syrup, injection, ointment, drops, or other")
		}
		form = *input.Form
	}
	unit := "unit"
	if input.Unit != nil && strings.TrimSpace(*input.Unit) != "" {
		unit = strings.TrimSpace(*input.Unit)
	}
	d := models.Drug{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		Name: name, GenericName: strVal(input.GenericName),
		Form: form, Strength: strVal(input.Strength), Unit: unit,
		UnitPrice: input.UnitPrice, StockQty: floatVal(input.StockQty),
		ReorderLevel: floatVal(input.ReorderLevel), Active: true,
	}
	if d.StockQty < 0 {
		return nil, errors.New("opening stock cannot be negative")
	}
	batchNo := strings.TrimSpace(strVal(input.BatchNo))
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&d).Error; err != nil {
			return GQLErr("could not create drug — the name may already exist")
		}
		// When a batch number is supplied, record the opening stock as an initial
		// DrugBatch so it shows up in expiry tracking and dispenses FEFO. The drug's
		// denormalized StockQty already equals this quantity, so totals stay in sync.
		if batchNo != "" && d.StockQty > 0 {
			batch := models.DrugBatch{
				ID: uuid.NewString(), TenantID: auth.TenantID, DrugID: d.ID,
				BatchNo: batchNo, ExpiryDate: strings.TrimSpace(strVal(input.ExpiryDate)),
				Qty: d.StockQty, UnitCost: input.UnitPrice,
			}
			if err := tx.Create(&batch).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return drugToModel(d), nil
}

func (r *mutationResolver) UpdateDrug(ctx context.Context, id string, input model.UpdateDrugInput) (*model.Drug, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	setStr(updates, "name", input.Name)
	setStr(updates, "generic_name", input.GenericName)
	if input.Form != nil {
		if !drugForms[*input.Form] {
			return nil, GQLErr("form must be tablet, capsule, syrup, injection, ointment, drops, or other")
		}
		updates["form"] = *input.Form
	}
	setStr(updates, "strength", input.Strength)
	setStr(updates, "unit", input.Unit)
	if input.UnitPrice != nil {
		updates["unit_price"] = *input.UnitPrice
	}
	if input.ReorderLevel != nil {
		updates["reorder_level"] = *input.ReorderLevel
	}
	if input.Active != nil {
		updates["active"] = *input.Active
	}
	res := r.DB.WithContext(ctx).Model(&models.Drug{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return loadDrug(r.DB, ctx, auth.TenantID, id)
}

func (r *mutationResolver) DeleteDrug(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Delete(&models.Drug{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// AdjustDrugStock applies a restock (positive) or correction (negative).
func (r *mutationResolver) AdjustDrugStock(ctx context.Context, id string, delta float64) (*model.Drug, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var d models.Drug
		if err := tx.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&d).Error; err != nil {
			return ErrNotFound
		}
		if d.StockQty+delta < 0 {
			return GQLErr(fmt.Sprintf("stock cannot go below zero (current: %g)", d.StockQty))
		}
		return tx.Model(&d).Update("stock_qty", d.StockQty+delta).Error
	})
	if err != nil {
		return nil, err
	}
	return loadDrug(r.DB, ctx, auth.TenantID, id)
}

// ── Dispenses ────────────────────────────────────────────────────────────────

func (r *queryResolver) Dispenses(ctx context.Context, patientID *string, date *string) ([]*model.Dispense, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).
		Preload("Patient").Preload("Items").
		Where("tenant_id = ?", auth.TenantID)
	if patientID != nil && *patientID != "" {
		q = q.Where("patient_id = ?", *patientID)
	}
	if date != nil && *date != "" {
		q = q.Where("date = ?", *date)
	}
	var rows []models.Dispense
	if err := q.Order("created_at DESC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Dispense, len(rows))
	for i, d := range rows {
		out[i] = dispenseToModel(d)
	}
	return out, nil
}

// CreateDispense hands drugs to a patient: freezes name/price per line,
// computes the total, and decrements stock — all in one transaction, so a
// stock shortage on any line rolls the whole dispense back.
func (r *mutationResolver) CreateDispense(ctx context.Context, input model.CreateDispenseInput) (*model.Dispense, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if len(input.Items) == 0 {
		return nil, errors.New("a dispense needs at least one drug line")
	}
	var patient models.Patient
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", input.PatientID, auth.TenantID).
		First(&patient).Error; err != nil {
		return nil, GQLErr("patient not found")
	}

	date := strVal(input.Date)
	if date == "" {
		date = todayYMD()
	}
	disp := models.Dispense{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		PatientID: patient.ID, EncounterID: strVal(input.EncounterID),
		Date: date, Notes: strVal(input.Notes),
	}

	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		total := 0.0
		items := make([]models.DispenseItem, 0, len(input.Items))
		for _, in := range input.Items {
			if in.Qty <= 0 {
				return errors.New("dispense quantities must be positive")
			}
			var drug models.Drug
			if err := tx.Where("id = ? AND tenant_id = ?", in.DrugID, auth.TenantID).
				First(&drug).Error; err != nil {
				return GQLErr("drug not found")
			}
			if !drug.Active {
				return GQLErr(fmt.Sprintf("%s is inactive and cannot be dispensed", drug.Name))
			}
			lines, amount, err := dispenseDrugFEFO(tx, auth, disp.ID, drug, in.Qty)
			if err != nil {
				return err
			}
			total += amount
			items = append(items, lines...)
		}
		disp.TotalAmount = total
		if err := tx.Create(&disp).Error; err != nil {
			return err
		}
		for i := range items {
			if err := tx.Create(&items[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	var out models.Dispense
	if err := r.DB.WithContext(ctx).
		Preload("Patient").Preload("Items").
		Where("id = ?", disp.ID).First(&out).Error; err != nil {
		return nil, err
	}
	return dispenseToModel(out), nil
}

// ── helpers ──────────────────────────────────────────────────────────────────

func drugToModel(d models.Drug) *model.Drug {
	return &model.Drug{
		ID: d.ID, Name: d.Name, GenericName: toStrPtr(d.GenericName),
		Form: d.Form, Strength: toStrPtr(d.Strength), Unit: d.Unit,
		UnitPrice: d.UnitPrice, StockQty: d.StockQty,
		ReorderLevel: d.ReorderLevel, Active: d.Active,
	}
}

func loadDrug(db *gorm.DB, ctx context.Context, tenantID, id string) (*model.Drug, error) {
	var d models.Drug
	if err := db.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, tenantID).First(&d).Error; err != nil {
		return nil, err
	}
	return drugToModel(d), nil
}

func dispenseToModel(d models.Dispense) *model.Dispense {
	items := make([]*model.DispenseItem, len(d.Items))
	for i, it := range d.Items {
		items[i] = &model.DispenseItem{
			ID: it.ID, DrugID: it.DrugID, DrugName: it.DrugName,
			Qty: it.Qty, UnitPrice: it.UnitPrice, Amount: it.Amount,
		}
	}
	return &model.Dispense{
		ID: d.ID, PatientID: d.PatientID, PatientName: patientDisplayName(d.Patient),
		PatientMrn: d.Patient.MRN, EncounterID: toStrPtr(d.EncounterID),
		Date: d.Date, Items: items, TotalAmount: d.TotalAmount,
		Notes: toStrPtr(d.Notes), CreatedAt: rfc3339OrNil(d.CreatedAt),
	}
}
