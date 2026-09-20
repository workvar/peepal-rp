package graph

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Resolvers for the clinical Billing module (healthcare industry): a priced
// service catalog, invoices with frozen line items, and payments.

var billableCategories = map[string]bool{
	"consultation": true, "procedure": true, "lab": true, "radiology": true, "other": true,
}

var invoicePaymentModes = map[string]bool{
	"cash": true, "card": true, "upi": true, "online": true, "cheque": true,
}

// ── Service catalog ──────────────────────────────────────────────────────────

func (r *queryResolver) BillableServices(ctx context.Context, includeInactive *bool) ([]*model.BillableService, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID)
	if includeInactive == nil || !*includeInactive {
		q = q.Where("active = ?", true)
	}
	var rows []models.BillableService
	if err := q.Order("category ASC, name ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.BillableService, len(rows))
	for i, s := range rows {
		out[i] = billableServiceToModel(s)
	}
	return out, nil
}

func (r *mutationResolver) CreateBillableService(ctx context.Context, input model.CreateBillableServiceInput) (*model.BillableService, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	code := strings.ToUpper(strings.TrimSpace(input.Code))
	name := strings.TrimSpace(input.Name)
	if code == "" || name == "" {
		return nil, errors.New("code and name are required")
	}
	category := "other"
	if input.Category != nil && *input.Category != "" {
		if !billableCategories[*input.Category] {
			return nil, GQLErr("category must be consultation, procedure, lab, radiology, or other")
		}
		category = *input.Category
	}
	s := models.BillableService{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		Code: code, Name: name, Category: category,
		UnitPrice: input.UnitPrice, Active: true,
	}
	if err := r.DB.WithContext(ctx).Create(&s).Error; err != nil {
		return nil, GQLErr("could not create service — the code may already exist")
	}
	return billableServiceToModel(s), nil
}

func (r *mutationResolver) UpdateBillableService(ctx context.Context, id string, input model.UpdateBillableServiceInput) (*model.BillableService, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	if input.Code != nil {
		updates["code"] = strings.ToUpper(strings.TrimSpace(*input.Code))
	}
	setStr(updates, "name", input.Name)
	if input.Category != nil {
		if !billableCategories[*input.Category] {
			return nil, GQLErr("category must be consultation, procedure, lab, radiology, or other")
		}
		updates["category"] = *input.Category
	}
	if input.UnitPrice != nil {
		updates["unit_price"] = *input.UnitPrice
	}
	if input.Active != nil {
		updates["active"] = *input.Active
	}
	res := r.DB.WithContext(ctx).Model(&models.BillableService{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	var s models.BillableService
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&s).Error; err != nil {
		return nil, err
	}
	return billableServiceToModel(s), nil
}

func (r *mutationResolver) DeleteBillableService(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Delete(&models.BillableService{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// ── Invoices ─────────────────────────────────────────────────────────────────

func (r *queryResolver) Invoices(ctx context.Context, patientID *string, status *string, date *string) ([]*model.Invoice, error) {
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
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	if date != nil && *date != "" {
		q = q.Where("date = ?", *date)
	}
	var rows []models.Invoice
	if err := q.Order("created_at DESC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Invoice, len(rows))
	for i, inv := range rows {
		// nil db: list view skips the per-row CR-number lookup (avoids N+1);
		// patientUhid still populates from the preloaded Patient.
		out[i] = invoiceToModel(nil, inv, nil)
	}
	return out, nil
}

func (r *queryResolver) Invoice(ctx context.Context, id string) (*model.Invoice, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	return loadInvoice(r.DB, ctx, auth.TenantID, id)
}

// CreateInvoice bills a patient. Catalog lines take the service's name/price
// unless overridden; free-text lines need a description and price.
func (r *mutationResolver) CreateInvoice(ctx context.Context, input model.CreateInvoiceInput) (*model.Invoice, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if len(input.Items) == 0 {
		return nil, errors.New("an invoice needs at least one line item")
	}
	var patient models.Patient
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", input.PatientID, auth.TenantID).
		First(&patient).Error; err != nil {
		return nil, GQLErr("patient not found")
	}

	date := strVal(input.Date)
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	discount := floatVal(input.Discount)
	if discount < 0 {
		return nil, errors.New("discount cannot be negative")
	}

	inv := models.Invoice{
		ID: uuid.NewString(), TenantID: auth.TenantID,
		PatientID: patient.ID, EncounterID: strVal(input.EncounterID),
		Date: date, Discount: discount, Notes: strVal(input.Notes),
		Status: models.InvoiceUnpaid,
	}

	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		no, err := nextInvoiceNo(tx, auth.TenantID)
		if err != nil {
			return err
		}
		inv.InvoiceNo = no

		items, subtotal, err := buildInvoiceItems(tx, auth.TenantID, inv.ID, input.Items)
		if err != nil {
			return err
		}
		inv.Subtotal = subtotal
		inv.Total = subtotal - discount
		if inv.Total < 0 {
			return errors.New("discount exceeds the invoice subtotal")
		}
		if err := tx.Create(&inv).Error; err != nil {
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
	return loadInvoice(r.DB, ctx, auth.TenantID, inv.ID)
}

// CancelInvoice voids an unpaid invoice. Paid or partially paid invoices are
// immutable financial records and cannot be cancelled.
func (r *mutationResolver) CancelInvoice(ctx context.Context, id string) (*model.Invoice, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	var inv models.Invoice
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&inv).Error; err != nil {
		return nil, ErrNotFound
	}
	if inv.AmountPaid > 0 {
		return nil, GQLErr("an invoice with recorded payments cannot be cancelled")
	}
	if err := r.DB.WithContext(ctx).Model(&inv).Update("status", models.InvoiceCancelled).Error; err != nil {
		return nil, err
	}
	return loadInvoice(r.DB, ctx, auth.TenantID, id)
}

// RecordInvoicePayment applies money to an invoice and re-derives its status.
func (r *mutationResolver) RecordInvoicePayment(ctx context.Context, input model.RecordInvoicePaymentInput) (*model.Invoice, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if input.Amount <= 0 {
		return nil, errors.New("payment amount must be positive")
	}
	mode := "cash"
	if input.Mode != nil && *input.Mode != "" {
		if !invoicePaymentModes[*input.Mode] {
			return nil, GQLErr("mode must be cash, card, upi, online, or cheque")
		}
		mode = *input.Mode
	}

	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var inv models.Invoice
		if err := tx.Where("id = ? AND tenant_id = ?", input.InvoiceID, auth.TenantID).
			First(&inv).Error; err != nil {
			return ErrNotFound
		}
		if inv.Status == models.InvoiceCancelled {
			return GQLErr("cannot pay a cancelled invoice")
		}
		if inv.AmountPaid+input.Amount > inv.Total {
			return GQLErr(fmt.Sprintf("payment exceeds the outstanding balance of %.2f", inv.Total-inv.AmountPaid))
		}
		p := models.InvoicePayment{
			ID: uuid.NewString(), TenantID: auth.TenantID, InvoiceID: inv.ID,
			Amount: input.Amount, Mode: mode, Reference: strVal(input.Reference),
		}
		if err := tx.Create(&p).Error; err != nil {
			return err
		}
		inv.AmountPaid += input.Amount
		inv.RecomputeStatus()
		if err := tx.Model(&models.Invoice{}).Where("id = ?", inv.ID).
			Updates(map[string]interface{}{"amount_paid": inv.AmountPaid, "status": inv.Status}).Error; err != nil {
			return err
		}
		// GL (cash-basis AR): cash in, clinical income earned.
		return postBatch(tx, auth.TenantID, todayYMD(),
			"Invoice payment "+inv.InvoiceNo, models.LedgerSourceInvoicePayment, p.ID,
			[]postLine{
				{AccountKey: "cash", Debit: p.Amount},
				{AccountKey: "clinical_income", Credit: p.Amount},
			})
	})
	if err != nil {
		return nil, err
	}
	return loadInvoice(r.DB, ctx, auth.TenantID, input.InvoiceID)
}
