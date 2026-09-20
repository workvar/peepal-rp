package graph

import (
	"context"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Purchase order CRUD plus the receive flow, which is the integration point
// with the existing StockTransaction ledger and pharmacy drug batches.

func (r *queryResolver) PurchaseOrders(ctx context.Context, status *string, vendorID *string) ([]*model.PurchaseOrder, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).
		Preload("Vendor").Preload("Items").
		Where("tenant_id = ?", auth.TenantID)
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	if vendorID != nil && *vendorID != "" {
		q = q.Where("vendor_id = ?", *vendorID)
	}
	var rows []models.PurchaseOrder
	if err := q.Order("created_at DESC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.PurchaseOrder, len(rows))
	for i, p := range rows {
		out[i] = purchaseOrderToModel(p)
	}
	return out, nil
}

func (r *queryResolver) PurchaseOrder(ctx context.Context, id string) (*model.PurchaseOrder, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	po, err := r.loadPurchaseOrder(ctx, auth.TenantID, id)
	if err != nil {
		return nil, nil
	}
	return po, nil
}

func (r *mutationResolver) CreatePurchaseOrder(ctx context.Context, input model.CreatePurchaseOrderInput) (*model.PurchaseOrder, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if len(input.Items) == 0 {
		return nil, GQLErr("a purchase order needs at least one line")
	}
	// Vendor must exist in this tenant.
	var vendor models.Vendor
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", input.VendorID, auth.TenantID).
		First(&vendor).Error; err != nil {
		return nil, GQLErr("vendor not found")
	}

	po := models.PurchaseOrder{
		ID: uuid.NewString(), TenantID: auth.TenantID, VendorID: vendor.ID,
		OrderDate: strVal(input.OrderDate), ExpectedDate: strVal(input.ExpectedDate),
		Status: models.POStatusDraft, Notes: strVal(input.Notes),
	}
	if po.OrderDate == "" {
		po.OrderDate = todayYMD()
	}

	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		num, err := r.nextPONumber(tx, auth.TenantID)
		if err != nil {
			return err
		}
		po.PONumber = num

		var subtotal, taxTotal float64
		items := make([]models.PurchaseOrderItem, 0, len(input.Items))
		for _, in := range input.Items {
			name := strings.TrimSpace(in.ItemName)
			if name == "" {
				return GQLErr("each line needs an item name")
			}
			if in.Qty <= 0 {
				return GQLErr("line quantities must be positive")
			}
			// Validate the store item ref if given (no DB FK).
			itemID := strVal(in.ItemID)
			if itemID != "" {
				var cnt int64
				if err := tx.Model(&models.InventoryItem{}).
					Where("id = ? AND tenant_id = ?", itemID, auth.TenantID).Count(&cnt).Error; err != nil {
					return err
				}
				if cnt == 0 {
					return GQLErr("inventory item not found: " + name)
				}
			}
			net := in.Qty * in.UnitCost
			tax := net * floatVal(in.TaxPct) / 100.0
			subtotal += net
			taxTotal += tax
			items = append(items, models.PurchaseOrderItem{
				ID: uuid.NewString(), TenantID: auth.TenantID, PurchaseOrderID: po.ID,
				ItemID: itemID, ItemName: name, Qty: in.Qty, UnitCost: in.UnitCost,
				TaxPct: floatVal(in.TaxPct), LineTotal: net + tax,
			})
		}
		po.Subtotal = subtotal
		po.TaxTotal = taxTotal
		po.Total = subtotal + taxTotal
		if err := tx.Create(&po).Error; err != nil {
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
	return r.loadPurchaseOrder(ctx, auth.TenantID, po.ID)
}

func (r *mutationResolver) UpdatePurchaseOrder(ctx context.Context, id string, input model.UpdatePurchaseOrderInput) (*model.PurchaseOrder, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var po models.PurchaseOrder
		if err := tx.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&po).Error; err != nil {
			return ErrNotFound
		}
		if po.Status != models.POStatusDraft {
			return GQLErr("only draft purchase orders can be edited")
		}
		updates := map[string]interface{}{}
		if input.VendorID != nil && *input.VendorID != "" {
			var cnt int64
			if err := tx.Model(&models.Vendor{}).
				Where("id = ? AND tenant_id = ?", *input.VendorID, auth.TenantID).Count(&cnt).Error; err != nil {
				return err
			}
			if cnt == 0 {
				return GQLErr("vendor not found")
			}
			updates["vendor_id"] = *input.VendorID
		}
		setStr(updates, "order_date", input.OrderDate)
		setStr(updates, "expected_date", input.ExpectedDate)
		setStr(updates, "notes", input.Notes)

		// Replace lines wholesale when provided, recomputing totals.
		if input.Items != nil {
			if len(input.Items) == 0 {
				return GQLErr("a purchase order needs at least one line")
			}
			if err := tx.Where("purchase_order_id = ? AND tenant_id = ?", po.ID, auth.TenantID).
				Delete(&models.PurchaseOrderItem{}).Error; err != nil {
				return err
			}
			var subtotal, taxTotal float64
			for _, in := range input.Items {
				name := strings.TrimSpace(in.ItemName)
				if name == "" || in.Qty <= 0 {
					return GQLErr("each line needs a name and a positive quantity")
				}
				net := in.Qty * in.UnitCost
				tax := net * floatVal(in.TaxPct) / 100.0
				subtotal += net
				taxTotal += tax
				line := models.PurchaseOrderItem{
					ID: uuid.NewString(), TenantID: auth.TenantID, PurchaseOrderID: po.ID,
					ItemID: strVal(in.ItemID), ItemName: name, Qty: in.Qty, UnitCost: in.UnitCost,
					TaxPct: floatVal(in.TaxPct), LineTotal: net + tax,
				}
				if err := tx.Create(&line).Error; err != nil {
					return err
				}
			}
			updates["subtotal"] = subtotal
			updates["tax_total"] = taxTotal
			updates["total"] = subtotal + taxTotal
		}
		if len(updates) == 0 {
			return nil
		}
		return tx.Model(&models.PurchaseOrder{}).
			Where("id = ? AND tenant_id = ?", po.ID, auth.TenantID).Updates(updates).Error
	})
	if err != nil {
		return nil, err
	}
	return r.loadPurchaseOrder(ctx, auth.TenantID, id)
}

var poStatusSettable = map[string]bool{
	models.POStatusDraft:     true,
	models.POStatusOrdered:   true,
	models.POStatusCancelled: true,
}

func (r *mutationResolver) SetPurchaseOrderStatus(ctx context.Context, id string, status string) (*model.PurchaseOrder, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if !poStatusSettable[status] {
		return nil, GQLErr("status must be draft, ordered, or cancelled (receiving sets received/partial)")
	}
	res := r.DB.WithContext(ctx).Model(&models.PurchaseOrder{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Update("status", status)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return r.loadPurchaseOrder(ctx, auth.TenantID, id)
}

// DeletePurchaseOrder removes a PO and its line items. Deletion is blocked once
// any stock has been received against it (received / partially_received), since
// that stock is already in the inventory ledger and reversing it is out of scope.
func (r *mutationResolver) DeletePurchaseOrder(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	var affected int64
	if err := r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var po models.PurchaseOrder
		if err := tx.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&po).Error; err != nil {
			return ErrNotFound
		}
		if po.Status == models.POStatusReceived || po.Status == models.POStatusPartial {
			return GQLErr("cannot delete a purchase order that has received stock")
		}
		if err := tx.Where("purchase_order_id = ? AND tenant_id = ?", po.ID, auth.TenantID).
			Delete(&models.PurchaseOrderItem{}).Error; err != nil {
			return err
		}
		res := tx.Where("id = ? AND tenant_id = ?", po.ID, auth.TenantID).Delete(&models.PurchaseOrder{})
		if res.Error != nil {
			return res.Error
		}
		affected = res.RowsAffected
		return nil
	}); err != nil {
		return false, err
	}
	if affected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// ReceivePurchaseOrder records received quantities against PO lines. In one
// transaction it: writes a StockReceipt ledger row and bumps InventoryItem
// stock for each linked line; creates a DrugBatch (and bumps Drug.StockQty)
// when the item links to a pharmacy drug; then recomputes PO status.
func (r *mutationResolver) ReceivePurchaseOrder(ctx context.Context, id string, input model.ReceivePurchaseOrderInput) (*model.PurchaseOrder, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if len(input.Lines) == 0 {
		return nil, GQLErr("nothing to receive")
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var po models.PurchaseOrder
		if err := tx.Preload("Items").
			Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&po).Error; err != nil {
			return ErrNotFound
		}
		if po.Status == models.POStatusCancelled {
			return GQLErr("cannot receive a cancelled purchase order")
		}
		byLine := map[string]models.PurchaseOrderItem{}
		for _, it := range po.Items {
			byLine[it.ID] = it
		}
		for _, in := range input.Lines {
			if in.ReceivedQty <= 0 {
				return GQLErr("received quantities must be positive")
			}
			line, ok := byLine[in.LineID]
			if !ok {
				return GQLErr("purchase order line not found")
			}
			remaining := line.Qty - line.ReceivedQty
			if in.ReceivedQty > remaining {
				return GQLErr("received quantity exceeds the outstanding amount for " + line.ItemName)
			}
			// Update the running received total on the line.
			if err := tx.Model(&models.PurchaseOrderItem{}).
				Where("id = ?", line.ID).
				Update("received_qty", gorm.Expr("received_qty + ?", in.ReceivedQty)).Error; err != nil {
				return err
			}
			if line.ItemID == "" {
				// One-off buy that doesn't track stock; nothing more to do.
				continue
			}
			var item models.InventoryItem
			if err := tx.Where("id = ? AND tenant_id = ?", line.ItemID, auth.TenantID).
				First(&item).Error; err != nil {
				return GQLErr("inventory item not found for " + line.ItemName)
			}
			// Stock in via the signed ledger.
			if err := tx.Model(&models.InventoryItem{}).Where("id = ?", item.ID).
				Update("stock_qty", gorm.Expr("stock_qty + ?", in.ReceivedQty)).Error; err != nil {
				return err
			}
			txn := models.StockTransaction{
				ID: uuid.NewString(), TenantID: auth.TenantID, ItemID: item.ID,
				Kind: models.StockReceipt, Qty: in.ReceivedQty,
				Reason: "PO receipt", Reference: po.PONumber,
				ByID: auth.UserID, Date: todayYMD(),
			}
			if err := tx.Create(&txn).Error; err != nil {
				return err
			}
			// If the item links a pharmacy drug, record a batch and bump drug stock.
			if item.LinkedDrugID != "" {
				batchNo := strVal(in.BatchNo)
				if batchNo == "" {
					return GQLErr("batch number is required when receiving a pharmacy drug: " + line.ItemName)
				}
				batch := models.DrugBatch{
					ID: uuid.NewString(), TenantID: auth.TenantID, DrugID: item.LinkedDrugID,
					BatchNo: batchNo, ExpiryDate: strVal(in.ExpiryDate),
					Qty: in.ReceivedQty, UnitCost: line.UnitCost, ReceivedFromPOID: po.ID,
				}
				if err := tx.Create(&batch).Error; err != nil {
					return err
				}
				if err := tx.Model(&models.Drug{}).
					Where("id = ? AND tenant_id = ?", item.LinkedDrugID, auth.TenantID).
					Update("stock_qty", gorm.Expr("stock_qty + ?", in.ReceivedQty)).Error; err != nil {
					return err
				}
			}
		}
		// Recompute status from received vs ordered across all lines.
		var lines []models.PurchaseOrderItem
		if err := tx.Where("purchase_order_id = ? AND tenant_id = ?", po.ID, auth.TenantID).
			Find(&lines).Error; err != nil {
			return err
		}
		allDone, anyReceived := true, false
		for _, l := range lines {
			if l.ReceivedQty > 0 {
				anyReceived = true
			}
			if l.ReceivedQty < l.Qty {
				allDone = false
			}
		}
		status := po.Status
		switch {
		case allDone:
			status = models.POStatusReceived
		case anyReceived:
			status = models.POStatusPartial
		}
		return tx.Model(&models.PurchaseOrder{}).Where("id = ?", po.ID).
			Update("status", status).Error
	})
	if err != nil {
		return nil, err
	}
	return r.loadPurchaseOrder(ctx, auth.TenantID, id)
}
