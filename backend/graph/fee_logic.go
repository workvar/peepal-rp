package graph

// Database-backed fee domain operations shared by the fee resolvers:
// auto-generating installment schedules, resolving allocation targets,
// materializing student fees, recomputing totals after discount changes,
// and applying payments to installments.

import (
	"context"
	"fmt"
	"math"
	"sort"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

// structureYearTotals sums a structure's items per course year. Returns the
// per-year totals, the sorted list of years, and the grand total.
func structureYearTotals(fs models.FeeStructure) (map[int]float64, []int, float64) {
	totals := map[int]float64{}
	grand := 0.0
	for _, it := range fs.Items {
		totals[it.YearNumber] = round2(totals[it.YearNumber] + it.Amount)
		grand = round2(grand + it.Amount)
	}
	years := make([]int, 0, len(totals))
	for y := range totals {
		years = append(years, y)
	}
	sort.Ints(years)
	return totals, years, grand
}

// feeFrequencyLabel returns a human label for an allocation frequency.
func feeFrequencyLabel(freq string) string {
	switch freq {
	case models.FeeFreqOneTime:
		return "One-time"
	case models.FeeFreqYearly:
		return "Yearly"
	case models.FeeFreqSemester:
		return "Semester-wise"
	}
	return freq
}

// buildAllocationInstallments generates an installment schedule from the
// structure's per-year amounts and the chosen frequency:
//   - one_time:  one slot for the full course total
//   - yearly:    one slot per course year, amount = that year's total
//   - semester:  the year total split evenly across the year's semesters
//
// Due dates start at firstDue and are spaced by the frequency. If overrides
// are supplied they replace auto-generation entirely (amounts must still sum
// to the structure total).
func buildAllocationInstallments(fs models.FeeStructure, frequency string, firstDue time.Time, overrides []*model.FeeAllocationInstallmentInput) ([]models.FeeAllocationInstallment, float64, error) {
	yearTotals, years, total := structureYearTotals(fs)
	if total <= 0 {
		return nil, 0, GQLErr("the structure has no fee amounts")
	}

	if len(overrides) > 0 {
		return buildOverrideInstallments(fs.TenantID, total, overrides)
	}

	var out []models.FeeAllocationInstallment
	addSlot := func(label string, yearNumber int, due time.Time, amount float64) {
		out = append(out, models.FeeAllocationInstallment{
			TenantID:   fs.TenantID,
			Sequence:   len(out) + 1,
			Label:      label,
			YearNumber: yearNumber,
			DueDate:    due,
			Amount:     amount,
		})
	}
	step := func(months int) time.Time {
		if firstDue.IsZero() {
			return time.Time{}
		}
		return firstDue.AddDate(0, months, 0)
	}

	switch frequency {
	case models.FeeFreqOneTime:
		addSlot("Full Payment", 0, firstDue, total)

	case models.FeeFreqYearly:
		for i, y := range years {
			if yearTotals[y] <= 0 {
				continue
			}
			addSlot(fmt.Sprintf("Year %d", y), y, step(12*i), yearTotals[y])
		}

	case models.FeeFreqSemester:
		semPerYear := 2
		if fs.Course.TotalSemesters > 0 && len(years) > 0 {
			if s := fs.Course.TotalSemesters / len(years); s > 0 {
				semPerYear = s
			}
		}
		monthsPerSem := 12 / semPerYear
		semester := 0
		for i, y := range years {
			yt := yearTotals[y]
			if yt <= 0 {
				semester += semPerYear
				continue
			}
			assigned := 0.0
			for s := 0; s < semPerYear; s++ {
				semester++
				amount := round2(yt / float64(semPerYear))
				if s == semPerYear-1 {
					amount = round2(yt - assigned)
				}
				assigned = round2(assigned + amount)
				addSlot(fmt.Sprintf("Semester %d", semester), y, step(12*i+monthsPerSem*s), amount)
			}
		}

	default:
		return nil, 0, GQLErr("frequency must be one_time, yearly, or semester")
	}

	if len(out) == 0 {
		return nil, 0, GQLErr("no installments could be generated from the structure")
	}
	return out, total, nil
}

// buildOverrideInstallments validates a custom schedule against the structure
// total.
func buildOverrideInstallments(tenantID string, total float64, inputs []*model.FeeAllocationInstallmentInput) ([]models.FeeAllocationInstallment, float64, error) {
	var out []models.FeeAllocationInstallment
	sum := 0.0
	for i, in := range inputs {
		if in.Amount <= 0 {
			return nil, 0, GQLErr("installment amounts must be greater than zero")
		}
		var due time.Time
		if in.DueDate != nil && *in.DueDate != "" {
			d, err := time.Parse("2006-01-02", *in.DueDate)
			if err != nil {
				return nil, 0, GQLErr("installment due dates must be YYYY-MM-DD")
			}
			due = d
		}
		sum = round2(sum + in.Amount)
		out = append(out, models.FeeAllocationInstallment{
			TenantID:   tenantID,
			Sequence:   i + 1,
			Label:      in.Label,
			YearNumber: intVal(in.YearNumber),
			DueDate:    due,
			Amount:     in.Amount,
		})
	}
	if sum != total {
		return nil, 0, GQLErr(fmt.Sprintf("installments add up to %.2f but the structure total is %.2f", sum, total))
	}
	return out, total, nil
}

// resolveAllocationStudents returns the active students an allocation covers.
func (r *Resolver) resolveAllocationStudents(ctx context.Context, tenantID string, a models.FeeAllocation) ([]models.Student, error) {
	q := r.DB.WithContext(ctx).Where("students.tenant_id = ?", tenantID)
	switch a.TargetType {
	case models.FeeTargetCourse:
		q = q.Where("students.course_id = ?", a.TargetID)
	case models.FeeTargetBatch:
		var batch models.CourseBatch
		if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", a.TargetID, tenantID).First(&batch).Error; err != nil {
			return nil, GQLErr("batch not found")
		}
		// Match the student's free-text batch to the batch name leniently
		// (trimmed, case-insensitive) so a stray space or case difference does
		// not silently exclude the whole cohort.
		q = q.Where("students.course_id = ? AND LOWER(TRIM(students.batch)) = LOWER(TRIM(?))", batch.CourseID, batch.Name)
	case models.FeeTargetStudent:
		q = q.Where("students.id = ?", a.TargetID)
	default:
		return nil, GQLErr("targetType must be course, batch, or student")
	}
	var students []models.Student
	if err := q.Find(&students).Error; err != nil {
		return nil, err
	}
	return students, nil
}

// generateStudentFees materializes a StudentFee (with installments) for every
// covered student that does not already have one for the allocation. Returns
// the number of records created.
func (r *Resolver) generateStudentFees(ctx context.Context, tx *gorm.DB, a models.FeeAllocation) (int, error) {
	students, err := r.resolveAllocationStudents(ctx, a.TenantID, a)
	if err != nil {
		return 0, err
	}
	created := 0
	for _, st := range students {
		var existing int64
		tx.Model(&models.StudentFee{}).
			Where("tenant_id = ? AND student_id = ? AND fee_allocation_id = ?", a.TenantID, st.ID, a.ID).
			Count(&existing)
		if existing > 0 {
			continue
		}
		sf := models.StudentFee{
			TenantID:        a.TenantID,
			StudentID:       st.ID,
			FeeAllocationID: a.ID,
			GrossAmount:     a.TotalAmount,
			NetAmount:       a.TotalAmount,
			Status:          models.FeeStatusPending,
		}
		if err := tx.Create(&sf).Error; err != nil {
			return created, err
		}
		for _, in := range a.Installments {
			si := models.StudentFeeInstallment{
				TenantID:     a.TenantID,
				StudentFeeID: sf.ID,
				Sequence:     in.Sequence,
				Label:        in.Label,
				YearNumber:   in.YearNumber,
				DueDate:      in.DueDate,
				Amount:       in.Amount,
				Status:       models.FeeStatusPending,
			}
			if err := tx.Create(&si).Error; err != nil {
				return created, err
			}
		}
		created++
	}
	return created, nil
}

// resyncUnpaidStudentFees replaces the installment schedules of all student
// fees under an allocation that have no payments, after the allocation's
// schedule changed. Student fees with payments are left untouched.
func (r *Resolver) resyncUnpaidStudentFees(tx *gorm.DB, a models.FeeAllocation) error {
	var fees []models.StudentFee
	if err := tx.Where("fee_allocation_id = ? AND paid_amount = 0", a.ID).Find(&fees).Error; err != nil {
		return err
	}
	for i := range fees {
		if err := tx.Where("student_fee_id = ?", fees[i].ID).
			Delete(&models.StudentFeeInstallment{}).Error; err != nil {
			return err
		}
		for _, in := range a.Installments {
			si := models.StudentFeeInstallment{
				TenantID:     a.TenantID,
				StudentFeeID: fees[i].ID,
				Sequence:     in.Sequence,
				Label:        in.Label,
				YearNumber:   in.YearNumber,
				DueDate:      in.DueDate,
				Amount:       in.Amount,
				Status:       models.FeeStatusPending,
			}
			if err := tx.Create(&si).Error; err != nil {
				return err
			}
		}
		if err := r.recomputeStudentFee(tx, &fees[i]); err != nil {
			return err
		}
	}
	return nil
}

// recomputeStudentFee re-derives the fee from first principles: base amounts
// from the allocation schedule, plus the student's per-year add-ons layered
// onto the matching year's installments, minus discounts (scaled
// proportionally). Callers that change money after payments exist must
// validate the new net against PaidAmount first, then replay payments via
// rebuildPaymentApplication.
func (r *Resolver) recomputeStudentFee(tx *gorm.DB, sf *models.StudentFee) error {
	var alloc models.FeeAllocation
	if err := tx.Where("id = ?", sf.FeeAllocationID).First(&alloc).Error; err != nil {
		return err
	}
	var allocInstallments []models.FeeAllocationInstallment
	if err := tx.Where("fee_allocation_id = ?", sf.FeeAllocationID).Order("sequence").Find(&allocInstallments).Error; err != nil {
		return err
	}
	var installments []models.StudentFeeInstallment
	if err := tx.Where("student_fee_id = ?", sf.ID).Order("sequence").Find(&installments).Error; err != nil {
		return err
	}
	var addOns []models.StudentFeeAddOn
	if err := tx.Where("student_fee_id = ?", sf.ID).Find(&addOns).Error; err != nil {
		return err
	}
	var discounts []models.StudentFeeDiscount
	if err := tx.Where("student_fee_id = ?", sf.ID).Find(&discounts).Error; err != nil {
		return err
	}

	// Base amount per installment (from the allocation template).
	base := make([]float64, len(installments))
	year := make([]int, len(installments))
	for i := range installments {
		base[i] = installments[i].Amount
		year[i] = installments[i].YearNumber
		if i < len(allocInstallments) {
			base[i] = allocInstallments[i].Amount
			year[i] = allocInstallments[i].YearNumber
		}
	}

	// Layer add-ons: each add-on year's amount is split evenly across that
	// year's installments; if the schedule has no slot for that year (e.g.
	// one-time plans), it lands on the last installment.
	extra := make([]float64, len(installments))
	addOnTotal := 0.0
	for _, ao := range addOns {
		addOnTotal = round2(addOnTotal + ao.Amount)
		slots := []int{}
		for i := range installments {
			if year[i] == ao.YearNumber {
				slots = append(slots, i)
			}
		}
		if len(slots) == 0 {
			if len(installments) > 0 {
				extra[len(installments)-1] = round2(extra[len(installments)-1] + ao.Amount)
			}
			continue
		}
		assigned := 0.0
		for j, i := range slots {
			amt := round2(ao.Amount / float64(len(slots)))
			if j == len(slots)-1 {
				amt = round2(ao.Amount - assigned)
			}
			assigned = round2(assigned + amt)
			extra[i] = round2(extra[i] + amt)
		}
	}

	gross := round2(alloc.TotalAmount + addOnTotal)
	discountTotal := 0.0
	for _, d := range discounts {
		discountTotal += d.Amount
	}
	if discountTotal > gross {
		return GQLErr("total discount exceeds the fee amount")
	}
	sf.GrossAmount = gross
	sf.DiscountAmount = round2(discountTotal)
	sf.NetAmount = round2(gross - discountTotal)

	ratio := 1.0
	if gross > 0 {
		ratio = sf.NetAmount / gross
	}
	assigned := 0.0
	for i := range installments {
		amount := round2((base[i] + extra[i]) * ratio)
		if i == len(installments)-1 {
			amount = round2(sf.NetAmount - assigned)
		}
		assigned = round2(assigned + amount)
		if err := tx.Model(&installments[i]).Updates(map[string]interface{}{
			"amount":      amount,
			"year_number": year[i],
		}).Error; err != nil {
			return err
		}
	}
	return tx.Model(sf).Updates(map[string]interface{}{
		"gross_amount":    sf.GrossAmount,
		"discount_amount": sf.DiscountAmount,
		"net_amount":      sf.NetAmount,
	}).Error
}

// rebuildPaymentApplication recomputes installment paid amounts and statuses
// from scratch by replaying all active payments oldest-first. Used after
// recording or cancelling a payment so reversal is always consistent.
func (r *Resolver) rebuildPaymentApplication(tx *gorm.DB, studentFeeID string) error {
	var sf models.StudentFee
	if err := tx.Where("id = ?", studentFeeID).First(&sf).Error; err != nil {
		return err
	}
	var installments []models.StudentFeeInstallment
	if err := tx.Where("student_fee_id = ?", studentFeeID).Order("sequence").Find(&installments).Error; err != nil {
		return err
	}
	var payments []models.FeePayment
	if err := tx.Where("student_fee_id = ? AND status = ?", studentFeeID, "paid").
		Order("payment_date ASC, created_at ASC").Find(&payments).Error; err != nil {
		return err
	}

	paid := make([]float64, len(installments))
	indexByID := map[string]int{}
	for i, in := range installments {
		indexByID[in.ID] = i
	}
	totalPaid := 0.0
	for _, p := range payments {
		totalPaid = round2(totalPaid + p.Amount)
		remaining := p.Amount
		if p.InstallmentID != nil {
			if i, ok := indexByID[*p.InstallmentID]; ok {
				paid[i] = round2(paid[i] + remaining)
				continue
			}
		}
		// Oldest-first application; any excess lands on the last installment.
		for i := range installments {
			if remaining <= 0 {
				break
			}
			capacity := installments[i].Amount - paid[i]
			if capacity <= 0 && i < len(installments)-1 {
				continue
			}
			take := math.Min(remaining, capacity)
			if i == len(installments)-1 {
				take = remaining
			}
			paid[i] = round2(paid[i] + take)
			remaining = round2(remaining - take)
		}
	}

	for i := range installments {
		status := models.FeeStatusPending
		if paid[i] >= installments[i].Amount-0.005 && installments[i].Amount > 0 {
			status = models.FeeStatusPaid
		} else if paid[i] > 0 {
			status = models.FeeStatusPartial
		}
		if err := tx.Model(&installments[i]).Updates(map[string]interface{}{
			"paid_amount": paid[i],
			"status":      status,
		}).Error; err != nil {
			return err
		}
	}

	status := models.FeeStatusPending
	if totalPaid >= sf.NetAmount-0.005 && sf.NetAmount > 0 {
		status = models.FeeStatusPaid
	} else if totalPaid > 0 {
		status = models.FeeStatusPartial
	}
	return tx.Model(&sf).Updates(map[string]interface{}{
		"paid_amount": totalPaid,
		"status":      status,
	}).Error
}

// nextReceiptNumber generates a per-tenant sequential receipt number.
func (r *Resolver) nextReceiptNumber(tx *gorm.DB, tenantID string) string {
	var count int64
	tx.Model(&models.FeePayment{}).Where("tenant_id = ?", tenantID).Count(&count)
	return fmt.Sprintf("RCP-%s-%04d", time.Now().Format("20060102"), count+1)
}
