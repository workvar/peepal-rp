package graph

import (
	"context"
	"errors"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

var validDays = map[string]bool{
	"Monday": true, "Tuesday": true, "Wednesday": true,
	"Thursday": true, "Friday": true, "Saturday": true,
}

func (r *queryResolver) Timetable(ctx context.Context, academicYearID *string, courseID *string, semester *int, section *string, dayOfWeek *string, employeeID *string) ([]*model.TimetableSlot, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Preload("Course").Preload("Subject").
		Where("tenant_id = ?", auth.TenantID)

	if auth.Role == roleStudent {
		// Students may only ever see their own class schedule. Ignore any
		// client-supplied course/semester/section/employee filters and force the
		// query to the caller's own enrolment, so the same endpoint is safe for
		// both the student portal and the standalone timetable page.
		var student models.Student
		if err := r.DB.WithContext(ctx).
			Where("user_id = ? AND tenant_id = ?", auth.UserID, auth.TenantID).
			First(&student).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return []*model.TimetableSlot{}, nil
			}
			return nil, err
		}
		q = q.Where("course_id = ? AND semester = ?", student.CourseID, student.Semester)
		if student.Section != "" {
			q = q.Where("section = ?", student.Section)
		}
		if dayOfWeek != nil && *dayOfWeek != "" {
			q = q.Where("day_of_week = ?", *dayOfWeek)
		}
	} else {
		if academicYearID != nil && *academicYearID != "" {
			q = q.Where("academic_year_id = ?", *academicYearID)
		}
		if courseID != nil && *courseID != "" {
			q = q.Where("course_id = ?", *courseID)
		}
		if semester != nil {
			q = q.Where("semester = ?", *semester)
		}
		if section != nil && *section != "" {
			q = q.Where("section = ?", *section)
		}
		if dayOfWeek != nil && *dayOfWeek != "" {
			q = q.Where("day_of_week = ?", *dayOfWeek)
		}
		if employeeID != nil && *employeeID != "" {
			q = q.Where("employee_id = ?", *employeeID)
		}
	}

	var slots []models.TimetableSlot
	if err := q.Order("day_of_week, period_number").Find(&slots).Error; err != nil {
		return nil, err
	}
	out := make([]*model.TimetableSlot, len(slots))
	for i, s := range slots {
		out[i] = timetableSlotToModel(s)
	}
	return out, nil
}

func (r *mutationResolver) CreateTimetableSlot(ctx context.Context, input model.CreateTimetableSlotInput) (*model.TimetableSlot, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	// Issue 6: validate DayOfWeek
	if !validDays[input.DayOfWeek] {
		return nil, ErrValidation
	}
	slot := models.TimetableSlot{
		TenantID:       auth.TenantID,
		AcademicYearID: strVal(input.AcademicYearID),
		CourseID:       input.CourseID,
		SubjectID:      input.SubjectID,
		EmployeeID:     strVal(input.EmployeeID),
		DayOfWeek:      models.DayOfWeek(input.DayOfWeek),
		PeriodNumber:   input.PeriodNumber,
		StartTime:      input.StartTime,
		EndTime:        input.EndTime,
		Semester:       input.Semester,
		Section:        strVal(input.Section),
		Room:           strVal(input.Room),
	}
	if err := r.DB.WithContext(ctx).Create(&slot).Error; err != nil {
		return nil, err
	}
	// Issue 1: check error on post-write reload
	if err := r.DB.WithContext(ctx).Preload("Course").Preload("Subject").
		Where("id = ? AND tenant_id = ?", slot.ID, auth.TenantID).First(&slot).Error; err != nil {
		return nil, err
	}
	return timetableSlotToModel(slot), nil
}

func (r *mutationResolver) UpdateTimetableSlot(ctx context.Context, id string, input model.UpdateTimetableSlotInput) (*model.TimetableSlot, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var slot models.TimetableSlot
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&slot).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	// Issue 6: validate DayOfWeek before building map
	if input.DayOfWeek != nil && !validDays[*input.DayOfWeek] {
		return nil, ErrValidation
	}
	updates := map[string]interface{}{}
	if input.SubjectID != nil {
		updates["subject_id"] = *input.SubjectID
	}
	if input.EmployeeID != nil {
		updates["employee_id"] = *input.EmployeeID
	}
	if input.DayOfWeek != nil {
		updates["day_of_week"] = *input.DayOfWeek
	}
	if input.PeriodNumber != nil {
		updates["period_number"] = *input.PeriodNumber
	}
	if input.StartTime != nil {
		updates["start_time"] = *input.StartTime
	}
	if input.EndTime != nil {
		updates["end_time"] = *input.EndTime
	}
	if input.Semester != nil {
		updates["semester"] = *input.Semester
	}
	if input.Section != nil {
		updates["section"] = *input.Section
	}
	if input.Room != nil {
		updates["room"] = *input.Room
	}
	if len(updates) > 0 {
		// Issue 2: check error on Updates
		if err := r.DB.WithContext(ctx).Model(&slot).Updates(updates).Error; err != nil {
			return nil, err
		}
	}
	// Issue 3: check error on post-write reload
	if err := r.DB.WithContext(ctx).Preload("Course").Preload("Subject").
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&slot).Error; err != nil {
		return nil, err
	}
	return timetableSlotToModel(slot), nil
}

func (r *mutationResolver) DeleteTimetableSlot(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.TimetableSlot{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

func (r *mutationResolver) BulkCreateTimetableSlots(ctx context.Context, input model.BulkCreateTimetableSlotsInput) ([]*model.TimetableSlot, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	section := strVal(input.Section)

	// Issue 6: validate all DayOfWeek values upfront before touching the DB
	for _, s := range input.Slots {
		if !validDays[s.DayOfWeek] {
			return nil, ErrValidation
		}
	}

	// Issues 4 & 5: wrap delete + create in a transaction
	var out []*model.TimetableSlot
	err = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where(
			"tenant_id = ? AND course_id = ? AND semester = ? AND section = ?",
			auth.TenantID, input.CourseID, input.Semester, section,
		).Delete(&models.TimetableSlot{}).Error; err != nil {
			return err
		}
		if len(input.Slots) == 0 {
			return nil
		}
		slots := make([]models.TimetableSlot, 0, len(input.Slots))
		for _, s := range input.Slots {
			slots = append(slots, models.TimetableSlot{
				TenantID:       auth.TenantID,
				AcademicYearID: strVal(input.AcademicYearID),
				CourseID:       input.CourseID,
				SubjectID:      s.SubjectID,
				EmployeeID:     strVal(s.EmployeeID),
				DayOfWeek:      models.DayOfWeek(s.DayOfWeek),
				PeriodNumber:   s.PeriodNumber,
				StartTime:      s.StartTime,
				EndTime:        s.EndTime,
				Semester:       input.Semester,
				Section:        section,
				Room:           strVal(s.Room),
			})
		}
		if err := tx.Create(&slots).Error; err != nil {
			return err
		}
		out = make([]*model.TimetableSlot, len(slots))
		for i, s := range slots {
			out[i] = timetableSlotToModel(s)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	if out == nil {
		out = []*model.TimetableSlot{}
	}
	return out, nil
}

func timetableSlotToModel(s models.TimetableSlot) *model.TimetableSlot {
	m := &model.TimetableSlot{
		ID:             s.ID,
		AcademicYearID: toStrPtr(s.AcademicYearID),
		CourseID:       s.CourseID,
		SubjectID:      s.SubjectID,
		EmployeeID:     toStrPtr(s.EmployeeID),
		DayOfWeek:      string(s.DayOfWeek),
		PeriodNumber:   s.PeriodNumber,
		StartTime:      s.StartTime,
		EndTime:        s.EndTime,
		Semester:       s.Semester,
		Section:        toStrPtr(s.Section),
		Room:           toStrPtr(s.Room),
	}
	if s.Course != nil {
		m.Course = &model.Course{ID: s.Course.ID, Name: s.Course.Name, Code: s.Course.Code}
	}
	if s.Subject != nil {
		m.Subject = &model.Subject{
			ID:   s.Subject.ID,
			Name: s.Subject.Name,
			Code: s.Subject.Code,
		}
	}
	return m
}
