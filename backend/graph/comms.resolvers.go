package graph

import (
	"context"
	"errors"
	"strings"
	"time"

	"collegeerp/database"
	"collegeerp/graph/model"
	"collegeerp/models"
	"collegeerp/push"

	"gorm.io/gorm"
)

// ─── Events ───────────────────────────────────────────────────────────────────

func (r *queryResolver) Events(ctx context.Context, category *string) ([]*model.EventItem, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID)
	if category != nil && *category != "" {
		q = q.Where("category = ?", *category)
	}
	var events []models.Event
	if err := q.Order("event_date asc").Find(&events).Error; err != nil {
		return nil, err
	}
	out := make([]*model.EventItem, len(events))
	for i, e := range events {
		out[i] = eventToModel(e)
	}
	return out, nil
}

func (r *mutationResolver) CreateEvent(ctx context.Context, input model.CreateEventInput) (*model.EventItem, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	eventDate, err := time.Parse("2006-01-02", input.EventDate)
	if err != nil {
		return nil, ErrValidation
	}
	endDate := eventDate
	if input.EndDate != nil && *input.EndDate != "" {
		if t, err := time.Parse("2006-01-02", *input.EndDate); err == nil {
			endDate = t
		}
	}
	isPublic := true
	if input.IsPublic != nil {
		isPublic = *input.IsPublic
	}
	event := models.Event{
		TenantID:    auth.TenantID,
		Title:       input.Title,
		Description: strVal(input.Description),
		EventDate:   eventDate,
		EndDate:     endDate,
		Location:    strVal(input.Location),
		Category:    input.Category,
		Color:       strVal(input.Color),
		IsPublic:    isPublic,
		CreatedBy:   auth.UserID,
	}
	if err := r.DB.WithContext(ctx).Create(&event).Error; err != nil {
		return nil, err
	}
	return eventToModel(event), nil
}

func (r *mutationResolver) UpdateEvent(ctx context.Context, id string, input model.UpdateEventInput) (*model.EventItem, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var event models.Event
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&event).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if input.Title != nil {
		event.Title = *input.Title
	}
	if input.Description != nil {
		event.Description = *input.Description
	}
	if input.Location != nil {
		event.Location = *input.Location
	}
	if input.Category != nil {
		event.Category = *input.Category
	}
	if input.Color != nil {
		event.Color = *input.Color
	}
	if input.IsPublic != nil {
		event.IsPublic = *input.IsPublic
	}
	if input.EventDate != nil && *input.EventDate != "" {
		if t, err := time.Parse("2006-01-02", *input.EventDate); err == nil {
			event.EventDate = t
		}
	}
	if input.EndDate != nil && *input.EndDate != "" {
		if t, err := time.Parse("2006-01-02", *input.EndDate); err == nil {
			event.EndDate = t
		}
	}
	if err := r.DB.WithContext(ctx).Save(&event).Error; err != nil {
		return nil, err
	}
	return eventToModel(event), nil
}

func (r *mutationResolver) DeleteEvent(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.Event{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// ─── Announcements ────────────────────────────────────────────────────────────

func (r *queryResolver) Announcements(ctx context.Context) ([]*model.AnnouncementItem, error) {
	// Role-filtered below via TargetRoles; any authenticated user may read.
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var all []models.Announcement
	if err := r.DB.WithContext(ctx).
		Where("announcements.tenant_id = ? AND announcements.is_published = ?", auth.TenantID, true).
		Preload("Author").Order("announcements.created_at DESC").Find(&all).Error; err != nil {
		return nil, err
	}
	var visible []*model.AnnouncementItem
	for _, a := range all {
		if a.TargetRoles == "all" || strings.Contains(a.TargetRoles, auth.Role) {
			if a.ExpiresAt == nil || a.ExpiresAt.After(time.Now()) {
				visible = append(visible, announcementToModel(a))
			}
		}
	}
	if visible == nil {
		visible = []*model.AnnouncementItem{}
	}
	return visible, nil
}

func (r *queryResolver) AllAnnouncements(ctx context.Context) ([]*model.AnnouncementItem, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var announcements []models.Announcement
	if err := r.DB.WithContext(ctx).Where("tenant_id = ?", auth.TenantID).
		Preload("Author").Order("created_at DESC").Find(&announcements).Error; err != nil {
		return nil, err
	}
	out := make([]*model.AnnouncementItem, len(announcements))
	for i, a := range announcements {
		out[i] = announcementToModel(a)
	}
	return out, nil
}

func (r *mutationResolver) CreateAnnouncement(ctx context.Context, input model.CreateAnnouncementInput) (*model.AnnouncementItem, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	targetRoles := "all"
	if input.TargetRoles != nil && *input.TargetRoles != "" {
		targetRoles = *input.TargetRoles
	}
	priority := "normal"
	if input.Priority != nil && *input.Priority != "" {
		priority = *input.Priority
	}
	published := true
	if input.IsPublished != nil {
		published = *input.IsPublished
	}
	a := models.Announcement{
		TenantID:    auth.TenantID,
		Title:       input.Title,
		Body:        input.Body,
		AuthorID:    auth.UserID,
		TargetRoles: targetRoles,
		Priority:    priority,
		IsPublished: published,
	}
	if input.ExpiresAt != nil && *input.ExpiresAt != "" {
		if t, err := time.Parse("2006-01-02", *input.ExpiresAt); err == nil {
			a.ExpiresAt = &t
		}
	}
	if err := r.DB.WithContext(ctx).Create(&a).Error; err != nil {
		return nil, err
	}
	if err := r.DB.WithContext(ctx).Preload("Author").Where("id = ? AND tenant_id = ?", a.ID, auth.TenantID).First(&a).Error; err != nil {
		return nil, err
	}
	return announcementToModel(a), nil
}

func (r *mutationResolver) UpdateAnnouncement(ctx context.Context, id string, input model.UpdateAnnouncementInput) (*model.AnnouncementItem, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var a models.Announcement
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&a).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if input.Title != nil {
		a.Title = *input.Title
	}
	if input.Body != nil {
		a.Body = *input.Body
	}
	if input.TargetRoles != nil {
		a.TargetRoles = *input.TargetRoles
	}
	if input.Priority != nil {
		a.Priority = *input.Priority
	}
	if input.IsPublished != nil {
		a.IsPublished = *input.IsPublished
	}
	if input.ExpiresAt != nil && *input.ExpiresAt != "" {
		if t, err := time.Parse("2006-01-02", *input.ExpiresAt); err == nil {
			a.ExpiresAt = &t
		}
	}
	if err := r.DB.WithContext(ctx).Save(&a).Error; err != nil {
		return nil, err
	}
	if err := r.DB.WithContext(ctx).Preload("Author").Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&a).Error; err != nil {
		return nil, err
	}
	return announcementToModel(a), nil
}

func (r *mutationResolver) DeleteAnnouncement(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.Announcement{})
	if res.Error != nil {
		return false, res.Error
	}
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// ─── Notifications ────────────────────────────────────────────────────────────

func (r *queryResolver) MyNotifications(ctx context.Context) ([]*model.NotificationItem, error) {
	// Self-service: scoped to auth.UserID below.
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var notifications []models.Notification
	if err := r.DB.WithContext(ctx).Where("tenant_id = ? AND user_id = ?", auth.TenantID, auth.UserID).
		Order("created_at DESC").Limit(50).Find(&notifications).Error; err != nil {
		return nil, err
	}
	out := make([]*model.NotificationItem, len(notifications))
	for i, n := range notifications {
		out[i] = notificationToModel(n)
	}
	return out, nil
}

func (r *queryResolver) UnreadNotificationCount(ctx context.Context) (*model.UnreadCount, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var count int64
	if err := r.DB.WithContext(ctx).Model(&models.Notification{}).
		Where("tenant_id = ? AND user_id = ? AND is_read = ?", auth.TenantID, auth.UserID, false).
		Count(&count).Error; err != nil {
		return nil, err
	}
	return &model.UnreadCount{Count: int(count)}, nil
}

func (r *mutationResolver) MarkNotificationRead(ctx context.Context, id string) (bool, error) {
	// Self-service: scoped to auth.UserID below.
	auth, err := requireAuth(ctx)
	if err != nil {
		return false, err
	}
	r.DB.WithContext(ctx).Model(&models.Notification{}).
		Where("id = ? AND tenant_id = ? AND user_id = ?", id, auth.TenantID, auth.UserID).
		Update("is_read", true)
	return true, nil
}

func (r *mutationResolver) MarkAllNotificationsRead(ctx context.Context) (bool, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return false, err
	}
	r.DB.WithContext(ctx).Model(&models.Notification{}).
		Where("tenant_id = ? AND user_id = ? AND is_read = ?", auth.TenantID, auth.UserID, false).
		Update("is_read", true)
	return true, nil
}

func (r *mutationResolver) DeleteNotification(ctx context.Context, id string) (bool, error) {
	// Self-service: scoped to auth.UserID below.
	auth, err := requireAuth(ctx)
	if err != nil {
		return false, err
	}
	r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ? AND user_id = ?", id, auth.TenantID, auth.UserID).
		Delete(&models.Notification{})
	return true, nil
}

func (r *mutationResolver) SendNotification(ctx context.Context, input model.SendNotificationInput) (*model.NotificationItem, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	notifType := "info"
	if input.Type != nil && *input.Type != "" {
		notifType = *input.Type
	}
	category := "general"
	if input.Category != nil && *input.Category != "" {
		category = *input.Category
	}
	n := models.Notification{
		TenantID: auth.TenantID,
		UserID:   input.UserID,
		Title:    input.Title,
		Body:     strVal(input.Body),
		Type:     notifType,
		Category: category,
		RefID:    strVal(input.RefID),
		RefType:  strVal(input.RefType),
	}
	if err := r.DB.WithContext(ctx).Create(&n).Error; err != nil {
		return nil, err
	}
	// The row is the durable record; the push is a courtesy copy delivered in
	// the background, so a push outage can never fail this mutation.
	push.NotifyRecord(database.DB, n)
	return notificationToModel(n), nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func eventToModel(e models.Event) *model.EventItem {
	return &model.EventItem{
		ID:          e.ID,
		Title:       e.Title,
		Description: toStrPtr(e.Description),
		EventDate:   e.EventDate.Format("2006-01-02"),
		EndDate:     e.EndDate.Format("2006-01-02"),
		Location:    toStrPtr(e.Location),
		Category:    e.Category,
		Color:       toStrPtr(e.Color),
		IsPublic:    e.IsPublic,
		CreatedBy:   toStrPtr(e.CreatedBy),
	}
}

func announcementToModel(a models.Announcement) *model.AnnouncementItem {
	m := &model.AnnouncementItem{
		ID:          a.ID,
		Title:       a.Title,
		Body:        a.Body,
		AuthorID:    a.AuthorID,
		TargetRoles: a.TargetRoles,
		Priority:    a.Priority,
		IsPublished: a.IsPublished,
	}
	if a.ExpiresAt != nil {
		s := a.ExpiresAt.Format("2006-01-02")
		m.ExpiresAt = &s
	}
	if a.Author.ID != "" {
		m.Author = &model.User{
			ID:       a.Author.ID,
			Email:    a.Author.Email,
			Name:     a.Author.Name,
			Role:     string(a.Author.Role),
			IsActive: a.Author.IsActive,
		}
	}
	return m
}

func notificationToModel(n models.Notification) *model.NotificationItem {
	return &model.NotificationItem{
		ID:        n.ID,
		UserID:    n.UserID,
		Title:     n.Title,
		Body:      toStrPtr(n.Body),
		Type:      n.Type,
		Category:  n.Category,
		RefID:     toStrPtr(n.RefID),
		RefType:   toStrPtr(n.RefType),
		IsRead:    n.IsRead,
		CreatedAt: n.CreatedAt.Format(time.RFC3339),
	}
}
