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

// Resolvers for Inventory & stores — healthcare industry, Phase 4. A central
// store of consumables/reagents; an "issue to pharmacy" moves stock into a
// linked pharmacy Drug atomically.

var inventoryCategories = map[string]bool{
	"consumable": true, "reagent": true, "drug": true, "equipment": true, "other": true,
}

func (r *queryResolver) InventoryItems(ctx context.Context, search *string, category *string, includeInactive *bool) ([]*model.InventoryItem, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Preload("LinkedDrug").Where("tenant_id = ?", auth.TenantID)
	if includeInactive == nil || !*includeInactive {
		q = q.Where("active = ?", true)
	}
	if category != nil && *category != "" {
		q = q.Where("category = ?", *category)
	}
	if search != nil && strings.TrimSpace(*search) != "" {
		like := "%" + strings.ToLower(strings.TrimSpace(*search)) + "%"
		q = q.Where("(LOWER(name) LIKE ? OR LOWER(code) LIKE ?)", like, like)
	}
	var rows []models.InventoryItem
	if err := q.Order("name ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.InventoryItem, len(rows))
	for i, it := range rows {
		out[i] = inventoryItemToModel(it)
	}
	return out, nil
}

func (r *queryResolver) StockTransactions(ctx context.Context, itemID string) ([]*model.StockTransaction, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var rows []models.StockTransaction
	if err := r.DB.WithContext(ctx).Preload("By").
		Where("item_id = ? AND tenant_id = ?", itemID, auth.TenantID).
		Order("created_at DESC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	// Item name for display.
	var item models.InventoryItem
	r.DB.WithContext(ctx).Select("name").First(&item, "id = ?", itemID)
	out := make([]*model.StockTransaction, len(rows))
	for i, t := range rows {
		out[i] = stockTxnToModel(t, item.Name)
	}
	return out, nil
}

func (r *mutationResolver) CreateInventoryItem(ctx context.Context, input model.CreateInventoryItemInput) (*model.InventoryItem, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	code := strings.TrimSpace(input.Code)
	name := strings.TrimSpace(input.Name)
	if code == "" || name == "" {
		return nil, GQLErr("item code and name are required")
	}
	category := "consumable"
	if input.Category != nil && *input.Category != "" {
		if !inventoryCategories[*input.Category] {
			return nil, GQLErr("invalid category")
		}
		category = *input.Category
	}
	linkedDrug := strVal(input.LinkedDrugID)
	if linkedDrug != "" && !drugExists(r.DB, ctx, auth.TenantID, linkedDrug) {
		return nil, GQLErr("linked drug not found")
	}
	unit := "unit"
	if input.Unit != nil && strings.TrimSpace(*input.Unit) != "" {
		unit = strings.TrimSpace(*input.Unit)
	}
	it := models.InventoryItem{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		Code: code, Name: name, Category: category, Unit: unit,
		StockQty: floatVal(input.OpeningStock), ReorderLevel: floatVal(input.ReorderLevel),
		UnitCost: floatVal(input.UnitCost), LinkedDrugID: linkedDrug, Active: true,
	}
	if it.StockQty < 0 {
		return nil, GQLErr("opening stock cannot be negative")
	}
	if err := r.DB.WithContext(ctx).Create(&it).Error; err != nil {
		return nil, uniqueErr(err, "an item with this code already exists")
	}
	if it.StockQty > 0 {
		r.logStock(ctx, auth, it.ID, models.StockReceipt, it.StockQty, "opening stock")
	}
	return r.reloadInventoryItem(ctx, auth.TenantID, it.ID)
}

func (r *mutationResolver) UpdateInventoryItem(ctx context.Context, id string, input model.UpdateInventoryItemInput) (*model.InventoryItem, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	setStr(updates, "code", input.Code)
	setStr(updates, "name", input.Name)
	setStr(updates, "unit", input.Unit)
	if input.Category != nil {
		if !inventoryCategories[*input.Category] {
			return nil, GQLErr("invalid category")
		}
		updates["category"] = *input.Category
	}
	if input.ReorderLevel != nil {
		updates["reorder_level"] = *input.ReorderLevel
	}
	if input.UnitCost != nil {
		updates["unit_cost"] = *input.UnitCost
	}
	if input.LinkedDrugID != nil {
		if *input.LinkedDrugID != "" && !drugExists(r.DB, ctx, auth.TenantID, *input.LinkedDrugID) {
			return nil, GQLErr("linked drug not found")
		}
		updates["linked_drug_id"] = *input.LinkedDrugID
	}
	if input.Active != nil {
		updates["active"] = *input.Active
	}
	res := r.DB.WithContext(ctx).Model(&models.InventoryItem{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates)
	if res.Error != nil {
		return nil, uniqueErr(res.Error, "an item with this code already exists")
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return r.reloadInventoryItem(ctx, auth.TenantID, id)
}

func (r *mutationResolver) DeleteInventoryItem(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("item_id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.StockTransaction{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.InventoryItem{}).Error
	})
	return err == nil, err
}

func (r *mutationResolver) ReceiveStock(ctx context.Context, itemID string, qty float64, reason *string) (*model.InventoryItem, error) {
	return r.moveStock(ctx, itemID, qty, models.StockReceipt, strVal(reason), true)
}

func (r *mutationResolver) AdjustInventoryStock(ctx context.Context, itemID string, delta float64, reason *string) (*model.InventoryItem, error) {
	return r.moveStock(ctx, itemID, delta, models.StockAdjustment, strVal(reason), false)
}

// IssueToPharmacy moves qty out of the store and into the linked pharmacy Drug.
func (r *mutationResolver) IssueToPharmacy(ctx context.Context, itemID string, qty float64) (*model.InventoryItem, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if qty <= 0 {
		return nil, GQLErr("quantity must be positive")
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var it models.InventoryItem
		if err := tx.Where("id = ? AND tenant_id = ?", itemID, auth.TenantID).First(&it).Error; err != nil {
			return ErrNotFound
		}
		if it.LinkedDrugID == "" {
			return GQLErr("item is not linked to a pharmacy drug")
		}
		if it.StockQty < qty {
			return GQLErr("not enough stock to issue")
		}
		if err := tx.Model(&models.InventoryItem{}).Where("id = ?", it.ID).
			Update("stock_qty", gorm.Expr("stock_qty - ?", qty)).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.Drug{}).Where("id = ? AND tenant_id = ?", it.LinkedDrugID, auth.TenantID).
			Update("stock_qty", gorm.Expr("stock_qty + ?", qty)).Error; err != nil {
			return err
		}
		txn := models.StockTransaction{
			ID: uuid.NewString(), TenantID: auth.TenantID, ItemID: it.ID,
			Kind: models.StockIssueToPharmacy, Qty: -qty, Reason: "issued to pharmacy",
			ByID: auth.UserID, Date: time.Now().Format("2006-01-02"),
		}
		return tx.Create(&txn).Error
	})
	if err != nil {
		return nil, err
	}
	return r.reloadInventoryItem(ctx, auth.TenantID, itemID)
}

// ── helpers ──────────────────────────────────────────────────────────────────

// moveStock applies a signed delta and logs a transaction. When requirePositive
// is set (receipts) a non-positive qty is rejected; adjustments allow negatives.
func (r *mutationResolver) moveStock(ctx context.Context, itemID string, delta float64, kind, reason string, requirePositive bool) (*model.InventoryItem, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if requirePositive && delta <= 0 {
		return nil, GQLErr("quantity must be positive")
	}
	if delta == 0 {
		return nil, GQLErr("quantity cannot be zero")
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var it models.InventoryItem
		if err := tx.Where("id = ? AND tenant_id = ?", itemID, auth.TenantID).First(&it).Error; err != nil {
			return ErrNotFound
		}
		if it.StockQty+delta < 0 {
			return GQLErr("stock cannot go below zero")
		}
		if err := tx.Model(&models.InventoryItem{}).Where("id = ?", it.ID).
			Update("stock_qty", gorm.Expr("stock_qty + ?", delta)).Error; err != nil {
			return err
		}
		txn := models.StockTransaction{
			ID: uuid.NewString(), TenantID: auth.TenantID, ItemID: it.ID,
			Kind: kind, Qty: delta, Reason: reason,
			ByID: auth.UserID, Date: time.Now().Format("2006-01-02"),
		}
		return tx.Create(&txn).Error
	})
	if err != nil {
		return nil, err
	}
	return r.reloadInventoryItem(ctx, auth.TenantID, itemID)
}

// logStock writes a stock transaction outside a transaction (opening balance).
func (r *mutationResolver) logStock(ctx context.Context, auth AuthContext, itemID, kind string, qty float64, reason string) {
	r.DB.WithContext(ctx).Create(&models.StockTransaction{
		ID: uuid.NewString(), TenantID: auth.TenantID, ItemID: itemID,
		Kind: kind, Qty: qty, Reason: reason, ByID: auth.UserID,
		Date: time.Now().Format("2006-01-02"),
	})
}

func (r *mutationResolver) reloadInventoryItem(ctx context.Context, tenantID, id string) (*model.InventoryItem, error) {
	var it models.InventoryItem
	if err := r.DB.WithContext(ctx).Preload("LinkedDrug").
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&it).Error; err != nil {
		return nil, err
	}
	return inventoryItemToModel(it), nil
}

func drugExists(db *gorm.DB, ctx context.Context, tenantID, id string) bool {
	var n int64
	db.WithContext(ctx).Model(&models.Drug{}).Where("id = ? AND tenant_id = ?", id, tenantID).Count(&n)
	return n > 0
}

func inventoryItemToModel(it models.InventoryItem) *model.InventoryItem {
	m := &model.InventoryItem{
		ID: it.ID, Code: it.Code, Name: it.Name, Category: it.Category, Unit: it.Unit,
		StockQty: it.StockQty, ReorderLevel: it.ReorderLevel, UnitCost: it.UnitCost,
		LinkedDrugID: toStrPtr(it.LinkedDrugID), Active: it.Active,
		CreatedAt: rfc3339OrNil(it.CreatedAt),
	}
	if it.LinkedDrugID != "" && it.LinkedDrug.ID != "" {
		m.LinkedDrugName = toStrPtr(it.LinkedDrug.Name)
	}
	return m
}

func stockTxnToModel(t models.StockTransaction, itemName string) *model.StockTransaction {
	m := &model.StockTransaction{
		ID: t.ID, ItemID: t.ItemID, ItemName: itemName,
		Kind: t.Kind, Qty: t.Qty, Reason: toStrPtr(t.Reason),
		Reference: toStrPtr(t.Reference), Date: toStrPtr(t.Date),
		CreatedAt: rfc3339OrNil(t.CreatedAt),
	}
	if t.ByID != "" && strings.TrimSpace(t.By.Name) != "" {
		m.ByName = toStrPtr(strings.TrimSpace(t.By.Name))
	}
	return m
}
