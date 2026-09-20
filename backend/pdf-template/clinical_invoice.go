package pdftemplate

// Clinical invoice/receipt PDF (healthcare industry): facility header, patient
// identity, charged line items, totals, and payment history. Built from the
// GraphQL Invoice model so the backend stays the single source of truth.

import (
	"fmt"
	"strings"
	"time"

	"collegeerp/graph/model"
)

// BuildInvoicePDF renders one invoice with its payments. When the invoice is
// fully paid the document doubles as the receipt.
func BuildInvoicePDF(facility string, inv *model.Invoice) ([]byte, error) {
	d := NewDoc()

	title := "Invoice"
	if inv.Status == "paid" {
		title = "Invoice / Receipt"
	}
	if facility != "" {
		d.H1(facility)
		d.H2(title)
	} else {
		d.H1(title)
	}

	d.Body("Invoice No: " + inv.InvoiceNo)
	d.Body("Date: " + inv.Date)
	d.Body("Status: " + strings.ToUpper(strings.ReplaceAll(inv.Status, "_", " ")))

	d.Space(4)
	patientLine := "Patient: " + inv.PatientName + " (" + inv.PatientMrn + ")"
	if inv.PatientUhid != nil && *inv.PatientUhid != "" {
		patientLine += "  ·  UHID: " + *inv.PatientUhid
	}
	d.Body(patientLine)
	if inv.EncounterCrNumber != nil && *inv.EncounterCrNumber != "" {
		d.Body("CR No: " + *inv.EncounterCrNumber)
	}

	d.Space(4)
	d.H3("Charges")
	for _, it := range inv.Items {
		d.Body(fmt.Sprintf("%s  —  %g x %s  =  %s",
			it.Description, it.Qty, rupees(it.UnitPrice), rupees(it.Amount)))
	}

	d.Space(4)
	d.H3("Totals")
	d.Body("Subtotal: " + rupees(inv.Subtotal))
	if inv.Discount > 0 {
		d.Body("Discount: -" + rupees(inv.Discount))
	}
	d.Body("Total: " + rupees(inv.Total))
	d.Body("Paid: " + rupees(inv.AmountPaid))
	d.Body("Balance: " + rupees(inv.Total-inv.AmountPaid))

	if len(inv.Payments) > 0 {
		d.Space(4)
		d.H3("Payments")
		for _, p := range inv.Payments {
			line := fmt.Sprintf("%s  —  %s", paymentDate(p), rupees(p.Amount))
			line += "  via " + prettyMode(p.Mode)
			if p.Reference != nil && *p.Reference != "" {
				line += "  (ref: " + *p.Reference + ")"
			}
			d.Body(line)
		}
	}

	if inv.Notes != nil && *inv.Notes != "" {
		d.Space(4)
		d.Muted("Notes: " + *inv.Notes)
	}

	d.Space(8)
	d.Italic("This is a computer-generated document. Generated: " +
		time.Now().Format("2006-01-02 15:04"))
	return d.Bytes()
}

// paymentDate renders a payment's RFC3339 timestamp as a plain date.
func paymentDate(p *model.InvoicePayment) string {
	if p.PaidAt == nil || *p.PaidAt == "" {
		return "-"
	}
	if t, err := time.Parse(time.RFC3339, *p.PaidAt); err == nil {
		return t.Format("2006-01-02")
	}
	return *p.PaidAt
}
