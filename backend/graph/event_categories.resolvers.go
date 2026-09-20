package graph

import (
	"context"
	"errors"
	"regexp"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// ─── Event Categories ───────────────────────────────────────────────────────

var slugNonAlnum = regexp.MustCompile(`[^a-z0-9]+`)

// slugify turns a display name into a stable, url-safe category slug.
func slugify(name string) string {
	s := slugNonAlnum.ReplaceAllString(strings.ToLower(strings.TrimSpace(name)), "-")
	return strings.Trim(s, "-")
}

func eventCategoryToModel(c models.EventCategory) *model.EventCategory {
	return &model.EventCategory{
		ID:          c.ID,
		Name:        c.Name,
		Slug:        c.Slug,
		Color:       toStrPtr(c.Color),
		Description: toStrPtr(c.Description),
	}
}

func (r *queryResolver) EventCategories(ctx context.Context) ([]*model.EventCategory, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var cats []models.EventCategory
	if err := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID).
		Order("name asc").Find(&cats).Error; err != nil {
		return nil, err
	}
	out := make([]*model.EventCategory, len(cats))
	for i, c := range cats {
		out[i] = eventCategoryToModel(c)
	}
	return out, nil
}

func (r *mutationResolver) CreateEventCategory(ctx context.Context, input model.CreateEventCategoryInput) (*model.EventCategory, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	slug := slugify(input.Name)
	if slug == "" {
		return nil, ErrValidation
	}
	// Reject duplicates within this tenant (slug is the stable key).
	var existing int64
	if err := r.DB.WithContext(ctx).Model(&models.EventCategory{}).
		Where("tenant_id = ? AND slug = ?", auth.TenantID, slug).Count(&existing).Error; err != nil {
		return nil, err
	}
	if existing > 0 {
		return nil, errors.New("a category with this name already exists")
	}
	cat := models.EventCategory{
		TenantID:    auth.TenantID,
		Name:        strings.TrimSpace(input.Name),
		Slug:        slug,
		Color:       strVal(input.Color),
		Description: strVal(input.Description),
	}
	if err := r.DB.WithContext(ctx).Create(&cat).Error; err != nil {
		return nil, err
	}
	return eventCategoryToModel(cat), nil
}

func (r *mutationResolver) UpdateEventCategory(ctx context.Context, id string, input model.UpdateEventCategoryInput) (*model.EventCategory, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var cat models.EventCategory
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&cat).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	// Renaming leaves the slug fixed so already-tagged events keep their link.
	if input.Name != nil && strings.TrimSpace(*input.Name) != "" {
		cat.Name = strings.TrimSpace(*input.Name)
	}
	if input.Color != nil {
		cat.Color = *input.Color
	}
	if input.Description != nil {
		cat.Description = *input.Description
	}
	if err := r.DB.WithContext(ctx).Save(&cat).Error; err != nil {
		return nil, err
	}
	return eventCategoryToModel(cat), nil
}

func (r *mutationResolver) DeleteEventCategory(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.EventCategory{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}
