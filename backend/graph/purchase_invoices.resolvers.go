package graph

import (
	"context"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Supplier invoices and their payments. An unpaid invoice is the Phase 3 AP
// source; recordPurchasePayment is where Phase 3 will hook GL posting.

func (r *queryResolver) PurchaseInvoices(ctx context.Context, status *string) ([]*model.PurchaseInvoice, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Preload("Vendor").Where("tenant_id = ?", auth.TenantID)
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	var rows []models.PurchaseInvoice
	if err := q.Order("created_at DESC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.PurchaseInvoice, len(rows))
	for i, p := range rows {
		out[i] = purchaseInvoiceToModel(p)
	}
	return out, nil
}

func (r *mutationResolver) CreatePurchaseInvoice(ctx context.Context, input model.CreatePurchaseInvoiceInput) (*model.PurchaseInvoice, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	num := strings.TrimSpace(input.InvoiceNumber)
	if num == "" {
		return nil, GQLErr("invoice number is required")
	}
	var vendor models.Vendor
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", input.VendorID, auth.TenantID).First(&vendor).Error; err != nil {
		return nil, GQLErr("vendor not found")
	}
	poID := strVal(input.PurchaseOrderID)
	if poID != "" {
		var cnt int64
		if err := r.DB.WithContext(ctx).Model(&models.PurchaseOrder{}).
			Where("id = ? AND tenant_id = ?", poID, auth.TenantID).Count(&cnt).Error; err != nil {
			return nil, err
		}
		if cnt == 0 {
			return nil, GQLErr("purchase order not found")
		}
	}
	inv := models.PurchaseInvoice{
		ID: uuid.NewString(), TenantID: auth.TenantID, InvoiceNumber: num,
		VendorID: vendor.ID, PurchaseOrderID: poID,
		InvoiceDate: strVal(input.InvoiceDate), DueDate: strVal(input.DueDate),
		Subtotal: floatVal(input.Subtotal), TaxTotal: floatVal(input.TaxTotal),
		Total: floatVal(input.Total), Status: models.PurchaseInvoiceUnpaid,
	}
	if inv.InvoiceDate == "" {
		inv.InvoiceDate = todayYMD()
	}
	if err := r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&inv).Error; err != nil {
			return err
		}
		// GL (AP): purchase expense incurred, payable to the vendor raised.
		return postBatch(tx, auth.TenantID, inv.InvoiceDate,
			"Purchase invoice "+inv.InvoiceNumber, models.LedgerSourcePurchaseInvoice, inv.ID,
			[]postLine{
				{AccountKey: "purchases", Debit: inv.Total},
				{AccountKey: "ap_vendors", Credit: inv.Total},
			})
	}); err != nil {
		return nil, uniqueErr(err, "an invoice with this number already exists")
	}
	var out models.PurchaseInvoice
	if err := r.DB.WithContext(ctx).Preload("Vendor").Where("id = ?", inv.ID).First(&out).Error; err != nil {
		return nil, err
	}
	return purchaseInvoiceToModel(out), nil
}

func (r *mutationResolver) RecordPurchasePayment(ctx context.Context, input model.RecordPurchasePaymentInput) (*model.PurchaseInvoice, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if input.Amount <= 0 {
		return nil, GQLErr("payment amount must be positive")
	}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var inv models.PurchaseInvoice
		if err := tx.Where("id = ? AND tenant_id = ?", input.InvoiceID, auth.TenantID).
			First(&inv).Error; err != nil {
			return ErrNotFound
		}
		newPaid := inv.PaidAmount + input.Amount
		if inv.Total > 0 && newPaid > inv.Total+0.001 {
			return GQLErr("payment exceeds the invoice balance")
		}
		status := models.PurchaseInvoicePartial
		if inv.Total > 0 && newPaid+0.001 >= inv.Total {
			status = models.PurchaseInvoicePaid
		} else if newPaid <= 0 {
			status = models.PurchaseInvoiceUnpaid
		}
		if err := tx.Model(&models.PurchaseInvoice{}).Where("id = ?", inv.ID).
			Updates(map[string]interface{}{"paid_amount": newPaid, "status": status}).Error; err != nil {
			return err
		}
		// GL (AP): settle the payable, cash out. A purchase payment has no row of
		// its own, so several partial payments share the invoice id as source;
		// postPaymentBatch skips idempotency and reverseAllBatches unwinds them.
		return postPaymentBatch(tx, auth.TenantID, todayYMD(),
			"Payment for invoice "+inv.InvoiceNumber, models.LedgerSourcePurchasePayment, inv.ID,
			[]postLine{
				{AccountKey: "ap_vendors", Debit: input.Amount},
				{AccountKey: "cash", Credit: input.Amount},
			})
	})
	if err != nil {
		return nil, err
	}
	var out models.PurchaseInvoice
	if err := r.DB.WithContext(ctx).Preload("Vendor").
		Where("id = ? AND tenant_id = ?", input.InvoiceID, auth.TenantID).First(&out).Error; err != nil {
		return nil, err
	}
	return purchaseInvoiceToModel(out), nil
}

func (r *mutationResolver) DeletePurchaseInvoice(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	var affected int64
	if err := r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		res := tx.Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.PurchaseInvoice{})
		if res.Error != nil {
			return res.Error
		}
		affected = res.RowsAffected
		if affected == 0 {
			return nil
		}
		// GL: unwind the invoice posting and every payment against it.
		if err := reverseBatch(tx, auth.TenantID, models.LedgerSourcePurchaseInvoice, id); err != nil {
			return err
		}
		return reverseAllBatches(tx, auth.TenantID, models.LedgerSourcePurchasePayment, id)
	}); err != nil {
		return false, err
	}
	if affected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}
