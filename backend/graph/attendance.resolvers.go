package graph

import (
	"context"
	"errors"
	"math"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// ─── Queries ──────────────────────────────────────────────────────────────────

func (r *queryResolver) Attendance(ctx context.Context, entityID *string, entityType *string, subjectID *string, date *string, limit *int, offset *int, search *string) ([]*model.AttendanceRecord, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Where("attendances.tenant_id = ?", auth.TenantID)
	if entityID != nil {
		q = q.Where("attendances.entity_id = ?", *entityID)
	}
	if entityType != nil {
		q = q.Where("attendances.entity_type = ?", *entityType)
	}
	if subjectID != nil {
		q = q.Where("attendances.subject_id = ?", *subjectID)
	}
	if date != nil {
		q = q.Where("attendances.date = ?", *date)
	}

	// Full-text search: find entity IDs whose name/code matches, then OR with
	// direct attendance fields (remarks, status, date string).
	if search != nil && strings.TrimSpace(*search) != "" {
		like := "%" + strings.ToLower(strings.TrimSpace(*search)) + "%"

		// Collect matching entity IDs from students and employees.
		var stuIDs []string
		r.DB.WithContext(ctx).
			Table("students").
			Joins("JOIN users ON users.id = students.user_id").
			Where("students.tenant_id = ? AND (LOWER(users.name) LIKE ? OR LOWER(students.roll_number) LIKE ?)",
				auth.TenantID, like, like).
			Pluck("students.id", &stuIDs)

		var empIDs []string
		r.DB.WithContext(ctx).
			Table("employees").
			Joins("JOIN users ON users.id = employees.user_id").
			Where("employees.tenant_id = ? AND (LOWER(users.name) LIKE ? OR LOWER(employees.employee_id) LIKE ?)",
				auth.TenantID, like, like).
			Pluck("employees.id", &empIDs)

		allIDs := append(stuIDs, empIDs...)
		if len(allIDs) > 0 {
			q = q.Where(
				"attendances.entity_id IN ? OR LOWER(attendances.remarks) LIKE ? OR LOWER(attendances.status) LIKE ?",
				allIDs, like, like,
			)
		} else {
			// No entity name matched — search attendance fields directly.
			q = q.Where(
				"LOWER(attendances.remarks) LIKE ? OR LOWER(attendances.status) LIKE ? OR CAST(attendances.date AS TEXT) LIKE ?",
				like, like, like,
			)
		}
	}

	// Apply pagination — default 100 rows, hard cap at 500.
	lim := 100
	if limit != nil && *limit > 0 {
		lim = *limit
		if lim > 500 {
			lim = 500
		}
	}
	off := 0
	if offset != nil && *offset > 0 {
		off = *offset
	}
	q = q.Model(&models.Attendance{}).Order("attendances.date desc").Limit(lim).Offset(off)

	var records []models.Attendance
	if err := q.Find(&records).Error; err != nil {
		return nil, err
	}
	out := make([]*model.AttendanceRecord, len(records))
	for i, a := range records {
		out[i] = attendanceToModel(a)
	}
	return out, nil
}

func (r *queryResolver) AttendanceSummary(ctx context.Context, entityType *string) ([]*model.AttendanceSummaryRow, error) {
	// Cross-entity summary: staff-facing, not for students.
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}
	et := "student"
	if entityType != nil && *entityType != "" {
		et = *entityType
	}

	var entityIDs []string
	if err := r.DB.WithContext(ctx).Model(&models.Attendance{}).
		Where("tenant_id = ? AND entity_type = ?", auth.TenantID, et).
		Distinct("entity_id").
		Pluck("entity_id", &entityIDs).Error; err != nil {
		return nil, err
	}

	out := make([]*model.AttendanceSummaryRow, 0, len(entityIDs))
	for _, eid := range entityIDs {
		base := r.DB.WithContext(ctx).Model(&models.Attendance{}).
			Where("tenant_id = ? AND entity_type = ? AND entity_id = ?", auth.TenantID, et, eid)

		var total, present, absent, late int64
		if err := base.Count(&total).Error; err != nil {
			return nil, err
		}
		base.Where("status = ?", "present").Count(&present)
		base.Where("status = ?", "absent").Count(&absent)
		base.Where("status = ?", "late").Count(&late)

		pct := 0.0
		if total > 0 {
			pct = float64(present+late) / float64(total) * 100
		}
		out = append(out, &model.AttendanceSummaryRow{
			EntityID:      eid,
			Total:         int(total),
			Present:       int(present),
			Absent:        int(absent),
			Late:          int(late),
			AttendancePct: pct,
		})
	}
	return out, nil
}

func (r *queryResolver) AttendanceShortage(ctx context.Context) (*model.ShortageList, error) {
	// Lists every student below the threshold: staff-facing only.
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}

	var settings models.AttendanceSettings
	threshold := 75.0
	if err := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID).First(&settings).Error; err == nil {
		threshold = settings.MinAttendancePct
	}

	var students []models.Student
	if err := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID).
		Preload("User").Preload("Course").Find(&students).Error; err != nil {
		return nil, err
	}

	var shortageItems []*model.ShortageStudent
	for _, s := range students {
		var total, present int64
		r.DB.WithContext(ctx).Model(&models.Attendance{}).
			Where("tenant_id = ? AND entity_id = ? AND entity_type = 'student'", auth.TenantID, s.ID).
			Count(&total)
		r.DB.WithContext(ctx).Model(&models.Attendance{}).
			Where("tenant_id = ? AND entity_id = ? AND entity_type = 'student' AND status IN ?", auth.TenantID, s.ID, []string{"present", "late"}).
			Count(&present)

		if total == 0 {
			continue
		}
		pct := float64(present) / float64(total) * 100
		if pct < threshold {
			shortageItems = append(shortageItems, &model.ShortageStudent{
				Student:       studentToModel(s),
				Total:         int(total),
				Present:       int(present),
				AttendancePct: pct,
			})
		}
	}
	if shortageItems == nil {
		shortageItems = []*model.ShortageStudent{}
	}
	return &model.ShortageList{
		Threshold: threshold,
		Students:  shortageItems,
		Count:     len(shortageItems),
	}, nil
}

func (r *queryResolver) Leaves(ctx context.Context, status *string) ([]*model.LeaveRecord, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID).Preload("Applicant")
	if auth.Role != "admin" {
		q = q.Where("applicant_id = ?", auth.UserID)
	}
	if status != nil && *status != "" {
		q = q.Where("status = ?", *status)
	}
	var leaves []models.Leave
	if err := q.Order("created_at desc").Find(&leaves).Error; err != nil {
		return nil, err
	}
	out := make([]*model.LeaveRecord, len(leaves))
	for i, l := range leaves {
		out[i] = leaveToModel(l)
	}
	return out, nil
}

func (r *queryResolver) LeaveTypes(ctx context.Context) ([]*model.LeaveTypeConfig, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var types []models.LeaveTypeConfig
	if err := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID).Order("name asc").Find(&types).Error; err != nil {
		return nil, err
	}
	if len(types) == 0 {
		return []*model.LeaveTypeConfig{
			{ID: "CL", Name: "Casual Leave", Code: "CL", DaysPerYear: 12, CarryForward: false, MaxCarryForward: 0, ApplicableTo: "all", IsActive: true},
			{ID: "SL", Name: "Sick Leave", Code: "SL", DaysPerYear: 12, CarryForward: false, MaxCarryForward: 0, ApplicableTo: "all", IsActive: true},
			{ID: "EL", Name: "Earned Leave", Code: "EL", DaysPerYear: 24, CarryForward: true, MaxCarryForward: 30, ApplicableTo: "all", IsActive: true},
		}, nil
	}
	out := make([]*model.LeaveTypeConfig, len(types))
	for i, lt := range types {
		out[i] = leaveTypeToModel(lt)
	}
	return out, nil
}

func (r *queryResolver) MyLeaveBalance(ctx context.Context) ([]*model.LeaveBalance, error) {
	// Self-service: scoped to auth.UserID below.
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	year := time.Now().Year()

	var balances []models.LeaveBalance
	if err := r.DB.WithContext(ctx).Where("tenant_id = ? AND user_id = ? AND year = ?", auth.TenantID, auth.UserID, year).
		Preload("LeaveType").Find(&balances).Error; err != nil {
		return nil, err
	}

	if len(balances) == 0 {
		var types []models.LeaveTypeConfig
		r.DB.WithContext(ctx).Where("tenant_id = ? AND is_active = ?", auth.TenantID, true).Find(&types)
		for _, lt := range types {
			b := models.LeaveBalance{
				TenantID:    auth.TenantID,
				UserID:      auth.UserID,
				LeaveTypeID: lt.ID,
				Year:        year,
				Total:       float64(lt.DaysPerYear),
			}
			r.DB.WithContext(ctx).Create(&b)
			b.LeaveType = lt
			balances = append(balances, b)
		}
	}

	out := make([]*model.LeaveBalance, len(balances))
	for i, b := range balances {
		out[i] = leaveBalanceToModel(b)
	}
	return out, nil
}

func (r *queryResolver) LeaveBalances(ctx context.Context, year *int, userID *string) ([]*model.LeaveBalance, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	y := time.Now().Year()
	if year != nil {
		y = *year
	}
	q := r.DB.WithContext(ctx).Where("tenant_id = ? AND year = ?", auth.TenantID, y).
		Preload("User").Preload("LeaveType")
	if userID != nil && *userID != "" {
		q = q.Where("user_id = ?", *userID)
	}
	var balances []models.LeaveBalance
	if err := q.Find(&balances).Error; err != nil {
		return nil, err
	}
	out := make([]*model.LeaveBalance, len(balances))
	for i, b := range balances {
		out[i] = leaveBalanceToModel(b)
	}
	return out, nil
}

// ─── Mutations ────────────────────────────────────────────────────────────────

func (r *mutationResolver) MarkAttendance(ctx context.Context, input model.MarkAttendanceInput) (*model.AttendanceRecord, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}
	date, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		return nil, ErrValidation
	}
	a := models.Attendance{
		TenantID:   auth.TenantID,
		EntityID:   input.EntityID,
		EntityType: input.EntityType,
		Date:       date,
		Status:     models.AttendanceStatus(input.Status),
		MarkedBy:   auth.UserID,
		SubjectID:  strVal(input.SubjectID),
		Remarks:    strVal(input.Remarks),
	}
	if err := r.DB.WithContext(ctx).Create(&a).Error; err != nil {
		return nil, err
	}
	return attendanceToModel(a), nil
}

// BulkMarkAttendance writes many attendance entries in one request. Each entry
// is upserted by (tenant, entity, type, date, subject): an existing day is
// updated in place rather than duplicated. This lets the calendar UI re-save a
// month freely without piling up duplicate rows (which would skew summaries).
func (r *mutationResolver) BulkMarkAttendance(ctx context.Context, inputs []*model.MarkAttendanceInput) ([]*model.AttendanceRecord, error) {
	auth, err := requireRole(ctx, roleAdmin, roleTeacher)
	if err != nil {
		return nil, err
	}
	out := make([]*model.AttendanceRecord, 0, len(inputs))
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, inp := range inputs {
			date, perr := time.Parse("2006-01-02", inp.Date)
			if perr != nil {
				return ErrValidation
			}
			rec, perr := upsertAttendance(tx, auth.TenantID, auth.UserID, inp, date)
			if perr != nil {
				return perr
			}
			out = append(out, attendanceToModel(rec))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return out, nil
}

// upsertAttendance inserts or updates a single attendance row idempotently.
// Match is by the natural key (tenant, entity, type, date, subject) using a
// one-day window so a stored timestamp's time-of-day never blocks a match.
// Remarks are only overwritten when the caller actually sends them, so the
// calendar (which omits remarks) never wipes notes set elsewhere.
func upsertAttendance(tx *gorm.DB, tenantID, markedBy string, inp *model.MarkAttendanceInput, date time.Time) (models.Attendance, error) {
	subjectID := strVal(inp.SubjectID)
	dayStart := date
	dayEnd := date.AddDate(0, 0, 1)

	var rec models.Attendance
	err := tx.Where(
		"tenant_id = ? AND entity_id = ? AND entity_type = ? AND subject_id = ? AND date >= ? AND date < ?",
		tenantID, inp.EntityID, inp.EntityType, subjectID, dayStart, dayEnd,
	).First(&rec).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		rec = models.Attendance{
			TenantID:   tenantID,
			EntityID:   inp.EntityID,
			EntityType: inp.EntityType,
			Date:       date,
			Status:     models.AttendanceStatus(inp.Status),
			MarkedBy:   markedBy,
			SubjectID:  subjectID,
			Remarks:    strVal(inp.Remarks),
		}
		if cerr := tx.Create(&rec).Error; cerr != nil {
			return models.Attendance{}, cerr
		}
		return rec, nil
	}
	if err != nil {
		return models.Attendance{}, err
	}

	rec.Status = models.AttendanceStatus(inp.Status)
	rec.MarkedBy = markedBy
	if inp.Remarks != nil {
		rec.Remarks = *inp.Remarks
	}
	if serr := tx.Save(&rec).Error; serr != nil {
		return models.Attendance{}, serr
	}
	return rec, nil
}

func (r *mutationResolver) ApplyLeave(ctx context.Context, input model.ApplyLeaveInput) (*model.LeaveRecord, error) {
	// Any authenticated user may apply; applicant is always auth.UserID.
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	from, err := time.Parse("2006-01-02", input.FromDate)
	if err != nil {
		return nil, ErrValidation
	}
	to, err := time.Parse("2006-01-02", input.ToDate)
	if err != nil {
		return nil, ErrValidation
	}

	days := workingDaysBetweenDates(from, to)

	if input.LeaveTypeID != nil && *input.LeaveTypeID != "" {
		var bal models.LeaveBalance
		year := from.Year()
		if err := r.DB.WithContext(ctx).Where("tenant_id = ? AND user_id = ? AND leave_type_id = ? AND year = ?",
			auth.TenantID, auth.UserID, *input.LeaveTypeID, year).First(&bal).Error; err == nil {
			remaining := bal.Total - bal.Used - bal.Pending
			if remaining < days {
				return nil, ErrValidation
			}
			bal.Pending += days
			if err := r.DB.WithContext(ctx).Save(&bal).Error; err != nil {
				return nil, err
			}
		}
	}

	leave := models.Leave{
		TenantID:    auth.TenantID,
		ApplicantID: auth.UserID,
		LeaveType:   input.LeaveType,
		FromDate:    from,
		ToDate:      to,
		Reason:      input.Reason,
		Status:      models.LeavePending,
	}
	if input.LeaveTypeID != nil {
		leave.LeaveTypeID = *input.LeaveTypeID
	}
	if err := r.DB.WithContext(ctx).Create(&leave).Error; err != nil {
		return nil, err
	}
	if err := r.DB.WithContext(ctx).Preload("Applicant").
		Where("id = ? AND tenant_id = ?", leave.ID, auth.TenantID).First(&leave).Error; err != nil {
		return nil, err
	}
	return leaveToModel(leave), nil
}

func (r *mutationResolver) ReviewLeave(ctx context.Context, id string, input model.ReviewLeaveInput) (*model.LeaveRecord, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var leave models.Leave
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&leave).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if input.Status != string(models.LeaveApproved) && input.Status != string(models.LeaveRejected) {
		return nil, ErrValidation
	}

	oldStatus := leave.Status
	leave.Status = models.LeaveStatus(input.Status)
	leave.ReviewedBy = auth.UserID
	if input.ReviewNote != nil {
		leave.ReviewNote = *input.ReviewNote
	}

	if err := r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&leave).Error; err != nil {
			return err
		}
		if leave.LeaveTypeID != "" && oldStatus == models.LeavePending {
			days := workingDaysBetweenDates(leave.FromDate, leave.ToDate)
			year := leave.FromDate.Year()
			var bal models.LeaveBalance
			if err := tx.Where("tenant_id = ? AND user_id = ? AND leave_type_id = ? AND year = ?",
				auth.TenantID, leave.ApplicantID, leave.LeaveTypeID, year).First(&bal).Error; err == nil {
				if input.Status == string(models.LeaveApproved) {
					bal.Pending -= days
					bal.Used += days
				} else {
					bal.Pending -= days
				}
				if bal.Pending < 0 {
					bal.Pending = 0
				}
				if err := tx.Save(&bal).Error; err != nil {
					return err
				}
			}
		}
		return nil
	}); err != nil {
		return nil, err
	}

	if err := r.DB.WithContext(ctx).Preload("Applicant").
		Where("id = ? AND tenant_id = ?", leave.ID, auth.TenantID).First(&leave).Error; err != nil {
		return nil, err
	}
	return leaveToModel(leave), nil
}

func (r *mutationResolver) CreateLeaveType(ctx context.Context, input model.CreateLeaveTypeInput) (*model.LeaveTypeConfig, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	lt := models.LeaveTypeConfig{
		TenantID:        auth.TenantID,
		Name:            input.Name,
		Code:            input.Code,
		DaysPerYear:     input.DaysPerYear,
		CarryForward:    input.CarryForward,
		MaxCarryForward: input.MaxCarryForward,
		ApplicableTo:    input.ApplicableTo,
	}
	if err := r.DB.WithContext(ctx).Create(&lt).Error; err != nil {
		return nil, ErrValidation
	}
	return leaveTypeToModel(lt), nil
}

func (r *mutationResolver) UpdateLeaveType(ctx context.Context, id string, input model.UpdateLeaveTypeInput) (*model.LeaveTypeConfig, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var lt models.LeaveTypeConfig
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&lt).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	updates := map[string]interface{}{}
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.DaysPerYear != nil {
		updates["days_per_year"] = *input.DaysPerYear
	}
	if input.CarryForward != nil {
		updates["carry_forward"] = *input.CarryForward
	}
	if input.MaxCarryForward != nil {
		updates["max_carry_forward"] = *input.MaxCarryForward
	}
	if input.ApplicableTo != nil {
		updates["applicable_to"] = *input.ApplicableTo
	}
	if len(updates) > 0 {
		if err := r.DB.WithContext(ctx).Model(&lt).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&lt).Error; err != nil {
		return nil, err
	}
	return leaveTypeToModel(lt), nil
}

func (r *mutationResolver) DeleteLeaveType(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.LeaveTypeConfig{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func attendanceToModel(a models.Attendance) *model.AttendanceRecord {
	return &model.AttendanceRecord{
		ID:         a.ID,
		EntityID:   a.EntityID,
		EntityType: a.EntityType,
		Date:       a.Date.Format("2006-01-02"),
		Status:     string(a.Status),
		MarkedBy:   toStrPtr(a.MarkedBy),
		Remarks:    toStrPtr(a.Remarks),
		SubjectID:  toStrPtr(a.SubjectID),
	}
}

func leaveToModel(l models.Leave) *model.LeaveRecord {
	m := &model.LeaveRecord{
		ID:            l.ID,
		ApplicantID:   l.ApplicantID,
		LeaveTypeName: l.LeaveType,
		LeaveTypeID:   toStrPtr(l.LeaveTypeID),
		FromDate:      l.FromDate.Format("2006-01-02"),
		ToDate:        l.ToDate.Format("2006-01-02"),
		Reason:        l.Reason,
		Status:        string(l.Status),
		ReviewedBy:    toStrPtr(l.ReviewedBy),
		ReviewNote:    toStrPtr(l.ReviewNote),
	}
	if l.Applicant.ID != "" {
		m.Applicant = &model.User{
			ID:       l.Applicant.ID,
			Email:    l.Applicant.Email,
			Name:     l.Applicant.Name,
			Role:     string(l.Applicant.Role),
			IsActive: l.Applicant.IsActive,
		}
	}
	return m
}

func leaveTypeToModel(lt models.LeaveTypeConfig) *model.LeaveTypeConfig {
	return &model.LeaveTypeConfig{
		ID:              lt.ID,
		Name:            lt.Name,
		Code:            lt.Code,
		DaysPerYear:     lt.DaysPerYear,
		CarryForward:    lt.CarryForward,
		MaxCarryForward: lt.MaxCarryForward,
		ApplicableTo:    lt.ApplicableTo,
		IsActive:        lt.IsActive,
	}
}

func leaveBalanceToModel(b models.LeaveBalance) *model.LeaveBalance {
	m := &model.LeaveBalance{
		ID:          b.ID,
		UserID:      b.UserID,
		LeaveTypeID: b.LeaveTypeID,
		Year:        b.Year,
		Total:       b.Total,
		Used:        b.Used,
		Pending:     b.Pending,
	}
	if b.LeaveType.ID != "" {
		m.LeaveType = leaveTypeToModel(b.LeaveType)
	}
	return m
}

// workingDaysBetweenDates counts working days (Mon–Fri), minimum 1.
func workingDaysBetweenDates(from, to time.Time) float64 {
	days := 0.0
	curr := from
	for !curr.After(to) {
		if curr.Weekday() != time.Saturday && curr.Weekday() != time.Sunday {
			days++
		}
		curr = curr.AddDate(0, 0, 1)
	}
	return math.Max(days, 1)
}
