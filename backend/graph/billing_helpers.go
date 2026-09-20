package graph

// Converters and shared logic for the clinical Billing resolvers.

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

func billableServiceToModel(s models.BillableService) *model.BillableService {
	return &model.BillableService{
		ID: s.ID, Code: s.Code, Name: s.Name, Category: s.Category,
		UnitPrice: s.UnitPrice, Active: s.Active,
	}
}

// invoiceToModel converts an invoice with its preloaded Patient and Items.
// Payments are passed separately (only the detail view loads them). db is used
// for a small lookup of the linked encounter's CR number; pass nil to skip it
// (list views that don't need to print).
func invoiceToModel(db *gorm.DB, inv models.Invoice, payments []models.InvoicePayment) *model.Invoice {
	items := make([]*model.InvoiceItem, len(inv.Items))
	for i, it := range inv.Items {
		items[i] = &model.InvoiceItem{
			ID: it.ID, ServiceID: toStrPtr(it.ServiceID), Description: it.Description,
			Qty: it.Qty, UnitPrice: it.UnitPrice, Amount: it.Amount,
		}
	}
	pays := make([]*model.InvoicePayment, len(payments))
	for i, p := range payments {
		pays[i] = &model.InvoicePayment{
			ID: p.ID, InvoiceID: p.InvoiceID, Amount: p.Amount, Mode: p.Mode,
			Reference: toStrPtr(p.Reference), PaidAt: rfc3339OrNil(p.PaidAt),
		}
	}
	m := &model.Invoice{
		ID: inv.ID, InvoiceNo: inv.InvoiceNo,
		PatientID: inv.PatientID, PatientName: patientDisplayName(inv.Patient),
		PatientMrn: inv.Patient.MRN, PatientUhid: toStrPtr(inv.Patient.UHID),
		EncounterID: toStrPtr(inv.EncounterID),
		Date:        inv.Date, Items: items, Subtotal: inv.Subtotal, Discount: inv.Discount,
		Total: inv.Total, AmountPaid: inv.AmountPaid, Payments: pays,
		Status: inv.Status, Notes: toStrPtr(inv.Notes), CreatedAt: rfc3339OrNil(inv.CreatedAt),
	}
	// The invoice only stores the encounter id; look up its CR number so the
	// printed invoice can carry both identifiers without a client-side join.
	if db != nil && inv.EncounterID != "" {
		var enc models.Encounter
		if db.Select("cr_number").Where("id = ? AND tenant_id = ?", inv.EncounterID, inv.TenantID).
			First(&enc).Error == nil {
			m.EncounterCrNumber = toStrPtr(enc.CRNumber)
		}
	}
	return m
}

// InvoiceForPDF exposes the invoice loader to the REST PDF handler
// (handlers/clinical_pdf.go), mirroring the other pdf_exports helpers.
func InvoiceForPDF(ctx context.Context, db *gorm.DB, tenantID, id string) (*model.Invoice, error) {
	return loadInvoice(db, ctx, tenantID, id)
}

// loadInvoice fetches one invoice with items, patient, and payments.
func loadInvoice(db *gorm.DB, ctx context.Context, tenantID, id string) (*model.Invoice, error) {
	var inv models.Invoice
	if err := db.WithContext(ctx).
		Preload("Patient").Preload("Items").
		Where("id = ? AND tenant_id = ?", id, tenantID).
		First(&inv).Error; err != nil {
		return nil, ErrNotFound
	}
	var payments []models.InvoicePayment
	if err := db.WithContext(ctx).
		Where("invoice_id = ? AND tenant_id = ?", id, tenantID).
		Order("paid_at ASC").Find(&payments).Error; err != nil {
		return nil, err
	}
	return invoiceToModel(db, inv, payments), nil
}

// nextInvoiceNo generates the next sequential invoice number for a tenant
// (INV-00001, …), skipping values already taken.
func nextInvoiceNo(tx *gorm.DB, tenantID string) (string, error) {
	var n int64
	if err := tx.Model(&models.Invoice{}).
		Where("tenant_id = ?", tenantID).Count(&n).Error; err != nil {
		return "", err
	}
	for i := 0; i < 1000; i++ {
		candidate := fmt.Sprintf("INV-%05d", n+1+int64(i))
		var exists int64
		if err := tx.Model(&models.Invoice{}).
			Where("tenant_id = ? AND invoice_no = ?", tenantID, candidate).
			Count(&exists).Error; err != nil {
			return "", err
		}
		if exists == 0 {
			return candidate, nil
		}
	}
	return "", errors.New("could not generate a unique invoice number")
}

// buildInvoiceItems resolves input lines against the service catalog, freezing
// description and price onto each line, and returns them with the subtotal.
func buildInvoiceItems(tx *gorm.DB, tenantID, invoiceID string, inputs []*model.InvoiceItemInput) ([]models.InvoiceItem, float64, error) {
	items := make([]models.InvoiceItem, 0, len(inputs))
	subtotal := 0.0
	for _, in := range inputs {
		item := models.InvoiceItem{
			ID: uuid.NewString(), TenantID: tenantID, InvoiceID: invoiceID,
			Qty: 1,
		}
		if in.Qty != nil && *in.Qty > 0 {
			item.Qty = *in.Qty
		}
		if in.ServiceID != nil && *in.ServiceID != "" {
			var svc models.BillableService
			if err := tx.Where("id = ? AND tenant_id = ?", *in.ServiceID, tenantID).
				First(&svc).Error; err != nil {
				return nil, 0, GQLErr("billable service not found")
			}
			item.ServiceID = svc.ID
			item.Description = svc.Name
			item.UnitPrice = svc.UnitPrice
		}
		if in.Description != nil && strings.TrimSpace(*in.Description) != "" {
			item.Description = strings.TrimSpace(*in.Description)
		}
		if in.UnitPrice != nil {
			item.UnitPrice = *in.UnitPrice
		}
		if item.Description == "" {
			return nil, 0, errors.New("each free-text line needs a description")
		}
		if item.UnitPrice < 0 {
			return nil, 0, errors.New("unit price cannot be negative")
		}
		item.Amount = item.Qty * item.UnitPrice
		subtotal += item.Amount
		items = append(items, item)
	}
	return items, subtotal, nil
}

// todayYMD is a tiny helper shared by billing/pharmacy resolvers.
func todayYMD() string { return time.Now().Format("2006-01-02") }
