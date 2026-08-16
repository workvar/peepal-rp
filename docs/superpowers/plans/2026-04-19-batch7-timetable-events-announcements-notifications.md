# Batch 7: Timetable + Events + Announcements + Notifications Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GraphQL types/queries/mutations for Timetable, Events, Announcements, and Notifications; migrate four frontend pages from Redux/REST to Apollo/GraphQL. Also migrate the announcement fetch on the dashboard page.

**Architecture:** Schema-first gqlgen. Single `comms.resolvers.go` domain file covers events + announcements + notifications. Timetable gets its own `timetable.resolvers.go`.

**Tech Stack:** Go/gqlgen/GORM (backend), Next.js/Apollo Client/TypeScript (frontend)

---

## Critical Context

### gqlgen conventions
- Schema file: `backend/graph/schema.graphqls`
- After editing schema: `cd backend && go generate ./...`
- New stubs in `schema.resolvers.go` → implement in domain files → delete stubs from `schema.resolvers.go`

### Auth context
```go
auth := AuthFromCtx(ctx)
// auth.TenantID, auth.UserID, auth.Role
```

### GORM model facts
- `models.Event`: TenantID, Title, Description, EventDate (time.Time), EndDate (time.Time), Location, Category, Color, IsPublic (bool), CreatedBy (userID string)
- `models.Announcement`: TenantID, Title, Body, AuthorID, Author (User preload), TargetRoles (comma-sep string), Priority, IsPublished (bool), ExpiresAt (*time.Time)
- `models.Notification`: TenantID, UserID, Title, Body, Type, Category, RefID, RefType, IsRead (bool)
- `models.TimetableSlot`: TenantID, AcademicYearID, CourseID, SubjectID, EmployeeID, DayOfWeek (models.DayOfWeek), PeriodNumber (int), StartTime ("HH:MM"), EndTime ("HH:MM"), Semester (int), Section, Room; preloads Course, Subject

### Helpers
Check `helpers.go` and `schema.resolvers.go` before adding: `toStrPtr`, `strVal`, `boolVal`, `intVal`.

### Frontend field mapping (REST → GraphQL)
- `e.event_date` → `e.eventDate`
- `e.end_date` → `e.endDate`
- `e.is_public` → `e.isPublic`
- `e.created_by` → `e.createdBy`
- `a.author_id` → `a.authorId`
- `a.target_roles` → `a.targetRoles`
- `a.is_published` → `a.isPublished`
- `a.expires_at` → `a.expiresAt`
- `n.is_read` → `n.isRead`
- `n.ref_id` → `n.refId`
- `n.ref_type` → `n.refType`
- `slot.academic_year_id` → `slot.academicYearId`
- `slot.course_id` → `slot.courseId`
- `slot.subject_id` → `slot.subjectId`
- `slot.employee_id` → `slot.employeeId`
- `slot.day_of_week` → `slot.dayOfWeek`
- `slot.period_number` → `slot.periodNumber`
- `slot.start_time` → `slot.startTime`
- `slot.end_time` → `slot.endTime`

### Announcement filtering
The REST handler filters announcements in Go by checking `TargetRoles` field contains the user's role or equals "all". Replicate this in the resolver using `strings.Contains(a.TargetRoles, auth.Role) || a.TargetRoles == "all"`.

### Notification helper
`CreateNotification` is a helper in `handlers/notifications.go` used by `handlers/leaves.go` etc. Do NOT break this — it is still used by other REST handlers. Leave `handlers/notifications.go` untouched.

### BulkCreateTimetableSlots
The REST endpoint has a "replace all slots for course+semester+section" bulk create. Mirror this in GraphQL: `bulkCreateTimetableSlots` deletes existing slots for the given scope then creates new ones.

---

## File Structure

**Create:**
- `backend/graph/timetable.resolvers.go`
- `backend/graph/comms.resolvers.go` (events + announcements + notifications)
- `frontend/graphql/queries/timetable.ts`
- `frontend/graphql/mutations/timetable.ts`
- `frontend/graphql/queries/events.ts`
- `frontend/graphql/mutations/events.ts`
- `frontend/graphql/queries/announcements.ts`
- `frontend/graphql/mutations/announcements.ts`
- `frontend/graphql/queries/notifications.ts`
- `frontend/graphql/mutations/notifications.ts`

**Modify:**
- `backend/graph/schema.graphqls`
- `backend/graph/schema.resolvers.go` (remove stubs)
- `frontend/app/[tenant]/(dashboard)/timetable/page.tsx`
- `frontend/app/[tenant]/(dashboard)/events/page.tsx`
- `frontend/app/[tenant]/(dashboard)/announcements/page.tsx`
- `frontend/app/[tenant]/(dashboard)/notifications/page.tsx`
- `frontend/app/[tenant]/(dashboard)/dashboard/page.tsx` (replace announcements Redux fetch)

---

### Task 1: Schema additions for Timetable + Events + Announcements + Notifications

**Files:**
- Modify: `backend/graph/schema.graphqls`

- [ ] **Step 1: Add types to schema.graphqls**

Append after existing type blocks:

```graphql
type TimetableSlot {
  id: ID!
  academicYearId: String
  courseId: String!
  subjectId: String!
  employeeId: String
  dayOfWeek: String!
  periodNumber: Int!
  startTime: String!
  endTime: String!
  semester: Int!
  section: String
  room: String
  course: Course
  subject: Subject
}

type EventItem {
  id: ID!
  title: String!
  description: String
  eventDate: String!
  endDate: String!
  location: String
  category: String!
  color: String
  isPublic: Boolean!
  createdBy: String
}

type AnnouncementItem {
  id: ID!
  title: String!
  body: String!
  authorId: String!
  targetRoles: String!
  priority: String!
  isPublished: Boolean!
  expiresAt: String
  author: User
}

type NotificationItem {
  id: ID!
  userId: String!
  title: String!
  body: String
  type: String!
  category: String!
  refId: String
  refType: String
  isRead: Boolean!
  createdAt: String!
}

type UnreadCount {
  count: Int!
}

input CreateTimetableSlotInput {
  academicYearId: String
  courseId: String!
  subjectId: String!
  employeeId: String
  dayOfWeek: String!
  periodNumber: Int!
  startTime: String!
  endTime: String!
  semester: Int!
  section: String
  room: String
}

input UpdateTimetableSlotInput {
  subjectId: String
  employeeId: String
  dayOfWeek: String
  periodNumber: Int
  startTime: String
  endTime: String
  semester: Int
  section: String
  room: String
}

input BulkCreateTimetableSlotsInput {
  courseId: String!
  academicYearId: String
  semester: Int!
  section: String
  slots: [CreateTimetableSlotInput!]!
}

input CreateEventInput {
  title: String!
  description: String
  eventDate: String!
  endDate: String
  location: String
  category: String!
  color: String
  isPublic: Boolean
}

input UpdateEventInput {
  title: String
  description: String
  eventDate: String
  endDate: String
  location: String
  category: String
  color: String
  isPublic: Boolean
}

input CreateAnnouncementInput {
  title: String!
  body: String!
  targetRoles: String
  priority: String
  isPublished: Boolean
  expiresAt: String
}

input UpdateAnnouncementInput {
  title: String
  body: String
  targetRoles: String
  priority: String
  isPublished: Boolean
  expiresAt: String
}

input SendNotificationInput {
  userId: String!
  title: String!
  body: String
  type: String
  category: String
  refId: String
  refType: String
}
```

- [ ] **Step 2: Add queries and mutations**

In the `Query` type block, add:
```graphql
  timetable(academicYearId: String, courseId: String, semester: Int, section: String, dayOfWeek: String, employeeId: String): [TimetableSlot!]!
  events(category: String): [EventItem!]!
  announcements: [AnnouncementItem!]!
  allAnnouncements: [AnnouncementItem!]!
  myNotifications: [NotificationItem!]!
  unreadNotificationCount: UnreadCount!
```

In the `Mutation` type block, add:
```graphql
  createTimetableSlot(input: CreateTimetableSlotInput!): TimetableSlot!
  updateTimetableSlot(id: ID!, input: UpdateTimetableSlotInput!): TimetableSlot!
  deleteTimetableSlot(id: ID!): Boolean!
  bulkCreateTimetableSlots(input: BulkCreateTimetableSlotsInput!): [TimetableSlot!]!
  createEvent(input: CreateEventInput!): EventItem!
  updateEvent(id: ID!, input: UpdateEventInput!): EventItem!
  deleteEvent(id: ID!): Boolean!
  createAnnouncement(input: CreateAnnouncementInput!): AnnouncementItem!
  updateAnnouncement(id: ID!, input: UpdateAnnouncementInput!): AnnouncementItem!
  deleteAnnouncement(id: ID!): Boolean!
  markNotificationRead(id: ID!): Boolean!
  markAllNotificationsRead: Boolean!
  deleteNotification(id: ID!): Boolean!
  sendNotification(input: SendNotificationInput!): NotificationItem!
```

- [ ] **Step 3: Run gqlgen + build**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go generate ./... && go build ./...
```

- [ ] **Step 4: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add backend/graph/schema.graphqls backend/graph/schema.resolvers.go backend/graph/model/models_gen.go
git commit -m "feat(batch7): add timetable+events+announcements+notifications schema and stubs"
```

---

### Task 2: Backend — timetable.resolvers.go

**Files:**
- Create: `backend/graph/timetable.resolvers.go`

- [ ] **Step 1: Create backend/graph/timetable.resolvers.go**

```go
package graph

import (
	"context"
	"errors"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

func (r *queryResolver) Timetable(ctx context.Context, academicYearID *string, courseID *string, semester *int, section *string, dayOfWeek *string, employeeID *string) ([]*model.TimetableSlot, error) {
	auth := AuthFromCtx(ctx)
	q := r.DB.WithContext(ctx).Preload("Course").Preload("Subject").
		Where("tenant_id = ?", auth.TenantID)
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
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
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
	r.DB.WithContext(ctx).Preload("Course").Preload("Subject").
		Where("id = ? AND tenant_id = ?", slot.ID, auth.TenantID).First(&slot)
	return timetableSlotToModel(slot), nil
}

func (r *mutationResolver) UpdateTimetableSlot(ctx context.Context, id string, input model.UpdateTimetableSlotInput) (*model.TimetableSlot, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
	}
	var slot models.TimetableSlot
	if err := r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&slot).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
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
		r.DB.WithContext(ctx).Model(&slot).Updates(updates)
	}
	r.DB.WithContext(ctx).Preload("Course").Preload("Subject").
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&slot)
	return timetableSlotToModel(slot), nil
}

func (r *mutationResolver) DeleteTimetableSlot(ctx context.Context, id string) (bool, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return false, ErrForbidden
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
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
	}
	section := strVal(input.Section)
	// Delete existing slots for this course/semester/section
	r.DB.WithContext(ctx).Where(
		"tenant_id = ? AND course_id = ? AND semester = ? AND section = ?",
		auth.TenantID, input.CourseID, input.Semester, section,
	).Delete(&models.TimetableSlot{})

	if len(input.Slots) == 0 {
		return []*model.TimetableSlot{}, nil
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
	if err := r.DB.WithContext(ctx).Create(&slots).Error; err != nil {
		return nil, err
	}
	out := make([]*model.TimetableSlot, len(slots))
	for i, s := range slots {
		out[i] = timetableSlotToModel(s)
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
```

- [ ] **Step 2: Remove timetable stubs from schema.resolvers.go**

Delete stubs for: `Timetable`, `CreateTimetableSlot`, `UpdateTimetableSlot`, `DeleteTimetableSlot`, `BulkCreateTimetableSlots`.

- [ ] **Step 3: Build**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add backend/graph/timetable.resolvers.go backend/graph/schema.resolvers.go
git commit -m "feat(batch7): implement timetable resolvers"
```

---

### Task 3: Backend — comms.resolvers.go (events + announcements + notifications)

**Files:**
- Create: `backend/graph/comms.resolvers.go`
- Modify: `backend/graph/schema.resolvers.go` (remove comms stubs)

- [ ] **Step 1: Create backend/graph/comms.resolvers.go**

```go
package graph

import (
	"context"
	"errors"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// ─── Events ───────────────────────────────────────────────────────────────────

func (r *queryResolver) Events(ctx context.Context, category *string) ([]*model.EventItem, error) {
	auth := AuthFromCtx(ctx)
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
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
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
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
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
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return false, ErrForbidden
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
	auth := AuthFromCtx(ctx)
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
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
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
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
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
	r.DB.WithContext(ctx).Preload("Author").Where("id = ? AND tenant_id = ?", a.ID, auth.TenantID).First(&a)
	return announcementToModel(a), nil
}

func (r *mutationResolver) UpdateAnnouncement(ctx context.Context, id string, input model.UpdateAnnouncementInput) (*model.AnnouncementItem, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
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
	r.DB.WithContext(ctx).Preload("Author").Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&a)
	return announcementToModel(a), nil
}

func (r *mutationResolver) DeleteAnnouncement(ctx context.Context, id string) (bool, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return false, ErrForbidden
	}
	r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.Announcement{})
	return true, nil
}

// ─── Notifications ────────────────────────────────────────────────────────────

func (r *queryResolver) MyNotifications(ctx context.Context) ([]*model.NotificationItem, error) {
	auth := AuthFromCtx(ctx)
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
	auth := AuthFromCtx(ctx)
	var count int64
	r.DB.WithContext(ctx).Model(&models.Notification{}).
		Where("tenant_id = ? AND user_id = ? AND is_read = ?", auth.TenantID, auth.UserID, false).
		Count(&count)
	return &model.UnreadCount{Count: int(count)}, nil
}

func (r *mutationResolver) MarkNotificationRead(ctx context.Context, id string) (bool, error) {
	auth := AuthFromCtx(ctx)
	r.DB.WithContext(ctx).Model(&models.Notification{}).
		Where("id = ? AND tenant_id = ? AND user_id = ?", id, auth.TenantID, auth.UserID).
		Update("is_read", true)
	return true, nil
}

func (r *mutationResolver) MarkAllNotificationsRead(ctx context.Context) (bool, error) {
	auth := AuthFromCtx(ctx)
	r.DB.WithContext(ctx).Model(&models.Notification{}).
		Where("tenant_id = ? AND user_id = ? AND is_read = ?", auth.TenantID, auth.UserID, false).
		Update("is_read", true)
	return true, nil
}

func (r *mutationResolver) DeleteNotification(ctx context.Context, id string) (bool, error) {
	auth := AuthFromCtx(ctx)
	r.DB.WithContext(ctx).Where("id = ? AND tenant_id = ? AND user_id = ?", id, auth.TenantID, auth.UserID).
		Delete(&models.Notification{})
	return true, nil
}

func (r *mutationResolver) SendNotification(ctx context.Context, input model.SendNotificationInput) (*model.NotificationItem, error) {
	auth := AuthFromCtx(ctx)
	if auth.Role != "admin" {
		return nil, ErrForbidden
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
			ID: a.Author.ID, Email: a.Author.Email, Name: a.Author.Name,
			Role: string(a.Author.Role), IsActive: a.Author.IsActive,
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
```

**Note:** `auth.Role` in announcements resolver — `auth.Role` is a string (e.g. "admin", "student", "teacher"). The `strings.Contains` check works correctly. Check that `models.User.Role` is a string type (it may be `models.Role` — use `string(a.Author.Role)` in model conversion).

- [ ] **Step 2: Remove comms stubs from schema.resolvers.go**

Delete stubs for: `Events`, `Announcements`, `AllAnnouncements`, `MyNotifications`, `UnreadNotificationCount`, `CreateEvent`, `UpdateEvent`, `DeleteEvent`, `CreateAnnouncement`, `UpdateAnnouncement`, `DeleteAnnouncement`, `MarkNotificationRead`, `MarkAllNotificationsRead`, `DeleteNotification`, `SendNotification`.

- [ ] **Step 3: Build**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP/backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add backend/graph/comms.resolvers.go backend/graph/schema.resolvers.go
git commit -m "feat(batch7): implement events+announcements+notifications resolvers"
```

---

### Task 4: Frontend GraphQL files for Batch 7

**Files:**
- Create 8 files (queries + mutations for timetable, events, announcements, notifications)

- [ ] **Step 1: Create frontend/graphql/queries/timetable.ts**

```typescript
import { gql } from "@apollo/client";

export const LIST_TIMETABLE = gql`
  query ListTimetable($academicYearId: String, $courseId: String, $semester: Int, $section: String, $dayOfWeek: String, $employeeId: String) {
    timetable(academicYearId: $academicYearId, courseId: $courseId, semester: $semester, section: $section, dayOfWeek: $dayOfWeek, employeeId: $employeeId) {
      id
      academicYearId
      courseId
      subjectId
      employeeId
      dayOfWeek
      periodNumber
      startTime
      endTime
      semester
      section
      room
      course { id name code }
      subject { id name code }
    }
  }
`;
```

- [ ] **Step 2: Create frontend/graphql/mutations/timetable.ts**

```typescript
import { gql } from "@apollo/client";

export const CREATE_TIMETABLE_SLOT = gql`
  mutation CreateTimetableSlot($input: CreateTimetableSlotInput!) {
    createTimetableSlot(input: $input) {
      id courseId subjectId dayOfWeek periodNumber startTime endTime semester section room
      course { id name } subject { id name }
    }
  }
`;

export const UPDATE_TIMETABLE_SLOT = gql`
  mutation UpdateTimetableSlot($id: ID!, $input: UpdateTimetableSlotInput!) {
    updateTimetableSlot(id: $id, input: $input) {
      id subjectId employeeId dayOfWeek periodNumber startTime endTime semester section room
      course { id name } subject { id name }
    }
  }
`;

export const DELETE_TIMETABLE_SLOT = gql`
  mutation DeleteTimetableSlot($id: ID!) {
    deleteTimetableSlot(id: $id)
  }
`;

export const BULK_CREATE_TIMETABLE_SLOTS = gql`
  mutation BulkCreateTimetableSlots($input: BulkCreateTimetableSlotsInput!) {
    bulkCreateTimetableSlots(input: $input) {
      id courseId subjectId dayOfWeek periodNumber startTime endTime semester section room
    }
  }
`;
```

- [ ] **Step 3: Create frontend/graphql/queries/events.ts**

```typescript
import { gql } from "@apollo/client";

export const LIST_EVENTS = gql`
  query ListEvents($category: String) {
    events(category: $category) {
      id title description eventDate endDate location category color isPublic createdBy
    }
  }
`;
```

- [ ] **Step 4: Create frontend/graphql/mutations/events.ts**

```typescript
import { gql } from "@apollo/client";

export const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      id title description eventDate endDate location category color isPublic createdBy
    }
  }
`;

export const UPDATE_EVENT = gql`
  mutation UpdateEvent($id: ID!, $input: UpdateEventInput!) {
    updateEvent(id: $id, input: $input) {
      id title description eventDate endDate location category color isPublic
    }
  }
`;

export const DELETE_EVENT = gql`
  mutation DeleteEvent($id: ID!) {
    deleteEvent(id: $id)
  }
`;
```

- [ ] **Step 5: Create frontend/graphql/queries/announcements.ts**

```typescript
import { gql } from "@apollo/client";

export const LIST_ANNOUNCEMENTS = gql`
  query ListAnnouncements {
    announcements {
      id title body authorId targetRoles priority isPublished expiresAt
      author { id name }
    }
  }
`;

export const LIST_ALL_ANNOUNCEMENTS = gql`
  query ListAllAnnouncements {
    allAnnouncements {
      id title body authorId targetRoles priority isPublished expiresAt
      author { id name }
    }
  }
`;
```

- [ ] **Step 6: Create frontend/graphql/mutations/announcements.ts**

```typescript
import { gql } from "@apollo/client";

export const CREATE_ANNOUNCEMENT = gql`
  mutation CreateAnnouncement($input: CreateAnnouncementInput!) {
    createAnnouncement(input: $input) {
      id title body targetRoles priority isPublished expiresAt
    }
  }
`;

export const UPDATE_ANNOUNCEMENT = gql`
  mutation UpdateAnnouncement($id: ID!, $input: UpdateAnnouncementInput!) {
    updateAnnouncement(id: $id, input: $input) {
      id title body targetRoles priority isPublished expiresAt
    }
  }
`;

export const DELETE_ANNOUNCEMENT = gql`
  mutation DeleteAnnouncement($id: ID!) {
    deleteAnnouncement(id: $id)
  }
`;
```

- [ ] **Step 7: Create frontend/graphql/queries/notifications.ts**

```typescript
import { gql } from "@apollo/client";

export const MY_NOTIFICATIONS = gql`
  query MyNotifications {
    myNotifications {
      id userId title body type category refId refType isRead createdAt
    }
  }
`;

export const UNREAD_NOTIFICATION_COUNT = gql`
  query UnreadNotificationCount {
    unreadNotificationCount {
      count
    }
  }
`;
```

- [ ] **Step 8: Create frontend/graphql/mutations/notifications.ts**

```typescript
import { gql } from "@apollo/client";

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(id: $id)
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;

export const DELETE_NOTIFICATION = gql`
  mutation DeleteNotification($id: ID!) {
    deleteNotification(id: $id)
  }
`;

export const SEND_NOTIFICATION = gql`
  mutation SendNotification($input: SendNotificationInput!) {
    sendNotification(input: $input) {
      id userId title type category isRead createdAt
    }
  }
`;
```

- [ ] **Step 9: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add frontend/graphql/queries/timetable.ts frontend/graphql/mutations/timetable.ts frontend/graphql/queries/events.ts frontend/graphql/mutations/events.ts frontend/graphql/queries/announcements.ts frontend/graphql/mutations/announcements.ts frontend/graphql/queries/notifications.ts frontend/graphql/mutations/notifications.ts
git commit -m "feat(batch7): add timetable+events+announcements+notifications GraphQL documents"
```

---

### Task 5: Frontend — timetable/page.tsx migration

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/timetable/page.tsx`

Read the existing timetable page first. Replace Redux `timetableSlice` with Apollo.

- [ ] **Step 1: Read timetable page**

Read `frontend/app/[tenant]/(dashboard)/timetable/page.tsx`.

- [ ] **Step 2: Replace Redux with Apollo**

Remove: `useAppDispatch`, `useAppSelector` (timetable slice), `useEffect` that called dispatch.

Add:
```typescript
import { useQuery, useMutation } from "@apollo/client";
import { useAppSelector } from "@/store/hooks";
import { LIST_TIMETABLE } from "@/graphql/queries/timetable";
import { CREATE_TIMETABLE_SLOT, UPDATE_TIMETABLE_SLOT, DELETE_TIMETABLE_SLOT, BULK_CREATE_TIMETABLE_SLOTS } from "@/graphql/mutations/timetable";
import { LIST_COURSES } from "@/graphql/queries/students";
import { LIST_SUBJECTS } from "@/graphql/queries/academic";
```

Replace Redux state:
```typescript
const { data, loading, refetch } = useQuery(LIST_TIMETABLE, {
  variables: { courseId: filterCourse || undefined, semester: filterSemester || undefined },
})
const slots = data?.timetable ?? []
```

Replace all dispatch calls with mutation calls. Rename field accesses to camelCase per field mapping table above.

- [ ] **Step 3: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/timetable/page.tsx"
git commit -m "feat(batch7): migrate timetable/page to Apollo GraphQL"
```

---

### Task 6: Frontend — events/page.tsx migration

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/events/page.tsx`

Read the existing events page (it is a complex calendar view). Replace Redux `eventSlice` with Apollo.

- [ ] **Step 1: Read events page**

The existing events page at `frontend/app/[tenant]/(dashboard)/events/page.tsx` is a full calendar component. It was saved to `/Users/yasharyan/.claude/projects/-Users-yasharyan-Documents-Claude-Projects-Peepal/2c3af479-0d57-4689-8ba8-d01aa929f5f7/tool-results/bnt68ielj.txt`. Read that file for the full content.

- [ ] **Step 2: Replace Redux with Apollo**

Remove: `useAppDispatch`, `useAppSelector(s => s.events)`, `useEffect` dispatch calls.

Add:
```typescript
import { useQuery, useMutation } from "@apollo/client";
import { useAppSelector } from "@/store/hooks";
import { LIST_EVENTS } from "@/graphql/queries/events";
import { CREATE_EVENT, UPDATE_EVENT, DELETE_EVENT } from "@/graphql/mutations/events";
```

The existing page dispatches `fetchEvents({ month, year })` inside a `useEffect` dependent on `currentDate`. Replace with:
```typescript
const { data, loading, refetch } = useQuery(LIST_EVENTS)
const events = data?.events ?? []
```

Note: The REST endpoint accepted `month` and `year` query params, but our GraphQL `events` query only filters by `category`. Since the calendar component already renders all events and filters by month on the client side, this is fine — just fetch all and filter in the component.

Replace `dispatch(createEvent(form))` etc. with mutation calls. Rename field accesses: `e.event_date` → `e.eventDate`, `e.end_date` → `e.endDate`, `e.is_public` → `e.isPublic`, `e.created_by` → `e.createdBy`.

- [ ] **Step 3: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/events/page.tsx"
git commit -m "feat(batch7): migrate events/page to Apollo GraphQL"
```

---

### Task 7: Frontend — announcements/page.tsx and notifications/page.tsx migration

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/announcements/page.tsx`
- Modify: `frontend/app/[tenant]/(dashboard)/notifications/page.tsx`

- [ ] **Step 1: Read both pages**

Read `frontend/app/[tenant]/(dashboard)/announcements/page.tsx` and `frontend/app/[tenant]/(dashboard)/notifications/page.tsx`.

- [ ] **Step 2: Migrate announcements/page.tsx**

Remove `useAppDispatch`, `useAppSelector(s => s.notification)`, `useEffect` dispatch calls.

Replace with:
```typescript
import { useQuery, useMutation } from "@apollo/client";
import { useAppSelector } from "@/store/hooks";
import { LIST_ALL_ANNOUNCEMENTS } from "@/graphql/queries/announcements";
import { CREATE_ANNOUNCEMENT, UPDATE_ANNOUNCEMENT, DELETE_ANNOUNCEMENT } from "@/graphql/mutations/announcements";

const user = useAppSelector(s => s.auth.user) // auth stays Redux
const isAdmin = user?.role === "admin"

const { data, loading } = useQuery(isAdmin ? LIST_ALL_ANNOUNCEMENTS : undefined, { skip: !isAdmin })
const announcements = data?.allAnnouncements ?? []
```

Rename fields: `a.author_id` → `a.authorId`, `a.target_roles` → `a.targetRoles`, `a.is_published` → `a.isPublished`, `a.expires_at` → `a.expiresAt`.

- [ ] **Step 3: Migrate notifications/page.tsx**

Remove Redux. Replace with:
```typescript
import { useQuery, useMutation } from "@apollo/client";
import { MY_NOTIFICATIONS } from "@/graphql/queries/notifications";
import { MARK_NOTIFICATION_READ, MARK_ALL_NOTIFICATIONS_READ, DELETE_NOTIFICATION } from "@/graphql/mutations/notifications";

const { data, loading } = useQuery(MY_NOTIFICATIONS)
const notifications = data?.myNotifications ?? []
```

Rename: `n.is_read` → `n.isRead`, `n.ref_id` → `n.refId`, `n.ref_type` → `n.refType`.

- [ ] **Step 4: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/announcements/page.tsx" "frontend/app/[tenant]/(dashboard)/notifications/page.tsx"
git commit -m "feat(batch7): migrate announcements+notifications pages to Apollo GraphQL"
```

---

### Task 8: Frontend — dashboard/page.tsx announcements migration

**Files:**
- Modify: `frontend/app/[tenant]/(dashboard)/dashboard/page.tsx`

The dashboard page still uses Redux for `fetchAnnouncements`. Replace it with the `LIST_ANNOUNCEMENTS` Apollo query.

- [ ] **Step 1: Replace announcements fetch in dashboard**

Read `frontend/app/[tenant]/(dashboard)/dashboard/page.tsx` to see current announcements usage.

Add import:
```typescript
import { LIST_ANNOUNCEMENTS } from "@/graphql/queries/announcements";
```

Remove `fetchAnnouncements` dispatch call. Add:
```typescript
const { data: announcementsData } = useQuery(LIST_ANNOUNCEMENTS)
const announcements = announcementsData?.announcements ?? []
```

Replace `announcements` Redux selector usage with the Apollo data.

- [ ] **Step 2: Commit**

```bash
cd /Users/yasharyan/Documents/Claude/Projects/CollERP
git add "frontend/app/[tenant]/(dashboard)/dashboard/page.tsx"
git commit -m "feat(batch7): migrate dashboard announcements feed to Apollo GraphQL"
```
