package graph

// Shared Learning Matrix helpers: authz/tenant checks, sequential-lock
// enforcement, and model converters used by the learning resolvers.

import (
	"context"
	"fmt"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"
	"collegeerp/utils"

	"gorm.io/gorm"
)

func isLearningAdmin(a AuthContext) bool {
	return a.Role == "admin" || a.Role == "super_admin" || a.IsSuperAdmin
}

func (r *Resolver) assertGoalInTenant(ctx context.Context, goalID, tenantID string) error {
	var g models.LearningGoal
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", goalID, tenantID).
		First(&g).Error; err != nil {
		return ErrNotFound
	}
	return nil
}

func (r *Resolver) assertSectionInTenant(ctx context.Context, sectionID, tenantID string) error {
	var s models.LearningSection
	if err := r.DB.WithContext(ctx).First(&s, "id = ?", sectionID).Error; err != nil {
		return ErrNotFound
	}
	return r.assertGoalInTenant(ctx, s.GoalID, tenantID)
}

// nextSectionOrderIndex returns the next order_index to use when appending an item
// (unit or assignment) to a section. Items of both types share the same ordering
// dimension per section, so we count across both tables and return count+1.
func (r *Resolver) nextSectionOrderIndex(ctx context.Context, sectionID string) int {
	var units, assigns int64
	r.DB.WithContext(ctx).Model(&models.LearningUnit{}).Where("section_id = ?", sectionID).Count(&units)
	r.DB.WithContext(ctx).Model(&models.LearningAssignment{}).Where("section_id = ?", sectionID).Count(&assigns)
	return int(units+assigns) + 1
}

// assertItemUnlocked enforces sequential locking within and across sections.
func (r *Resolver) assertItemUnlocked(ctx context.Context, egp models.EmployeeGoalProgress, itemID, itemType string) error {
	// Load all sections of the goal ordered by order_index.
	var sections []models.LearningSection
	if err := r.DB.WithContext(ctx).
		Where("goal_id = ?", egp.GoalID).
		Order("order_index asc").Find(&sections).Error; err != nil {
		return err
	}
	// Build the full ordered item list for every section: units+assignments interleaved
	// by order_index.
	type slot struct {
		sectionIdx int
		id         string
		kind       string
	}
	var all []slot
	for si, s := range sections {
		var us []models.LearningUnit
		var as []models.LearningAssignment
		r.DB.WithContext(ctx).Where("section_id = ?", s.ID).Order("order_index asc").Find(&us)
		r.DB.WithContext(ctx).Where("section_id = ?", s.ID).Order("order_index asc").Find(&as)
		// Merge by order_index.
		i, j := 0, 0
		for i < len(us) && j < len(as) {
			if us[i].OrderIndex <= as[j].OrderIndex {
				all = append(all, slot{si, us[i].ID, "unit"})
				i++
			} else {
				all = append(all, slot{si, as[j].ID, "assignment"})
				j++
			}
		}
		for ; i < len(us); i++ {
			all = append(all, slot{si, us[i].ID, "unit"})
		}
		for ; j < len(as); j++ {
			all = append(all, slot{si, as[j].ID, "assignment"})
		}
	}
	// Find target index.
	target := -1
	for i, sl := range all {
		if sl.id == itemID && sl.kind == itemType {
			target = i
			break
		}
	}
	if target <= 0 {
		return nil // first item is always unlocked
	}
	prev := all[target-1]
	if prev.kind == "unit" {
		var up models.UnitProgress
		if err := r.DB.WithContext(ctx).
			Where("employee_goal_progress_id = ? AND unit_id = ?", egp.ID, prev.id).
			First(&up).Error; err == nil && up.Status == "completed" {
			return nil
		}
	} else {
		var ap models.AssignmentProgress
		if err := r.DB.WithContext(ctx).
			Where("employee_goal_progress_id = ? AND assignment_id = ?", egp.ID, prev.id).
			First(&ap).Error; err == nil && ap.Status == "passed" {
			return nil
		}
	}
	return fmt.Errorf("%w: previous item must be completed first", ErrValidation)
}

// ─── Model converters ─────────────────────────────────────────────────────

func goalToModel(db *gorm.DB, g models.LearningGoal) *model.LearningGoal {
	var sections []models.LearningSection
	db.Where("goal_id = ?", g.ID).Order("order_index asc").Find(&sections)
	secModels := make([]*model.LearningSection, len(sections))
	for i, s := range sections {
		secModels[i] = sectionToModel(db, s)
	}
	return &model.LearningGoal{
		ID:          g.ID,
		Title:       g.Title,
		Description: toStrPtrLearning(g.Description),
		DueDate:     datePtrString(g.DueDate),
		IsMandatory: g.IsMandatory,
		Sections:    secModels,
		CreatedAt:   g.CreatedAt.Format(time.RFC3339),
	}
}

func sectionToModel(db *gorm.DB, s models.LearningSection) *model.LearningSection {
	var units []models.LearningUnit
	var assigns []models.LearningAssignment
	db.Where("section_id = ?", s.ID).Order("order_index asc").Find(&units)
	db.Where("section_id = ?", s.ID).Order("order_index asc").Find(&assigns)
	// Merge interleaved. Assignments are loaded with their quiz questions so
	// that a single sections query gives the builder/learner everything.
	items := make([]*model.LearningItem, 0, len(units)+len(assigns))
	i, j := 0, 0
	for i < len(units) && j < len(assigns) {
		if units[i].OrderIndex <= assigns[j].OrderIndex {
			items = append(items, unitToItemModel(units[i]))
			i++
		} else {
			items = append(items, assignmentToItemModelWithQuestions(db, assigns[j]))
			j++
		}
	}
	for ; i < len(units); i++ {
		items = append(items, unitToItemModel(units[i]))
	}
	for ; j < len(assigns); j++ {
		items = append(items, assignmentToItemModelWithQuestions(db, assigns[j]))
	}
	return &model.LearningSection{
		ID:         s.ID,
		GoalID:     s.GoalID,
		Title:      s.Title,
		OrderIndex: s.OrderIndex,
		Items:      items,
	}
}

func unitToItemModel(u models.LearningUnit) *model.LearningItem {
	videoURL := u.VideoURL
	if u.VideoType == "upload" && u.VideoStoragePath != "" {
		videoURL = utils.NewVideoStorage().Resolve(u.VideoStoragePath)
	}
	vt := u.VideoType
	return &model.LearningItem{
		ID:          u.ID,
		SectionID:   u.SectionID,
		ItemType:    "unit",
		OrderIndex:  u.OrderIndex,
		Title:       u.Title,
		Description: toStrPtrLearning(u.Description),
		VideoType:   &vt,
		VideoURL:    toStrPtrLearning(videoURL),
		Content:     toStrPtrLearning(u.Content),
	}
}

// assignmentToItemModel shallow-projects an assignment. Quiz questions are NOT
// loaded here — use assignmentToItemModelWithQuestions when the consumer needs
// them (goal detail / builder).
func assignmentToItemModel(a models.LearningAssignment) *model.LearningItem {
	at := a.AssessmentType
	ps := a.PassScore
	return &model.LearningItem{
		ID:             a.ID,
		SectionID:      a.SectionID,
		ItemType:       "assignment",
		OrderIndex:     a.OrderIndex,
		Title:          a.Title,
		Description:    toStrPtrLearning(a.Description),
		AssessmentType: &at,
		PassScore:      &ps,
	}
}

func assignmentToItemModelWithQuestions(db *gorm.DB, a models.LearningAssignment) *model.LearningItem {
	item := assignmentToItemModel(a)
	var qs []models.LearningQuestion
	db.Where("assignment_id = ?", a.ID).Order("order_index asc").Find(&qs)
	if len(qs) > 0 {
		qModels := make([]*model.LearningQuestion, len(qs))
		for i, q := range qs {
			qModels[i] = questionToModel(q)
		}
		item.Questions = qModels
	}
	return item
}

func questionToModel(q models.LearningQuestion) *model.LearningQuestion {
	return &model.LearningQuestion{
		ID:             q.ID,
		AssignmentID:   q.AssignmentID,
		Kind:           q.Kind,
		Prompt:         q.Prompt,
		Options:        decodeJSONStringArray(q.Options),
		CorrectAnswers: decodeJSONStringArray(q.CorrectAnswers),
		Points:         q.Points,
		OrderIndex:     q.OrderIndex,
	}
}

func goalAssignmentToModel(db *gorm.DB, ga models.GoalAssignment) *model.GoalAssignmentItem {
	return &model.GoalAssignmentItem{
		ID:           ga.ID,
		GoalID:       ga.GoalID,
		DepartmentID: ga.DepartmentID,
		Goal:         goalToModel(db, ga.Goal),
		Department: &model.Department{
			ID:   ga.Department.ID,
			Name: ga.Department.Name,
		},
		CreatedAt: ga.CreatedAt.Format(time.RFC3339),
	}
}

func employeeGoalProgressToModel(db *gorm.DB, egp models.EmployeeGoalProgress) *model.EmployeeGoalProgress {
	// Hydrate goal if not preloaded.
	if egp.Goal.ID == "" {
		db.First(&egp.Goal, "id = ?", egp.GoalID)
	}
	var ups []models.UnitProgress
	var aps []models.AssignmentProgress
	db.Where("employee_goal_progress_id = ?", egp.ID).Find(&ups)
	db.Where("employee_goal_progress_id = ?", egp.ID).Find(&aps)

	items := make([]*model.ItemProgress, 0, len(ups)+len(aps))
	for _, up := range ups {
		items = append(items, &model.ItemProgress{
			ID:          up.ID,
			ItemID:      up.UnitID,
			ItemType:    "unit",
			Status:      up.Status,
			CompletedAt: timePtrString(up.CompletedAt),
		})
	}
	for _, ap := range aps {
		items = append(items, &model.ItemProgress{
			ID:          ap.ID,
			ItemID:      ap.AssignmentID,
			ItemType:    "assignment",
			Status:      ap.Status,
			Score:       ap.Score,
			CompletedAt: timePtrString(ap.CompletedAt),
		})
	}

	return &model.EmployeeGoalProgress{
		ID:           egp.ID,
		EmployeeID:   egp.EmployeeID,
		GoalID:       egp.GoalID,
		Status:       egp.Status,
		CompletedAt:  timePtrString(egp.CompletedAt),
		Goal:         goalToModel(db, egp.Goal),
		ItemProgress: items,
	}
}

// ─── Small shared helpers ─────────────────────────────────────────────────

func stringOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func stringOrDefault(s *string, def string) string {
	if s == nil || *s == "" {
		return def
	}
	return *s
}

func parseDatePtr(s *string) *time.Time {
	if s == nil || *s == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", *s)
	if err != nil {
		return nil
	}
	return &t
}

func datePtrString(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format("2006-01-02")
	return &s
}

func timePtrString(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format(time.RFC3339)
	return &s
}

// toStrPtrLearning is local alias to avoid collision with the one in employees.resolvers.go.
func toStrPtrLearning(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
