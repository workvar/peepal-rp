package bulk

// Shared lookups and parsers for the fee bulk-upload schemas
// (fee_categories, fee_structures, fee_payments). Kept in one place so each
// schema file stays small and focused on its own columns.

import (
	"collegeerp/database"
	"collegeerp/models"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"gorm.io/gorm"
)

// feeRound2 rounds to 2 decimals, matching the resolver's money math.
func feeRound2(v float64) float64 { return math.Round(v*100) / 100 }

// splitList breaks a multi-entry cell into trimmed parts. Entries may be
// separated by a semicolon or a newline so users can paste either form.
func splitList(raw string) []string {
	raw = strings.ReplaceAll(raw, "\n", ";")
	out := make([]string, 0)
	for _, p := range strings.Split(raw, ";") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

// resolveFeeCourse finds a course by UUID, code, or name within the tenant.
func resolveFeeCourse(tenantID, raw string) (models.Course, error) {
	raw = strings.TrimSpace(raw)
	var course models.Course
	if raw == "" {
		return course, errors.New("course is blank")
	}
	if len(raw) == 36 {
		if err := database.DB.Where("id = ? AND tenant_id = ?", raw, tenantID).First(&course).Error; err == nil {
			return course, nil
		}
	}
	if err := database.DB.
		Where("tenant_id = ? AND (LOWER(code) = LOWER(?) OR LOWER(name) = LOWER(?))", tenantID, raw, raw).
		First(&course).Error; err != nil {
		return course, fmt.Errorf("course %q not found", raw)
	}
	return course, nil
}

// resolveFeeCategory finds a category by UUID, code, or name within the tenant.
func resolveFeeCategory(tenantID, raw string) (models.FeeCategory, error) {
	raw = strings.TrimSpace(raw)
	var cat models.FeeCategory
	if raw == "" {
		return cat, errors.New("fee category is blank")
	}
	if len(raw) == 36 {
		if err := database.DB.Where("id = ? AND tenant_id = ?", raw, tenantID).First(&cat).Error; err == nil {
			return cat, nil
		}
	}
	if err := database.DB.
		Where("tenant_id = ? AND (LOWER(code) = LOWER(?) OR LOWER(name) = LOWER(?))", tenantID, raw, raw).
		First(&cat).Error; err != nil {
		return cat, fmt.Errorf("fee category %q not found", raw)
	}
	return cat, nil
}

// resolveStudentForFee finds a student by roll number or by the email of their
// user account. roll_number is tried first; email is the fallback.
func resolveStudentForFee(tenantID, roll, email string) (models.Student, error) {
	var st models.Student
	roll = strings.TrimSpace(roll)
	email = strings.ToLower(strings.TrimSpace(email))
	if roll != "" {
		if err := database.DB.Where("tenant_id = ? AND roll_number = ?", tenantID, roll).First(&st).Error; err == nil {
			return st, nil
		}
	}
	if email != "" {
		var u models.User
		if err := database.DB.Where("tenant_id = ? AND email = ?", tenantID, email).First(&u).Error; err == nil {
			if err := database.DB.Where("tenant_id = ? AND user_id = ?", tenantID, u.ID).First(&st).Error; err == nil {
				return st, nil
			}
		}
	}
	return st, errors.New("student not found — check roll_number or student_email")
}

// resolveStudentFee picks the materialized StudentFee to pay against. When an
// allocation is named it matches that allocation; when blank it uses the
// student's only fee, erroring if they have none or several.
func resolveStudentFee(tenantID, studentID, allocRaw string) (models.StudentFee, error) {
	var sf models.StudentFee
	allocRaw = strings.TrimSpace(allocRaw)
	if allocRaw != "" {
		var alloc models.FeeAllocation
		q := database.DB.Where("tenant_id = ?", tenantID)
		if len(allocRaw) == 36 {
			q = q.Where("id = ?", allocRaw)
		} else {
			q = q.Where("LOWER(name) = LOWER(?)", allocRaw)
		}
		if err := q.First(&alloc).Error; err != nil {
			return sf, fmt.Errorf("fee allocation %q not found", allocRaw)
		}
		if err := database.DB.
			Where("tenant_id = ? AND student_id = ? AND fee_allocation_id = ?", tenantID, studentID, alloc.ID).
			First(&sf).Error; err != nil {
			return sf, errors.New("this student has no fee record for that allocation — sync the allocation first")
		}
		return sf, nil
	}
	var fees []models.StudentFee
	if err := database.DB.Where("tenant_id = ? AND student_id = ?", tenantID, studentID).Find(&fees).Error; err != nil {
		return sf, err
	}
	switch len(fees) {
	case 0:
		return sf, errors.New("no fee allocation covers this student — create one first")
	case 1:
		return fees[0], nil
	default:
		return sf, errors.New("student has multiple fees — set allocation to the allocation name")
	}
}

// parsedStructItem is one decoded line of a structure's items cell.
type parsedStructItem struct {
	categoryID string
	yearNumber int
	amount     float64
}

// parseStructureItems decodes the items cell. Each entry is
// "CODE:year:amount" ("CODE:amount" defaults to year 1), entries split by ";".
func parseStructureItems(tenantID, raw string) ([]parsedStructItem, error) {
	parts := splitList(raw)
	if len(parts) == 0 {
		return nil, errors.New("items is required (e.g. TUITION:1:50000; TUITION:2:55000; LIBRARY:1:2000)")
	}
	seen := map[string]bool{}
	out := make([]parsedStructItem, 0, len(parts))
	for _, p := range parts {
		fields := strings.Split(p, ":")
		if len(fields) < 2 || len(fields) > 3 {
			return nil, fmt.Errorf("item %q must be CODE:year:amount (or CODE:amount for year 1)", p)
		}
		cat, err := resolveFeeCategory(tenantID, fields[0])
		if err != nil {
			return nil, err
		}
		year := 1
		amountField := fields[1]
		if len(fields) == 3 {
			year = int(ParseFloat(fields[1]))
			if year < 1 {
				return nil, fmt.Errorf("year for %q must be 1 or higher", fields[0])
			}
			amountField = fields[2]
		}
		amount := ParseFloat(amountField)
		if amount <= 0 {
			return nil, fmt.Errorf("amount for %q must be greater than 0", fields[0])
		}
		key := fmt.Sprintf("%s#%d", cat.ID, year)
		if seen[key] {
			return nil, fmt.Errorf("category %q appears more than once for year %d", cat.Code, year)
		}
		seen[key] = true
		out = append(out, parsedStructItem{categoryID: cat.ID, yearNumber: year, amount: amount})
	}
	return out, nil
}

// nextFeeReceiptNumber mirrors the resolver: a per-tenant sequential receipt id.
func nextFeeReceiptNumber(tx *gorm.DB, tenantID string) string {
	var count int64
	tx.Model(&models.FeePayment{}).Where("tenant_id = ?", tenantID).Count(&count)
	return fmt.Sprintf("RCP-%s-%04d", time.Now().Format("20060102"), count+1)
}

// rebuildFeePaymentApplication replays every active payment for a student fee
// oldest-first, recomputing each installment's paid amount/status and the
// fee's paid amount/status. Mirrors the graph resolver's logic so bulk-recorded
// payments behave identically to ones entered through the UI.
func rebuildFeePaymentApplication(tx *gorm.DB, studentFeeID string) error {
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
		totalPaid = feeRound2(totalPaid + p.Amount)
		remaining := p.Amount
		if p.InstallmentID != nil {
			if i, ok := indexByID[*p.InstallmentID]; ok {
				paid[i] = feeRound2(paid[i] + remaining)
				continue
			}
		}
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
			paid[i] = feeRound2(paid[i] + take)
			remaining = feeRound2(remaining - take)
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
