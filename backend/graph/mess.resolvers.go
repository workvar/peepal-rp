package graph

import (
	"context"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// Mess / canteen resolvers (Phase 6b): weekly menu, meal attendance roster,
// and provisioning expenses linked to Phase 2 vendors / purchase orders.
// Mapping helpers live in mess_helpers.go.

// ── Menu ─────────────────────────────────────────────────────────────────────

// MessMenu returns the weekly grid. Passing a block returns that block's own
// cells plus the campus-wide ones, so a block that only overrides dinner
// still shows the shared breakfast.
func (r *queryResolver) MessMenu(ctx context.Context, hostelBlockID *string) ([]*model.MessMenu, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Preload("HostelBlock").Where("tenant_id = ?", auth.TenantID)
	if hostelBlockID != nil && *hostelBlockID != "" {
		q = q.Where("hostel_block_id IN ?", []string{*hostelBlockID, ""})
	}
	return listMessMenu(q)
}

// MyMessMenu is the student self-service view: the menu for the block they
// are allocated to, falling back to the campus-wide menu when they are a day
// scholar or the block has no overrides.
func (r *queryResolver) MyMessMenu(ctx context.Context) ([]*model.MessMenu, error) {
	auth, err := requireRole(ctx, roleStudent)
	if err != nil {
		return nil, err
	}
	student, err := studentForUser(r.DB, ctx, auth.TenantID, auth.UserID)
	if err != nil {
		return nil, err
	}
	blockID := activeHostelBlockID(r.DB, ctx, auth.TenantID, student.ID)

	q := r.DB.WithContext(ctx).Preload("HostelBlock").Where("tenant_id = ?", auth.TenantID)
	q = q.Where("hostel_block_id IN ?", []string{blockID, ""})
	return listMessMenu(q)
}

// SetMessMenu upserts one (day, meal, block) cell, so the menu grid can save
// a cell without the caller tracking whether it already exists.
func (r *mutationResolver) SetMessMenu(ctx context.Context, input model.MessMenuInput) (*model.MessMenu, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if input.DayOfWeek < 0 || input.DayOfWeek > 6 {
		return nil, GQLErr("dayOfWeek must be 0 (Sunday) to 6 (Saturday)")
	}
	if !validMeal(input.Meal) {
		return nil, GQLErr("meal must be breakfast, lunch, snacks or dinner")
	}
	blockID := strVal(input.HostelBlockID)

	var row models.MessMenu
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		lookup := tx.Where("tenant_id = ? AND day_of_week = ? AND meal = ? AND hostel_block_id = ?",
			auth.TenantID, input.DayOfWeek, input.Meal, blockID).First(&row)
		if lookup.Error == nil {
			return tx.Model(&models.MessMenu{}).Where("id = ?", row.ID).
				Update("items", strVal(input.Items)).Error
		}
		row = models.MessMenu{
			TenantID:      auth.TenantID,
			DayOfWeek:     input.DayOfWeek,
			Meal:          input.Meal,
			Items:         strVal(input.Items),
			HostelBlockID: blockID,
		}
		return tx.Create(&row).Error
	})
	if err != nil {
		return nil, err
	}
	var saved models.MessMenu
	if err := r.DB.WithContext(ctx).Preload("HostelBlock").
		Where("id = ? AND tenant_id = ?", row.ID, auth.TenantID).First(&saved).Error; err != nil {
		return nil, err
	}
	return messMenuToModel(saved), nil
}

func (r *mutationResolver) DeleteMessMenu(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.MessMenu{})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

// ── Attendance ───────────────────────────────────────────────────────────────

// MessAttendance returns the roster for one date + meal: every eligible
// student, with `present` reflecting whether they already have a mark. The
// roster shape (not just the marked rows) is what the grid needs to render.
func (r *queryResolver) MessAttendance(ctx context.Context, date string, meal string, hostelBlockID *string) ([]*model.MessAttendanceRow, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff, roleTeacher)
	if err != nil {
		return nil, err
	}
	if !validYMD(date) {
		return nil, GQLErr("date must be YYYY-MM-DD")
	}
	if !validMeal(meal) {
		return nil, GQLErr("meal must be breakfast, lunch, snacks or dinner")
	}

	students, err := messRosterStudents(r.DB, ctx, auth.TenantID, strVal(hostelBlockID))
	if err != nil {
		return nil, err
	}

	var marks []models.MessAttendance
	r.DB.WithContext(ctx).
		Where("tenant_id = ? AND date = ? AND meal = ?", auth.TenantID, date, meal).Find(&marks)
	byStudent := map[string]models.MessAttendance{}
	for _, m := range marks {
		byStudent[m.StudentID] = m
	}

	out := make([]*model.MessAttendanceRow, len(students))
	for i, s := range students {
		row := &model.MessAttendanceRow{
			StudentID:   s.ID,
			StudentName: studentRosterName(s),
			RollNumber:  toStrPtr(s.RollNumber),
			Date:        date,
			Meal:        meal,
		}
		if mark, ok := byStudent[s.ID]; ok {
			row.ID = toStrPtr(mark.ID)
			row.Present = mark.Present
		}
		out[i] = row
	}
	return out, nil
}

// MarkMessAttendance is the roster submit: the listed students are marked
// present for that meal and any previous mark for a student NOT in the list
// is cleared, so re-submitting the grid is idempotent rather than additive.
func (r *mutationResolver) MarkMessAttendance(ctx context.Context, date string, meal string, studentIDs []string) (*model.MessAttendanceResult, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff, roleTeacher)
	if err != nil {
		return nil, err
	}
	if !validYMD(date) {
		return nil, GQLErr("date must be YYYY-MM-DD")
	}
	if !validMeal(meal) {
		return nil, GQLErr("meal must be breakfast, lunch, snacks or dinner")
	}

	result := &model.MessAttendanceResult{}
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Clear marks for students dropped from the roster.
		clear := tx.Where("tenant_id = ? AND date = ? AND meal = ?", auth.TenantID, date, meal)
		if len(studentIDs) > 0 {
			clear = clear.Where("student_id NOT IN ?", studentIDs)
		}
		res := clear.Delete(&models.MessAttendance{})
		if res.Error != nil {
			return res.Error
		}
		result.Cleared = int(res.RowsAffected)

		for _, sid := range studentIDs {
			if sid == "" {
				continue
			}
			var existing models.MessAttendance
			lookup := tx.Where("tenant_id = ? AND student_id = ? AND date = ? AND meal = ?",
				auth.TenantID, sid, date, meal).First(&existing)
			if lookup.Error == nil {
				if !existing.Present {
					if err := tx.Model(&models.MessAttendance{}).
						Where("id = ?", existing.ID).Update("present", true).Error; err != nil {
						return err
					}
				}
				result.Marked++
				continue
			}
			row := models.MessAttendance{
				TenantID: auth.TenantID, StudentID: sid,
				Date: date, Meal: meal, Present: true,
			}
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
			result.Marked++
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

// ── Expenses ─────────────────────────────────────────────────────────────────

func (r *queryResolver) MessExpenses(ctx context.Context, from *string, to *string, category *string) ([]*model.MessExpense, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	var rows []models.MessExpense
	if err := messExpenseQuery(r.DB, ctx, auth.TenantID, from, to, category).
		Preload("Vendor").Preload("PurchaseOrder").
		Order("date DESC, created_at DESC").Limit(1000).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.MessExpense, len(rows))
	for i, row := range rows {
		out[i] = messExpenseToModel(row)
	}
	return out, nil
}

// MessExpenseSummary totals the same window as MessExpenses so the page
// header doesn't have to sum a truncated list client-side.
func (r *queryResolver) MessExpenseSummary(ctx context.Context, from *string, to *string) (*model.MessExpenseSummary, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	var rows []struct {
		Category string
		Total    float64
	}
	if err := messExpenseQuery(r.DB, ctx, auth.TenantID, from, to, nil).
		Model(&models.MessExpense{}).
		Select("category, SUM(amount) AS total").Group("category").Scan(&rows).Error; err != nil {
		return nil, err
	}
	out := &model.MessExpenseSummary{ByCategory: []*model.MessCategoryTotal{}}
	for _, row := range rows {
		out.Total += row.Total
		out.ByCategory = append(out.ByCategory, &model.MessCategoryTotal{
			Category: row.Category, Total: row.Total,
		})
	}
	return out, nil
}

func (r *mutationResolver) CreateMessExpense(ctx context.Context, input model.MessExpenseInput) (*model.MessExpense, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if err := validateMessExpense(r.DB, ctx, auth.TenantID, input); err != nil {
		return nil, err
	}
	row := models.MessExpense{
		TenantID:        auth.TenantID,
		Date:            input.Date,
		Category:        messCategoryOr(input.Category),
		Description:     strVal(input.Description),
		Amount:          input.Amount,
		VendorID:        strVal(input.VendorID),
		PurchaseOrderID: strVal(input.PurchaseOrderID),
	}
	if err := r.DB.WithContext(ctx).Create(&row).Error; err != nil {
		return nil, err
	}
	return loadMessExpense(r.DB, ctx, auth.TenantID, row.ID)
}

func (r *mutationResolver) UpdateMessExpense(ctx context.Context, id string, input model.MessExpenseInput) (*model.MessExpense, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	if err := validateMessExpense(r.DB, ctx, auth.TenantID, input); err != nil {
		return nil, err
	}
	updates := map[string]interface{}{
		"date":              input.Date,
		"category":          messCategoryOr(input.Category),
		"description":       strVal(input.Description),
		"amount":            input.Amount,
		"vendor_id":         strVal(input.VendorID),
		"purchase_order_id": strVal(input.PurchaseOrderID),
	}
	res := r.DB.WithContext(ctx).Model(&models.MessExpense{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return loadMessExpense(r.DB, ctx, auth.TenantID, id)
}

func (r *mutationResolver) DeleteMessExpense(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.MessExpense{})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}
