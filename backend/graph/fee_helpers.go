package graph

// Pure model converters for the fee module. Database-backed fee operations
// (installment generation, student fee materialization, recompute, payment
// application) live in fee_logic.go.

import (
	"sort"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"
)

func feeCategoryToModel(c models.FeeCategory) *model.FeeCategory {
	return &model.FeeCategory{
		ID:          c.ID,
		Name:        c.Name,
		Code:        c.Code,
		Description: toStrPtr(c.Description),
		IsActive:    c.IsActive,
	}
}

func feeStructureItemToModel(it models.FeeStructureItem) *model.FeeStructureItem {
	m := &model.FeeStructureItem{
		ID:            it.ID,
		FeeCategoryID: it.FeeCategoryID,
		YearNumber:    it.YearNumber,
		Amount:        it.Amount,
	}
	if it.FeeCategory.ID != "" {
		m.FeeCategory = feeCategoryToModel(it.FeeCategory)
	}
	return m
}

// feeStructureToModel converts a structure; AllocationCount needs a database
// lookup and is attached by the resolvers.
func feeStructureToModel(fs models.FeeStructure) *model.FeeStructure {
	items := make([]*model.FeeStructureItem, len(fs.Items))
	yearTotals := map[int]float64{}
	total := 0.0
	for i, it := range fs.Items {
		items[i] = feeStructureItemToModel(it)
		yearTotals[it.YearNumber] = round2(yearTotals[it.YearNumber] + it.Amount)
		total = round2(total + it.Amount)
	}
	years := make([]int, 0, len(yearTotals))
	for y := range yearTotals {
		years = append(years, y)
	}
	sort.Ints(years)
	totals := make([]*model.FeeYearTotal, len(years))
	for i, y := range years {
		totals[i] = &model.FeeYearTotal{YearNumber: y, Amount: yearTotals[y]}
	}

	m := &model.FeeStructure{
		ID:          fs.ID,
		CourseID:    fs.CourseID,
		Name:        fs.Name,
		Code:        fs.Code,
		BatchID:     fs.BatchID,
		Description: toStrPtr(fs.Description),
		IsActive:    fs.IsActive,
		TotalAmount: total,
		YearTotals:  totals,
		Items:       items,
	}
	if fs.Course.ID != "" {
		m.Course = courseToModel(fs.Course)
	}
	if fs.Batch != nil && fs.Batch.ID != "" {
		m.Batch = courseBatchToModel(*fs.Batch)
	}
	return m
}

func feeAllocationInstallmentToModel(in models.FeeAllocationInstallment) *model.FeeAllocationInstallment {
	m := &model.FeeAllocationInstallment{
		ID:         in.ID,
		Sequence:   in.Sequence,
		Label:      in.Label,
		YearNumber: in.YearNumber,
		Amount:     in.Amount,
	}
	if !in.DueDate.IsZero() {
		d := in.DueDate.Format("2006-01-02")
		m.DueDate = &d
	}
	return m
}

// feeAllocationToModel converts an allocation without its target name and
// student count; those need database lookups and are attached by the
// resolvers via (*Resolver).feeAllocationToModelFull.
func feeAllocationToModel(a models.FeeAllocation) *model.FeeAllocation {
	installments := make([]*model.FeeAllocationInstallment, len(a.Installments))
	for i, in := range a.Installments {
		installments[i] = feeAllocationInstallmentToModel(in)
	}
	m := &model.FeeAllocation{
		ID:             a.ID,
		FeeStructureID: a.FeeStructureID,
		Name:           a.Name,
		Frequency:      a.Frequency,
		TargetType:     a.TargetType,
		TargetID:       a.TargetID,
		TotalAmount:    a.TotalAmount,
		IsActive:       a.IsActive,
		Installments:   installments,
	}
	if a.FeeStructure.ID != "" {
		m.FeeStructure = feeStructureToModel(a.FeeStructure)
	}
	return m
}

func studentFeeDiscountToModel(d models.StudentFeeDiscount) *model.StudentFeeDiscount {
	return &model.StudentFeeDiscount{
		ID:           d.ID,
		Label:        d.Label,
		DiscountType: d.DiscountType,
		Value:        d.Value,
		Amount:       d.Amount,
		Remarks:      toStrPtr(d.Remarks),
	}
}

func studentFeeInstallmentToModel(in models.StudentFeeInstallment) *model.StudentFeeInstallment {
	m := &model.StudentFeeInstallment{
		ID:         in.ID,
		Sequence:   in.Sequence,
		Label:      in.Label,
		Amount:     in.Amount,
		PaidAmount: in.PaidAmount,
		Status:     in.Status,
	}
	if !in.DueDate.IsZero() {
		d := in.DueDate.Format("2006-01-02")
		m.DueDate = &d
		m.IsOverdue = in.Status != models.FeeStatusPaid && time.Now().After(in.DueDate)
	}
	return m
}

func studentFeeToModel(sf models.StudentFee) *model.StudentFee {
	discounts := make([]*model.StudentFeeDiscount, len(sf.Discounts))
	for i, d := range sf.Discounts {
		discounts[i] = studentFeeDiscountToModel(d)
	}
	addOns := make([]*model.StudentFeeAddOn, len(sf.AddOns))
	for i, a := range sf.AddOns {
		addOns[i] = studentFeeAddOnToModel(a)
	}
	installments := make([]*model.StudentFeeInstallment, len(sf.Installments))
	for i, in := range sf.Installments {
		installments[i] = studentFeeInstallmentToModel(in)
	}
	m := &model.StudentFee{
		ID:              sf.ID,
		StudentID:       sf.StudentID,
		FeeAllocationID: sf.FeeAllocationID,
		GrossAmount:     sf.GrossAmount,
		DiscountAmount:  sf.DiscountAmount,
		NetAmount:       sf.NetAmount,
		PaidAmount:      sf.PaidAmount,
		Status:          sf.Status,
		Discounts:       discounts,
		AddOns:          addOns,
		Installments:    installments,
	}
	if sf.Student.ID != "" {
		m.Student = studentToModel(sf.Student)
	}
	if sf.FeeAllocation.ID != "" {
		m.FeeAllocation = feeAllocationToModel(sf.FeeAllocation)
	}
	return m
}

func feePaymentToModel(p models.FeePayment) *model.FeePayment {
	m := &model.FeePayment{
		ID:             p.ID,
		StudentFeeID:   p.StudentFeeID,
		StudentID:      p.StudentID,
		InstallmentID:  p.InstallmentID,
		Amount:         p.Amount,
		PaymentDate:    p.PaymentDate.Format("2006-01-02"),
		PaymentMode:    p.PaymentMode,
		TransactionRef: toStrPtr(p.TransactionRef),
		Status:         p.Status,
		Remarks:        toStrPtr(p.Remarks),
		ReceivedBy:     toStrPtr(p.ReceivedBy),
		ReceiptNumber:  p.ReceiptNumber,
	}
	if p.Student.ID != "" {
		m.Student = studentToModel(p.Student)
	}
	if p.StudentFee.ID != "" {
		m.StudentFee = studentFeeToModel(p.StudentFee)
	}
	return m
}
