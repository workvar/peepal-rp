package pdftemplate

// Fee payment receipt PDFs: a single-payment receipt and a combined document
// with one receipt per page. Built from the GraphQL fee model so the backend is
// the single source of truth for the layout.

import (
	"strings"

	"collegeerp/graph/model"
	"collegeerp/qrcode"
)

// FeeMeta is the student identity block printed at the top of every fee PDF.
type FeeMeta struct {
	Institute   string
	StudentName string
	RollNumber  string
	CourseName  string
	TenantID    string // for the verification QR stamp
}

// BuildFeeReceiptPDF renders one payment receipt.
func BuildFeeReceiptPDF(meta FeeMeta, p *model.FeePayment, installmentLabel string) ([]byte, error) {
	d := NewDoc()
	writeReceipt(d, meta, p, installmentLabel)
	return d.Bytes()
}

// BuildAllReceiptsPDF renders every paid receipt, one per page. labels maps an
// installment id to its human label so each receipt can name what was paid.
func BuildAllReceiptsPDF(meta FeeMeta, payments []*model.FeePayment, labels map[string]string) ([]byte, error) {
	d := NewDoc()
	first := true
	for _, p := range payments {
		if p == nil || p.Status != "paid" {
			continue
		}
		if !first {
			d.PageBreak()
		}
		first = false
		writeReceipt(d, meta, p, labelFor(labels, p.InstallmentID))
	}
	return d.Bytes()
}

// writeReceipt lays out the blocks for a single receipt.
func writeReceipt(d *Doc, meta FeeMeta, p *model.FeePayment, installmentLabel string) {
	if meta.Institute != "" {
		d.H1(meta.Institute)
		d.H2("Fee Payment Receipt")
	} else {
		d.H1("Fee Payment Receipt")
	}

	// Phase 1 proof-of-use: stamp a verification QR encoding this receipt so a
	// scan resolves to /verify?...&k=invoice&id=<payment>&s=<hmac>.
	if meta.TenantID != "" && p.ID != "" {
		d.QRTopRight(qrcode.VerifyURL("", meta.TenantID, qrcode.KindInvoice, p.ID), 22)
	}

	d.Body("Receipt No: " + p.ReceiptNumber)
	d.Body("Date: " + p.PaymentDate)

	d.Space(4)
	d.Body("Student: " + meta.StudentName + " (" + meta.RollNumber + ")")
	d.Body("Course: " + meta.CourseName)
	d.Body("Fee: " + feeName(p))
	if installmentLabel != "" {
		d.Body("Installment: " + installmentLabel)
	}

	d.Space(4)
	d.H3("Payment Details")
	d.Body("Amount Paid: " + rupees(p.Amount))
	d.Body("Payment Mode: " + prettyMode(p.PaymentMode))
	if p.TransactionRef != nil && *p.TransactionRef != "" {
		d.Body("Transaction Ref: " + *p.TransactionRef)
	}
	if p.Remarks != nil && *p.Remarks != "" {
		d.Body("Remarks: " + *p.Remarks)
	}
	d.Body("Status: " + strings.ToUpper(p.Status))

	d.Space(8)
	d.Italic("This is a computer-generated receipt.")
}

func feeName(p *model.FeePayment) string {
	if p.StudentFee != nil && p.StudentFee.FeeAllocation != nil && p.StudentFee.FeeAllocation.Name != "" {
		return p.StudentFee.FeeAllocation.Name
	}
	return "-"
}

func labelFor(labels map[string]string, installmentID *string) string {
	if labels == nil || installmentID == nil {
		return ""
	}
	return labels[*installmentID]
}

// prettyMode title-cases a payment mode, upper-casing short codes like "upi".
func prettyMode(mode string) string {
	if mode == "" {
		return "-"
	}
	if len(mode) <= 3 {
		return strings.ToUpper(mode)
	}
	return strings.ToUpper(mode[:1]) + mode[1:]
}
