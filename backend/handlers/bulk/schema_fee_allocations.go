package bulk

import (
	"collegeerp/database"
	"collegeerp/models"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"
)

// Fee allocations apply a course fee structure to students with a payment
// schedule (one-time, yearly, or semester-wise). Installments are
// auto-generated from the structure's per-year amounts, and a StudentFee is
// materialized for every covered student. One row = one allocation. This
// mirrors the createFeeAllocation GraphQL resolver so bulk-created allocations
// behave identically to ones made in the UI.
var feeAllocationsSchema = &Schema{
	Resource: "fee_allocations",
	Title:    "Fee Allocations",
	Description: "Create fee allocations in bulk. Each row applies one fee structure to students with a " +
		"payment plan, and immediately generates a fee record for every covered student.\n\n" +
		"Pick the structure by code or name, choose how students pay (frequency), and who it applies to " +
		"(the whole course, one batch, or a single student). Installments are generated automatically: " +
		"one_time = a single payment, yearly = one per course year, semester = each year split across its " +
		"semesters. The structure (and its course) must already exist.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "structure", Label: "Fee Structure", Type: FieldString, Required: true,
			Description: "Fee structure code, name, or UUID (e.g. the course's Base Plan).",
			Example:     "BTCSE-BASE",
		},
		{
			Name: "frequency", Label: "Frequency", Type: FieldEnum, Required: true,
			AllowedValues: []string{"one_time", "yearly", "semester"},
			Description:   "How students pay: one_time (all at once), yearly, or semester-wise.",
			Example:       "yearly",
		},
		{
			Name: "target_type", Label: "Applies To", Type: FieldEnum, Required: true,
			AllowedValues: []string{"course", "batch", "student"},
			Description:   "Who the allocation covers.",
			Example:       "course",
		},
		{
			Name: "target", Label: "Target", Type: FieldString,
			Description: "For course: leave blank (uses the structure's course) or give a course code/name. " +
				"For batch: the batch name. For student: roll number or email.",
			Example: "",
		},
		{
			Name: "name", Label: "Name", Type: FieldString,
			Description: "Optional allocation name. Auto-generated from the course, structure, and frequency if blank.",
			Example:     "",
		},
		{
			Name: "first_due_date", Label: "First Due Date", Type: FieldDate,
			Description: "Due date of the first installment (YYYY-MM-DD). Later slots are spaced by frequency. Optional.",
			Example:     "2026-07-15",
		},
	},
	ExampleRows: [][]string{
		{"BTCSE-BASE", "yearly", "course", "", "", "2026-07-15"},
	},
	Create: createFeeAllocationRow,
}

// resolveFeeStructureForAlloc finds a structure (with items + course) by code,
// name, or UUID.
func resolveFeeStructureForAlloc(tenantID, raw string) (models.FeeStructure, error) {
	raw = strings.TrimSpace(raw)
	var fs models.FeeStructure
	if raw == "" {
		return fs, errors.New("structure is blank")
	}
	base := database.DB.Preload("Items").Preload("Course")
	if len(raw) == 36 {
		if err := base.Where("id = ? AND tenant_id = ?", raw, tenantID).First(&fs).Error; err == nil {
			return fs, nil
		}
	}
	if err := base.
		Where("tenant_id = ? AND (LOWER(code) = LOWER(?) OR LOWER(name) = LOWER(?))", tenantID, raw, raw).
		First(&fs).Error; err != nil {
		return fs, fmt.Errorf("fee structure %q not found", raw)
	}
	return fs, nil
}

// resolveAllocationTarget validates the target cell against the target type and
// returns the target UUID to store on the allocation.
func resolveAllocationTarget(tenantID, targetType, raw string, fs models.FeeStructure) (string, error) {
	raw = strings.TrimSpace(raw)
	switch targetType {
	case models.FeeTargetCourse:
		if raw == "" {
			return fs.CourseID, nil
		}
		course, err := resolveFeeCourse(tenantID, raw)
		if err != nil {
			return "", err
		}
		return course.ID, nil
	case models.FeeTargetBatch:
		if raw == "" {
			return "", errors.New("target is required for a batch allocation (give the batch name)")
		}
		var batch models.CourseBatch
		q := database.DB.Where("tenant_id = ? AND course_id = ?", tenantID, fs.CourseID)
		if len(raw) == 36 {
			q = q.Where("id = ?", raw)
		} else {
			q = q.Where("LOWER(name) = LOWER(?)", raw)
		}
		if err := q.First(&batch).Error; err != nil {
			return "", fmt.Errorf("batch %q not found under the structure's course", raw)
		}
		return batch.ID, nil
	case models.FeeTargetStudent:
		if raw == "" {
			return "", errors.New("target is required for a student allocation (give roll number or email)")
		}
		st, err := resolveStudentForFee(tenantID, raw, raw)
		if err != nil {
			return "", err
		}
		return st.ID, nil
	}
	return "", errors.New("target_type must be course, batch, or student")
}

// buildAllocationInstallmentsBulk mirrors the resolver's auto-generation:
// one_time = single slot, yearly = one per course year, semester = each year
// split across its semesters. Due dates start at firstDue, spaced by frequency.
func buildAllocationInstallmentsBulk(fs models.FeeStructure, frequency string, firstDue time.Time) ([]models.FeeAllocationInstallment, float64, error) {
	yearTotals := map[int]float64{}
	total := 0.0
	for _, it := range fs.Items {
		yearTotals[it.YearNumber] = feeRound2(yearTotals[it.YearNumber] + it.Amount)
		total = feeRound2(total + it.Amount)
	}
	if total <= 0 {
		return nil, 0, errors.New("the structure has no fee amounts")
	}
	years := make([]int, 0, len(yearTotals))
	for y := range yearTotals {
		years = append(years, y)
	}
	sort.Ints(years)

	var out []models.FeeAllocationInstallment
	add := func(label string, year int, due time.Time, amount float64) {
		out = append(out, models.FeeAllocationInstallment{
			TenantID:   fs.TenantID,
			Sequence:   len(out) + 1,
			Label:      label,
			YearNumber: year,
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
		add("Full Payment", 0, firstDue, total)
	case models.FeeFreqYearly:
		for i, y := range years {
			if yearTotals[y] <= 0 {
				continue
			}
			add(fmt.Sprintf("Year %d", y), y, step(12*i), yearTotals[y])
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
			for sIdx := 0; sIdx < semPerYear; sIdx++ {
				semester++
				amount := feeRound2(yt / float64(semPerYear))
				if sIdx == semPerYear-1 {
					amount = feeRound2(yt - assigned)
				}
				assigned = feeRound2(assigned + amount)
				add(fmt.Sprintf("Semester %d", semester), y, step(12*i+monthsPerSem*sIdx), amount)
			}
		}
	default:
		return nil, 0, errors.New("frequency must be one_time, yearly, or semester")
	}
	if len(out) == 0 {
		return nil, 0, errors.New("no installments could be generated from the structure")
	}
	return out, total, nil
}

// allocationStudents returns the students an allocation covers.
func allocationStudents(tenantID, targetType, targetID string) ([]models.Student, error) {
	q := database.DB.Where("students.tenant_id = ?", tenantID)
	switch targetType {
	case models.FeeTargetCourse:
		q = q.Where("students.course_id = ?", targetID)
	case models.FeeTargetBatch:
		var batch models.CourseBatch
		if err := database.DB.Where("id = ? AND tenant_id = ?", targetID, tenantID).First(&batch).Error; err != nil {
			return nil, errors.New("batch not found")
		}
		// Trimmed, case-insensitive batch match so a stray space or case
		// difference does not silently exclude the whole cohort.
		q = q.Where("students.course_id = ? AND LOWER(TRIM(students.batch)) = LOWER(TRIM(?))", batch.CourseID, batch.Name)
	case models.FeeTargetStudent:
		q = q.Where("students.id = ?", targetID)
	}
	var students []models.Student
	if err := q.Find(&students).Error; err != nil {
		return nil, err
	}
	return students, nil
}

func feeFreqLabelBulk(freq string) string {
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

func createFeeAllocationRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	fs, err := resolveFeeStructureForAlloc(ctx.TenantID, row["structure"])
	if err != nil {
		return "", err
	}
	if !fs.IsActive {
		return "", errors.New("structure is inactive")
	}

	frequency := strings.ToLower(strings.TrimSpace(row["frequency"]))
	targetType := strings.ToLower(strings.TrimSpace(row["target_type"]))

	targetID, err := resolveAllocationTarget(ctx.TenantID, targetType, row["target"], fs)
	if err != nil {
		return "", err
	}

	var firstDue time.Time
	if d := ParseDate(row["first_due_date"]); !d.IsZero() {
		firstDue = d
	}

	installments, total, err := buildAllocationInstallmentsBulk(fs, frequency, firstDue)
	if err != nil {
		return "", err
	}

	name := strings.TrimSpace(row["name"])
	if name == "" {
		name = fmt.Sprintf("%s - %s (%s)", fs.Course.Name, fs.Name, feeFreqLabelBulk(frequency))
	}

	alloc := models.FeeAllocation{
		TenantID:       ctx.TenantID,
		FeeStructureID: fs.ID,
		Name:           name,
		Frequency:      frequency,
		TargetType:     targetType,
		TargetID:       targetID,
		TotalAmount:    total,
		IsActive:       true,
		CreatedBy:      ctx.ActorID,
	}

	students, err := allocationStudents(ctx.TenantID, targetType, targetID)
	if err != nil {
		return "", err
	}

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&alloc).Error; err != nil {
			return err
		}
		for i := range installments {
			installments[i].FeeAllocationID = alloc.ID
			if err := tx.Create(&installments[i]).Error; err != nil {
				return err
			}
		}
		for _, st := range students {
			var existing int64
			tx.Model(&models.StudentFee{}).
				Where("tenant_id = ? AND student_id = ? AND fee_allocation_id = ?", ctx.TenantID, st.ID, alloc.ID).
				Count(&existing)
			if existing > 0 {
				continue
			}
			sf := models.StudentFee{
				TenantID:        ctx.TenantID,
				StudentID:       st.ID,
				FeeAllocationID: alloc.ID,
				GrossAmount:     total,
				NetAmount:       total,
				Status:          models.FeeStatusPending,
			}
			if err := tx.Create(&sf).Error; err != nil {
				return err
			}
			for _, in := range installments {
				si := models.StudentFeeInstallment{
					TenantID:     ctx.TenantID,
					StudentFeeID: sf.ID,
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
		}
		return nil
	})
	if err != nil {
		return "", err
	}
	return alloc.ID, nil
}

func init() { Register(feeAllocationsSchema) }
