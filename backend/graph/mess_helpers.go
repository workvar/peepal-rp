package graph

import (
	"context"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// Loading, validation and mapping helpers for the mess module.

func validMeal(meal string) bool {
	switch meal {
	case models.MealBreakfast, models.MealLunch, models.MealSnacks, models.MealDinner:
		return true
	}
	return false
}

// messCategoryOr defaults a blank category to "other" so summaries never
// group under an empty label.
func messCategoryOr(c *string) string {
	if c == nil || *c == "" {
		return models.MessExpenseOther
	}
	return *c
}

func listMessMenu(q *gorm.DB) ([]*model.MessMenu, error) {
	var rows []models.MessMenu
	if err := q.Order("day_of_week ASC, meal ASC").Limit(500).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.MessMenu, len(rows))
	for i, row := range rows {
		out[i] = messMenuToModel(row)
	}
	return out, nil
}

func messMenuToModel(m models.MessMenu) *model.MessMenu {
	return &model.MessMenu{
		ID:              m.ID,
		DayOfWeek:       m.DayOfWeek,
		Meal:            m.Meal,
		Items:           toStrPtr(m.Items),
		HostelBlockID:   toStrPtr(m.HostelBlockID),
		HostelBlockName: toStrPtr(m.HostelBlock.Name),
		CreatedAt:       rfc3339OrNil(m.CreatedAt),
	}
}

// activeHostelBlockID resolves the block a student currently lives in, or ""
// for a day scholar (which then reads the campus-wide menu).
func activeHostelBlockID(db *gorm.DB, ctx context.Context, tenantID, studentID string) string {
	var alloc models.HostelAllocation
	if err := db.WithContext(ctx).Preload("Room").
		Where("tenant_id = ? AND student_id = ? AND status = ?", tenantID, studentID, "active").
		First(&alloc).Error; err != nil {
		return ""
	}
	return alloc.Room.BlockID
}

// messRosterStudents lists the students the meal roster should show: all
// active students, or only the residents of one block when a block is given.
func messRosterStudents(db *gorm.DB, ctx context.Context, tenantID, blockID string) ([]models.Student, error) {
	q := db.WithContext(ctx).Preload("User").
		Where("students.tenant_id = ? AND students.admission_status = ?", tenantID, "active")
	if blockID != "" {
		q = q.Joins("JOIN hostel_allocations ON hostel_allocations.student_id = students.id AND hostel_allocations.status = 'active'").
			Joins("JOIN hostel_rooms ON hostel_rooms.id = hostel_allocations.room_id").
			Where("hostel_rooms.block_id = ?", blockID)
	}
	var students []models.Student
	if err := q.Order("students.roll_number ASC").Limit(2000).Find(&students).Error; err != nil {
		return nil, err
	}
	return students, nil
}

func messExpenseQuery(db *gorm.DB, ctx context.Context, tenantID string, from, to, category *string) *gorm.DB {
	q := db.WithContext(ctx).Where("tenant_id = ?", tenantID)
	if from != nil && *from != "" {
		q = q.Where("date >= ?", *from)
	}
	if to != nil && *to != "" {
		q = q.Where("date <= ?", *to)
	}
	if category != nil && *category != "" {
		q = q.Where("category = ?", *category)
	}
	return q
}

// validateMessExpense checks the date/amount and, because there are no DB
// foreign keys, that any referenced vendor / PO actually exists in this
// tenant (same in-code referential guard the bulk importers use).
func validateMessExpense(db *gorm.DB, ctx context.Context, tenantID string, input model.MessExpenseInput) error {
	if !validYMD(input.Date) {
		return GQLErr("date must be YYYY-MM-DD")
	}
	if input.Amount < 0 {
		return GQLErr("amount cannot be negative")
	}
	if vid := strVal(input.VendorID); vid != "" {
		var n int64
		db.WithContext(ctx).Model(&models.Vendor{}).
			Where("id = ? AND tenant_id = ?", vid, tenantID).Count(&n)
		if n == 0 {
			return GQLErr("vendor not found")
		}
	}
	if pid := strVal(input.PurchaseOrderID); pid != "" {
		var n int64
		db.WithContext(ctx).Model(&models.PurchaseOrder{}).
			Where("id = ? AND tenant_id = ?", pid, tenantID).Count(&n)
		if n == 0 {
			return GQLErr("purchase order not found")
		}
	}
	return nil
}

func loadMessExpense(db *gorm.DB, ctx context.Context, tenantID, id string) (*model.MessExpense, error) {
	var row models.MessExpense
	if err := db.WithContext(ctx).Preload("Vendor").Preload("PurchaseOrder").
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&row).Error; err != nil {
		return nil, ErrNotFound
	}
	return messExpenseToModel(row), nil
}

func messExpenseToModel(m models.MessExpense) *model.MessExpense {
	return &model.MessExpense{
		ID:              m.ID,
		Date:            m.Date,
		Category:        m.Category,
		Description:     toStrPtr(m.Description),
		Amount:          m.Amount,
		VendorID:        toStrPtr(m.VendorID),
		VendorName:      toStrPtr(m.Vendor.Name),
		PurchaseOrderID: toStrPtr(m.PurchaseOrderID),
		PoNumber:        toStrPtr(m.PurchaseOrder.PONumber),
		CreatedAt:       rfc3339OrNil(m.CreatedAt),
	}
}
