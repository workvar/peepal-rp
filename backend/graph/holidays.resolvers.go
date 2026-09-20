package graph

import (
	"context"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"
)

func (r *queryResolver) Holidays(ctx context.Context, year *string, academicYearID *string) ([]*model.Holiday, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.Where("tenant_id = ?", auth.TenantID)
	switch {
	case academicYearID != nil && *academicYearID != "":
		q = q.Where("academic_year_id = ? OR academic_year_id = ''", *academicYearID)
	case year != nil && *year != "":
		q = q.Where("STRFTIME('%Y', date) = ?", *year)
	}
	var holidays []models.Holiday
	if err := q.Order("date asc").Find(&holidays).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Holiday, len(holidays))
	for i, h := range holidays {
		out[i] = holidayToModel(h)
	}
	return out, nil
}

func (r *mutationResolver) CreateHoliday(ctx context.Context, input model.CreateHolidayInput) ([]*model.Holiday, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	if input.Name == "" {
		return nil, GQLErr("name is required")
	}
	t := "institutional"
	if input.Type != nil && *input.Type != "" {
		t = *input.Type
	}
	ayID := ""
	if input.AcademicYearID != nil {
		ayID = *input.AcademicYearID
	}

	var start, end time.Time
	switch {
	case input.StartDate != nil && input.EndDate != nil && *input.StartDate != "" && *input.EndDate != "":
		start, err = time.Parse("2006-01-02", *input.StartDate)
		if err != nil {
			return nil, GQLErr("invalid start_date")
		}
		end, err = time.Parse("2006-01-02", *input.EndDate)
		if err != nil {
			return nil, GQLErr("invalid end_date")
		}
		if end.Before(start) {
			return nil, GQLErr("end_date must be on or after start_date")
		}
	case input.Date != nil && *input.Date != "":
		start, err = time.Parse("2006-01-02", *input.Date)
		if err != nil {
			return nil, GQLErr("invalid date")
		}
		end = start
	default:
		return nil, GQLErr("provide date or start_date + end_date")
	}

	var created []*model.Holiday
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		h := models.Holiday{
			TenantID:       auth.TenantID,
			AcademicYearID: ayID,
			Name:           input.Name,
			Date:           d,
			Type:           t,
		}
		if err := r.DB.Create(&h).Error; err != nil {
			continue
		}
		created = append(created, holidayToModel(h))
	}
	if len(created) == 0 {
		return nil, GQLErr("no holidays could be created")
	}
	return created, nil
}

func (r *mutationResolver) DeleteHoliday(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.Holiday{})
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

func (r *mutationResolver) BulkDeleteHolidays(ctx context.Context, ids []string) (int, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return 0, err
	}
	if len(ids) == 0 {
		return 0, GQLErr("provide at least one ID")
	}
	res := r.DB.Where("tenant_id = ? AND id IN ?", auth.TenantID, ids).Delete(&models.Holiday{})
	return int(res.RowsAffected), res.Error
}

func (r *mutationResolver) CopyHolidaysToAcademicYear(ctx context.Context, ids []string, targetAcademicYearID string) (*model.CopyResult, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	if len(ids) == 0 || targetAcademicYearID == "" {
		return nil, GQLErr("provide ids and target_academic_year_id")
	}
	var sources []models.Holiday
	r.DB.Where("tenant_id = ? AND id IN ?", auth.TenantID, ids).Find(&sources)

	copied := 0
	for _, src := range sources {
		h := models.Holiday{
			TenantID:       auth.TenantID,
			AcademicYearID: targetAcademicYearID,
			Name:           src.Name,
			Date:           src.Date,
			Type:           src.Type,
		}
		var existing models.Holiday
		if err := r.DB.Where(
			"tenant_id = ? AND academic_year_id = ? AND name = ? AND date = ?",
			auth.TenantID, targetAcademicYearID, h.Name, h.Date,
		).First(&existing).Error; err != nil {
			r.DB.Create(&h)
			copied++
		}
	}
	return &model.CopyResult{Copied: copied}, nil
}

func holidayToModel(h models.Holiday) *model.Holiday {
	return &model.Holiday{
		ID:             h.ID,
		AcademicYearID: h.AcademicYearID,
		Name:           h.Name,
		Date:           h.Date.Format("2006-01-02"),
		Type:           h.Type,
		AutoGen:        h.AutoGen,
	}
}
