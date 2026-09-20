package graph

import (
	"context"
	"fmt"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Pharmacy batch/expiry tracking (Phase 2): FEFO dispensing plus batch and
// expiry reporting queries for the pharmacy dashboard.

func (r *queryResolver) DrugBatches(ctx context.Context, drugID string) ([]*model.DrugBatch, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var rows []models.DrugBatch
	if err := r.DB.WithContext(ctx).Preload("Drug").
		Where("tenant_id = ? AND drug_id = ?", auth.TenantID, drugID).
		Order("expiry_date ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.DrugBatch, len(rows))
	for i, b := range rows {
		out[i] = drugBatchToModel(b)
	}
	return out, nil
}

// ExpiringDrugs lists non-empty batches expiring within `days` days (a batch
// with a blank expiry is skipped). Ordered soonest-first.
func (r *queryResolver) ExpiringDrugs(ctx context.Context, days int) ([]*model.DrugBatch, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	cutoff := time.Now().AddDate(0, 0, days).Format("2006-01-02")
	var rows []models.DrugBatch
	if err := r.DB.WithContext(ctx).Preload("Drug").
		Where("tenant_id = ? AND qty > 0 AND expiry_date <> '' AND expiry_date <= ?", auth.TenantID, cutoff).
		Order("expiry_date ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.DrugBatch, len(rows))
	for i, b := range rows {
		out[i] = drugBatchToModel(b)
	}
	return out, nil
}

// CreateDrugBatch logs a received lot for a drug: it inserts a DrugBatch and
// bumps the drug's denormalized StockQty by the received quantity, in one
// transaction. This is the lightweight path to record stock with an expiry
// (and enable FEFO) without raising a full purchase order.
func (r *mutationResolver) CreateDrugBatch(ctx context.Context, input model.CreateDrugBatchInput) (*model.DrugBatch, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	batchNo := strings.TrimSpace(input.BatchNo)
	if batchNo == "" {
		return nil, GQLErr("batch number is required")
	}
	if input.Qty <= 0 {
		return nil, GQLErr("batch quantity must be positive")
	}

	var batch models.DrugBatch
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var drug models.Drug
		if err := tx.Where("id = ? AND tenant_id = ?", input.DrugID, auth.TenantID).
			First(&drug).Error; err != nil {
			return GQLErr("drug not found")
		}
		batch = models.DrugBatch{
			ID: uuid.NewString(), TenantID: auth.TenantID, DrugID: drug.ID,
			BatchNo: batchNo, ExpiryDate: strings.TrimSpace(strVal(input.ExpiryDate)),
			Qty: input.Qty, UnitCost: floatVal(input.UnitCost),
		}
		if err := tx.Create(&batch).Error; err != nil {
			return err
		}
		return tx.Model(&models.Drug{}).Where("id = ? AND tenant_id = ?", drug.ID, auth.TenantID).
			Update("stock_qty", gorm.Expr("stock_qty + ?", input.Qty)).Error
	})
	if err != nil {
		return nil, err
	}

	var out models.DrugBatch
	if err := r.DB.WithContext(ctx).Preload("Drug").Where("id = ?", batch.ID).First(&out).Error; err != nil {
		return nil, err
	}
	return drugBatchToModel(out), nil
}

// dispenseDrugFEFO decrements stock for a drug line. If the drug has batch rows
// it draws First-Expiry-First-Out across non-expired batches (producing one
// DispenseItem per batch consumed, each stamped with its batch); otherwise it
// falls back to the drug's denormalized StockQty (legacy, un-batched drugs).
// It keeps Drug.StockQty in sync in both paths.
func dispenseDrugFEFO(tx *gorm.DB, auth AuthContext, dispenseID string, drug models.Drug, qty float64) ([]models.DispenseItem, float64, error) {
	today := time.Now().Format("2006-01-02")

	var batches []models.DrugBatch
	if err := tx.Where("tenant_id = ? AND drug_id = ? AND qty > 0", auth.TenantID, drug.ID).
		Order("expiry_date ASC").Find(&batches).Error; err != nil {
		return nil, 0, err
	}

	// Legacy path: no batch tracking for this drug yet.
	if len(batches) == 0 {
		if drug.StockQty < qty {
			return nil, 0, GQLErr(fmt.Sprintf("insufficient stock for %s (available: %g)", drug.Name, drug.StockQty))
		}
		if err := tx.Model(&models.Drug{}).Where("id = ?", drug.ID).
			Update("stock_qty", gorm.Expr("stock_qty - ?", qty)).Error; err != nil {
			return nil, 0, err
		}
		amount := qty * drug.UnitPrice
		return []models.DispenseItem{{
			ID: uuid.NewString(), TenantID: auth.TenantID, DispenseID: dispenseID,
			DrugID: drug.ID, DrugName: drug.Name, Qty: qty,
			UnitPrice: drug.UnitPrice, Amount: amount,
		}}, amount, nil
	}

	// FEFO path: only non-expired batches are dispensable.
	var available float64
	usable := batches[:0]
	for _, b := range batches {
		if b.ExpiryDate != "" && b.ExpiryDate < today {
			continue // expired
		}
		available += b.Qty
		usable = append(usable, b)
	}
	if available < qty {
		return nil, 0, GQLErr(fmt.Sprintf("insufficient non-expired stock for %s (available: %g)", drug.Name, available))
	}

	remaining := qty
	items := make([]models.DispenseItem, 0, len(usable))
	amount := 0.0
	for _, b := range usable {
		if remaining <= 0 {
			break
		}
		take := b.Qty
		if take > remaining {
			take = remaining
		}
		if err := tx.Model(&models.DrugBatch{}).Where("id = ?", b.ID).
			Update("qty", gorm.Expr("qty - ?", take)).Error; err != nil {
			return nil, 0, err
		}
		lineAmount := take * drug.UnitPrice
		amount += lineAmount
		items = append(items, models.DispenseItem{
			ID: uuid.NewString(), TenantID: auth.TenantID, DispenseID: dispenseID,
			DrugID: drug.ID, DrugName: drug.Name, Qty: take,
			UnitPrice: drug.UnitPrice, Amount: lineAmount,
			BatchID: b.ID, BatchNo: b.BatchNo,
		})
		remaining -= take
	}
	// Keep the denormalized drug total in sync with batch totals.
	if err := tx.Model(&models.Drug{}).Where("id = ?", drug.ID).
		Update("stock_qty", gorm.Expr("stock_qty - ?", qty)).Error; err != nil {
		return nil, 0, err
	}
	return items, amount, nil
}
