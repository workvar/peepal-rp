package pdftemplate

// Purchase order PDF for emailing suppliers: vendor block, line table, totals,
// and a verification QR (Phase 1) stamped top-right.

import (
	"fmt"

	"collegeerp/graph/model"
	"collegeerp/qrcode"
)

// BuildPurchaseOrderPDF renders a purchase order. tenantID is used only to
// build the verification QR payload.
func BuildPurchaseOrderPDF(institute, tenantID string, po *model.PurchaseOrder) ([]byte, error) {
	d := NewDoc()

	if tenantID != "" && po.ID != "" {
		d.QRTopRight(qrcode.VerifyURL("", tenantID, qrcode.KindPO, po.ID), 22)
	}

	if institute != "" {
		d.H1(institute)
		d.H2("Purchase Order")
	} else {
		d.H1("Purchase Order")
	}

	d.Body("PO Number: " + po.PoNumber)
	if po.OrderDate != nil && *po.OrderDate != "" {
		d.Body("Order Date: " + *po.OrderDate)
	}
	if po.ExpectedDate != nil && *po.ExpectedDate != "" {
		d.Body("Expected: " + *po.ExpectedDate)
	}
	d.Body("Status: " + po.Status)

	d.Space(3)
	d.H3("Vendor")
	if po.Vendor != nil {
		d.Body(po.Vendor.Name)
		if po.Vendor.Address != nil && *po.Vendor.Address != "" {
			d.Muted(*po.Vendor.Address)
		}
		if po.Vendor.Gstin != nil && *po.Vendor.Gstin != "" {
			d.Muted("GSTIN: " + *po.Vendor.Gstin)
		}
	} else {
		d.Muted("-")
	}

	d.Space(3)
	d.H3("Items")
	for _, it := range po.Items {
		line := fmt.Sprintf("%s  —  %g x %s = %s",
			it.ItemName, it.Qty, rupees(it.UnitCost), rupees(it.LineTotal))
		d.Body(line)
	}

	d.Divider()
	d.Body("Subtotal: " + rupees(po.Subtotal))
	d.Body("Tax: " + rupees(po.TaxTotal))
	d.H3("Total: " + rupees(po.Total))

	if po.Notes != nil && *po.Notes != "" {
		d.Space(3)
		d.H3("Notes")
		d.Body(*po.Notes)
	}

	d.Space(8)
	d.Italic("This is a computer-generated purchase order.")
	return d.Bytes()
}
