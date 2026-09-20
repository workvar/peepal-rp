package graph

import (
	"context"
	"errors"
	"fmt"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// nextPONumber returns a gap-tolerant "PO-00001" style number, unique per
// tenant. Mirrors nextInvoiceNo in billing_helpers.go.
func (r *Resolver) nextPONumber(tx *gorm.DB, tenantID string) (string, error) {
	var n int64
	if err := tx.Model(&models.PurchaseOrder{}).
		Where("tenant_id = ?", tenantID).Count(&n).Error; err != nil {
		return "", err
	}
	for i := 0; i < 1000; i++ {
		candidate := fmt.Sprintf("PO-%05d", n+1+int64(i))
		var exists int64
		if err := tx.Model(&models.PurchaseOrder{}).
			Where("tenant_id = ? AND po_number = ?", tenantID, candidate).
			Count(&exists).Error; err != nil {
			return "", err
		}
		if exists == 0 {
			return candidate, nil
		}
	}
	return "", errors.New("could not generate a unique PO number")
}

// ── converters ──────────────────────────────────────────────────────────────

func vendorToModel(v models.Vendor) *model.Vendor {
	m := &model.Vendor{
		ID:     v.ID,
		Name:   v.Name,
		Active: v.Active,
	}
	m.Code = toStrPtr(v.Code)
	m.Gstin = toStrPtr(v.GSTIN)
	m.ContactName = toStrPtr(v.ContactName)
	m.Phone = toStrPtr(v.Phone)
	m.Email = toStrPtr(v.Email)
	m.Address = toStrPtr(v.Address)
	m.PaymentTerms = toStrPtr(v.PaymentTerms)
	if !v.CreatedAt.IsZero() {
		c := v.CreatedAt.Format(time.RFC3339)
		m.CreatedAt = &c
	}
	return m
}

func purchaseOrderItemToModel(it models.PurchaseOrderItem) *model.PurchaseOrderItem {
	return &model.PurchaseOrderItem{
		ID:          it.ID,
		ItemID:      toStrPtr(it.ItemID),
		ItemName:    it.ItemName,
		Qty:         it.Qty,
		ReceivedQty: it.ReceivedQty,
		UnitCost:    it.UnitCost,
		TaxPct:      it.TaxPct,
		LineTotal:   it.LineTotal,
	}
}

func purchaseOrderToModel(p models.PurchaseOrder) *model.PurchaseOrder {
	items := make([]*model.PurchaseOrderItem, len(p.Items))
	for i, it := range p.Items {
		items[i] = purchaseOrderItemToModel(it)
	}
	m := &model.PurchaseOrder{
		ID:       p.ID,
		PoNumber: p.PONumber,
		VendorID: p.VendorID,
		Status:   p.Status,
		Subtotal: p.Subtotal,
		TaxTotal: p.TaxTotal,
		Total:    p.Total,
		Items:    items,
	}
	m.OrderDate = toStrPtr(p.OrderDate)
	m.ExpectedDate = toStrPtr(p.ExpectedDate)
	m.Notes = toStrPtr(p.Notes)
	if p.Vendor.ID != "" {
		m.Vendor = vendorToModel(p.Vendor)
	}
	if !p.CreatedAt.IsZero() {
		c := p.CreatedAt.Format(time.RFC3339)
		m.CreatedAt = &c
	}
	return m
}

func purchaseInvoiceToModel(p models.PurchaseInvoice) *model.PurchaseInvoice {
	m := &model.PurchaseInvoice{
		ID:            p.ID,
		InvoiceNumber: p.InvoiceNumber,
		VendorID:      p.VendorID,
		Subtotal:      p.Subtotal,
		TaxTotal:      p.TaxTotal,
		Total:         p.Total,
		PaidAmount:    p.PaidAmount,
		Status:        p.Status,
	}
	m.PurchaseOrderID = toStrPtr(p.PurchaseOrderID)
	m.InvoiceDate = toStrPtr(p.InvoiceDate)
	m.DueDate = toStrPtr(p.DueDate)
	if p.Vendor.ID != "" {
		m.Vendor = vendorToModel(p.Vendor)
	}
	if !p.CreatedAt.IsZero() {
		c := p.CreatedAt.Format(time.RFC3339)
		m.CreatedAt = &c
	}
	return m
}

func drugBatchToModel(b models.DrugBatch) *model.DrugBatch {
	m := &model.DrugBatch{
		ID:       b.ID,
		DrugID:   b.DrugID,
		BatchNo:  b.BatchNo,
		Qty:      b.Qty,
		UnitCost: b.UnitCost,
	}
	m.ExpiryDate = toStrPtr(b.ExpiryDate)
	m.ReceivedFromPoID = toStrPtr(b.ReceivedFromPOID)
	if b.Drug.ID != "" {
		m.DrugName = toStrPtr(b.Drug.Name)
	}
	if !b.CreatedAt.IsZero() {
		c := b.CreatedAt.Format(time.RFC3339)
		m.CreatedAt = &c
	}
	return m
}

// loadPurchaseOrder re-reads a PO with vendor + items for return values.
func (r *Resolver) loadPurchaseOrder(ctx context.Context, tenantID, id string) (*model.PurchaseOrder, error) {
	var p models.PurchaseOrder
	if err := r.DB.WithContext(ctx).
		Preload("Vendor").Preload("Items").
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&p).Error; err != nil {
		return nil, err
	}
	return purchaseOrderToModel(p), nil
}
