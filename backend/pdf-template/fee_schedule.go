package pdftemplate

// Fee payment schedule PDF: an overview of totals followed by every fee with
// its installment plan, discounts, and add-ons. Built from the GraphQL fee
// model returned by the student "My Fees" query.

import (
	"fmt"
	"math"
	"strings"
	"time"

	"collegeerp/graph/model"
)

// BuildFeeSchedulePDF renders a student's full fee schedule.
func BuildFeeSchedulePDF(meta FeeMeta, fees []*model.StudentFee) ([]byte, error) {
	d := NewDoc()

	if meta.Institute != "" {
		d.H1(meta.Institute)
		d.H2("Fee Payment Schedule")
	} else {
		d.H1("Fee Payment Schedule")
	}
	d.Body("Student: " + meta.StudentName + " (" + meta.RollNumber + ")")
	d.Body("Course: " + meta.CourseName)
	d.Body("Generated: " + time.Now().Format("2006-01-02"))

	writeScheduleOverview(d, fees)
	for _, fee := range fees {
		writeScheduleFee(d, fee)
	}

	d.Space(10)
	d.Italic("This is a computer-generated schedule.")
	return d.Bytes()
}

func writeScheduleOverview(d *Doc, fees []*model.StudentFee) {
	var payable, paid float64
	for _, f := range fees {
		payable += f.NetAmount
		paid += f.PaidAmount
	}
	payable = round2(payable)
	paid = round2(paid)

	d.Space(6)
	d.H3("Overview")
	d.Body("Total Payable: " + rupees(payable))
	d.Body("Total Paid: " + rupees(paid))
	d.Body("Total Due: " + rupees(round2(payable-paid)))
}

func writeScheduleFee(d *Doc, fee *model.StudentFee) {
	due := round2(fee.NetAmount - fee.PaidAmount)

	d.Space(6)
	d.H2(allocationName(fee))
	d.Body(fmt.Sprintf(
		"Status: %s  |  Payable: %s  |  Paid: %s  |  Due: %s",
		strings.ToUpper(fee.Status), rupees(fee.NetAmount), rupees(fee.PaidAmount), rupees(due),
	))

	if fee.DiscountAmount > 0 && len(fee.Discounts) > 0 {
		parts := make([]string, 0, len(fee.Discounts))
		for _, dsc := range fee.Discounts {
			parts = append(parts, fmt.Sprintf("%s (-%s)", dsc.Label, rupees(dsc.Amount)))
		}
		d.Body("Discounts: " + strings.Join(parts, ", "))
	}
	if len(fee.AddOns) > 0 {
		parts := make([]string, 0, len(fee.AddOns))
		for _, a := range fee.AddOns {
			parts = append(parts, fmt.Sprintf("%s Y%d (+%s)", addOnName(a), a.YearNumber, rupees(a.Amount)))
		}
		d.Body("Add-ons: " + strings.Join(parts, ", "))
	}

	d.H3("Installments")
	for _, i := range fee.Installments {
		overdue := ""
		if i.IsOverdue {
			overdue = "  (OVERDUE)"
		}
		d.Body(fmt.Sprintf(
			"%d. %s   Due %s   Amount %s   Paid %s   %s%s",
			i.Sequence, i.Label, dueDate(i.DueDate),
			rupees(i.Amount), rupees(i.PaidAmount), strings.ToUpper(i.Status), overdue,
		))
	}
}

func allocationName(fee *model.StudentFee) string {
	if fee.FeeAllocation != nil && fee.FeeAllocation.Name != "" {
		return fee.FeeAllocation.Name
	}
	return "Fee"
}

func addOnName(a *model.StudentFeeAddOn) string {
	if a.FeeAddOn != nil && a.FeeAddOn.Name != "" {
		return a.FeeAddOn.Name
	}
	return "Add-on"
}

func dueDate(d *string) string {
	if d == nil || *d == "" {
		return "-"
	}
	return *d
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
