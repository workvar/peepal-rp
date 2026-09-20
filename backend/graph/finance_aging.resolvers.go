package graph

// Accounts-receivable and accounts-payable aging. These read straight from the
// source documents (student fees, clinical invoices, purchase invoices) rather
// than re-deriving from the ledger, so the numbers stay intuitive for staff.

import (
	"context"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"
)

func (r *queryResolver) AccountsReceivableAging(ctx context.Context, asOf *string) ([]*model.AgingRow, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	as := orToday(asOf)
	rows := []*model.AgingRow{}

	// Student fees with an outstanding balance.
	var fees []models.StudentFee
	if err := r.DB.WithContext(ctx).
		Preload("Student.User").Preload("FeeAllocation").
		Where("tenant_id = ? AND net_amount - paid_amount > 0.005", auth.TenantID).
		Find(&fees).Error; err != nil {
		return nil, err
	}
	for _, f := range fees {
		refDate := f.CreatedAt.Format("2006-01-02")
		rows = append(rows, agingRow(
			f.StudentID, studentDisplayName(f), allocationRef(f),
			refDate, "", round2fin(f.NetAmount-f.PaidAmount), as,
		))
	}

	// Clinical invoices not fully paid / cancelled.
	var invoices []models.Invoice
	if err := r.DB.WithContext(ctx).Preload("Patient").
		Where("tenant_id = ? AND status IN ? AND total - amount_paid > 0.005",
			auth.TenantID, []string{"unpaid", "partially_paid"}).
		Find(&invoices).Error; err != nil {
		return nil, err
	}
	for _, inv := range invoices {
		name := strings.TrimSpace(inv.Patient.FirstName + " " + inv.Patient.LastName)
		rows = append(rows, agingRow(
			inv.PatientID, name, inv.InvoiceNo,
			inv.Date, "", round2fin(inv.Total-inv.AmountPaid), as,
		))
	}
	return rows, nil
}

func (r *queryResolver) AccountsPayableAging(ctx context.Context, asOf *string) ([]*model.AgingRow, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	as := orToday(asOf)
	rows := []*model.AgingRow{}

	var invs []models.PurchaseInvoice
	if err := r.DB.WithContext(ctx).Preload("Vendor").
		Where("tenant_id = ? AND status <> ? AND total - paid_amount > 0.005",
			auth.TenantID, models.PurchaseInvoicePaid).
		Find(&invs).Error; err != nil {
		return nil, err
	}
	for _, inv := range invs {
		due := inv.DueDate
		ref := due
		if ref == "" {
			ref = inv.InvoiceDate
		}
		rows = append(rows, agingRow(
			inv.VendorID, inv.Vendor.Name, inv.InvoiceNumber,
			inv.InvoiceDate, due, round2fin(inv.Total-inv.PaidAmount), as,
		))
	}
	return rows, nil
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// agingRow assembles one row, computing days overdue against `asOf`. Overdue is
// measured from dueDate when present, otherwise from the document date.
func agingRow(partyID, partyName, reference, date, dueDate string, amount float64, asOf string) *model.AgingRow {
	base := dueDate
	if base == "" {
		base = date
	}
	days := daysBetween(base, asOf)
	if days < 0 {
		days = 0
	}
	row := &model.AgingRow{
		PartyID: partyID, PartyName: partyName, Reference: reference,
		Amount: amount, DaysOverdue: days, Bucket: agingBucket(days),
	}
	if date != "" {
		row.Date = toStrPtr(date)
	}
	if dueDate != "" {
		row.DueDate = toStrPtr(dueDate)
	}
	return row
}

func agingBucket(days int) string {
	switch {
	case days <= 0:
		return "current"
	case days <= 30:
		return "1-30"
	case days <= 60:
		return "31-60"
	case days <= 90:
		return "61-90"
	default:
		return "90+"
	}
}

// daysBetween returns whole days from `a` to `b` (both YYYY-MM-DD); 0 if either
// is unparseable.
func daysBetween(a, b string) int {
	ta, err1 := time.Parse("2006-01-02", a)
	tb, err2 := time.Parse("2006-01-02", b)
	if err1 != nil || err2 != nil {
		return 0
	}
	return int(tb.Sub(ta).Hours() / 24)
}

func studentDisplayName(f models.StudentFee) string {
	if f.Student.User.Name != "" {
		return f.Student.User.Name
	}
	return "Student"
}

func allocationRef(f models.StudentFee) string {
	if f.FeeAllocation.Name != "" {
		return f.FeeAllocation.Name
	}
	return "Fee"
}
