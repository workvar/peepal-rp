package graph

// Hall ticket resolvers. Issuing is a bulk, idempotent operation over the
// cohort sitting an exam: every enrolled student gets a row, and the ones who
// fail the eligibility check are stored held with a reason rather than
// skipped, so the exam office sees the whole picture in one list.

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"collegeerp/config"
	"collegeerp/graph/model"
	"collegeerp/models"
	"collegeerp/qrcode"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func (r *queryResolver) HallTickets(ctx context.Context, examScheduleID string, status *string) ([]*model.HallTicket, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff, roleTeacher)
	if err != nil {
		return nil, err
	}
	return listHallTickets(ctx, r.DB, auth.TenantID, examScheduleID, status)
}

// listHallTickets is the shared read used by both the query resolver and the
// issue mutation (which returns the post-run list). Kept separate because a
// mutationResolver cannot call a queryResolver method.
func listHallTickets(
	ctx context.Context,
	db *gorm.DB,
	tenantID, examScheduleID string,
	status *string,
) ([]*model.HallTicket, error) {
	q := db.WithContext(ctx).
		Preload("Student").
		Preload("Student.User").
		Preload("Student.Course").
		Preload("ExamSchedule").
		Where("tenant_id = ? AND exam_schedule_id = ?", tenantID, examScheduleID)
	if status != nil && strings.TrimSpace(*status) != "" {
		q = q.Where("status = ?", strings.TrimSpace(*status))
	}

	var rows []models.HallTicket
	if err := q.Order("ticket_number ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	return hallTicketsToModel(rows), nil
}

// MyHallTickets is the student portal query — always scoped to the caller's
// own student profile, never to an id supplied by the client.
func (r *queryResolver) MyHallTickets(ctx context.Context) ([]*model.HallTicket, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	student, err := LoadStudentByUser(ctx, r.DB, auth.TenantID, auth.UserID)
	if err != nil {
		// A non-student account simply has no hall tickets; that is not an
		// error worth surfacing to the portal.
		return []*model.HallTicket{}, nil
	}

	var rows []models.HallTicket
	if err := r.DB.WithContext(ctx).
		Preload("Student").
		Preload("Student.User").
		Preload("Student.Course").
		Preload("ExamSchedule").
		Where("tenant_id = ? AND student_id = ? AND status = ?", auth.TenantID, student.ID, models.HallTicketIssued).
		Order("created_at DESC").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	return hallTicketsToModel(rows), nil
}

// IssueHallTickets creates one ticket per enrolled student for an exam
// schedule. Re-running it is safe: students who already hold a ticket are
// counted as skipped and left untouched.
func (r *mutationResolver) IssueHallTickets(ctx context.Context, input model.IssueHallTicketsInput) (*model.HallTicketIssueResult, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}

	var schedule models.ExamSchedule
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", input.ExamScheduleID, auth.TenantID).
		First(&schedule).Error; err != nil {
		return nil, errors.New("exam schedule not found")
	}

	students, err := cohortForSchedule(ctx, r.DB, auth.TenantID, schedule, input)
	if err != nil {
		return nil, err
	}
	if len(students) == 0 {
		return nil, errors.New("no enrolled students match this exam schedule — check the course and semester")
	}

	// Existing tickets decide who is skipped; the composite unique index is
	// the real guarantee, this just keeps the run quiet and countable.
	existing := map[string]bool{}
	var priorTickets []models.HallTicket
	if err := r.DB.WithContext(ctx).
		Where("tenant_id = ? AND exam_schedule_id = ?", auth.TenantID, schedule.ID).
		Find(&priorTickets).Error; err != nil {
		return nil, err
	}
	for _, t := range priorTickets {
		existing[t.StudentID] = true
	}

	seq, err := nextTicketSequence(ctx, r.DB, auth.TenantID)
	if err != nil {
		return nil, err
	}

	today := time.Now().Format("2006-01-02")
	result := &model.HallTicketIssueResult{}
	var fresh []models.HallTicket

	for i, s := range students {
		if existing[s.ID] {
			result.Skipped++
			continue
		}
		holdReason := eligibilityHold(ctx, r.DB, auth.TenantID, s, input)

		ticket := models.HallTicket{
			ID:             uuid.NewString(),
			TenantID:       auth.TenantID,
			ExamScheduleID: schedule.ID,
			StudentID:      s.ID,
			TicketNumber:   fmt.Sprintf("HT-%06d", seq),
			SeatNumber:     seatNumber(strVal(input.SeatPrefix), i+1),
			ExamCenter:     strings.TrimSpace(strVal(input.ExamCenter)),
			Eligible:       holdReason == "",
			HoldReason:     holdReason,
			IssuedOn:       today,
			Status:         models.HallTicketIssued,
		}
		if holdReason != "" {
			ticket.Status = models.HallTicketHeld
			result.Held++
		} else {
			result.Issued++
		}
		seq++
		fresh = append(fresh, ticket)
	}

	if len(fresh) > 0 {
		if err := r.DB.WithContext(ctx).Create(&fresh).Error; err != nil {
			return nil, err
		}
	}

	// Return the full list for the schedule so the UI can render the outcome
	// without a second round trip.
	tickets, err := listHallTickets(ctx, r.DB, auth.TenantID, schedule.ID, nil)
	if err != nil {
		return nil, err
	}
	result.Tickets = tickets
	return result, nil
}

func (r *mutationResolver) RevokeHallTicket(ctx context.Context, id string) (*model.HallTicket, error) {
	return r.setHallTicketStatus(ctx, id, models.HallTicketRevoked, false, "revoked by the exam office")
}

// ReleaseHallTicketHold clears the hold and makes the ticket valid for entry.
func (r *mutationResolver) ReleaseHallTicketHold(ctx context.Context, id string) (*model.HallTicket, error) {
	return r.setHallTicketStatus(ctx, id, models.HallTicketIssued, true, "")
}

// setHallTicketStatus is the shared write path for revoke/release.
func (r *mutationResolver) setHallTicketStatus(
	ctx context.Context,
	id, status string,
	eligible bool,
	reason string,
) (*model.HallTicket, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	res := r.DB.WithContext(ctx).
		Model(&models.HallTicket{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Updates(map[string]interface{}{
			"status":      status,
			"eligible":    eligible,
			"hold_reason": reason,
		})
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}

	var ticket models.HallTicket
	if err := r.DB.WithContext(ctx).
		Preload("Student").
		Preload("Student.User").
		Preload("Student.Course").
		Preload("ExamSchedule").
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		First(&ticket).Error; err != nil {
		return nil, ErrNotFound
	}
	return hallTicketToModel(ticket), nil
}

// --- helpers ---

// cohortForSchedule resolves which students sit this exam. The schedule itself
// carries only a semester number, so the course comes from the input; without
// one, every course in that semester is covered.
func cohortForSchedule(
	ctx context.Context,
	db *gorm.DB,
	tenantID string,
	schedule models.ExamSchedule,
	input model.IssueHallTicketsInput,
) ([]models.Student, error) {
	semester := schedule.SemesterNumber
	if input.SemesterNumber != nil && *input.SemesterNumber > 0 {
		semester = *input.SemesterNumber
	}

	q := db.WithContext(ctx).
		Preload("User").
		Preload("Course").
		Where("tenant_id = ? AND admission_status = ?", tenantID, "active")
	if semester > 0 {
		q = q.Where("semester = ?", semester)
	}
	if courseID := strings.TrimSpace(strVal(input.CourseID)); courseID != "" {
		q = q.Where("course_id = ?", courseID)
	}

	var students []models.Student
	if err := q.Order("roll_number ASC").Find(&students).Error; err != nil {
		return nil, err
	}
	return students, nil
}

// eligibilityHold runs the optional gates and returns a hold reason, or "" when
// the student is clear. Checks are additive: the first failure wins, since one
// reason is enough for the office to act on.
func eligibilityHold(
	ctx context.Context,
	db *gorm.DB,
	tenantID string,
	student models.Student,
	input model.IssueHallTicketsInput,
) string {
	if derefBool(input.CheckFeeDues) {
		if due := outstandingFeeDue(ctx, db, tenantID, student.ID); due > 0 {
			return fmt.Sprintf("outstanding fee dues of %.2f", due)
		}
	}
	if input.MinAttendancePercent != nil && *input.MinAttendancePercent > 0 {
		pct, ok := attendancePercent(ctx, db, tenantID, student.ID)
		if ok && pct < *input.MinAttendancePercent {
			return fmt.Sprintf("attendance %.1f%% is below the required %.1f%%", pct, *input.MinAttendancePercent)
		}
	}
	return ""
}

// outstandingFeeDue totals net-minus-paid across a student's fee records.
func outstandingFeeDue(ctx context.Context, db *gorm.DB, tenantID, studentID string) float64 {
	var fees []models.StudentFee
	if err := db.WithContext(ctx).
		Where("tenant_id = ? AND student_id = ?", tenantID, studentID).
		Find(&fees).Error; err != nil {
		return 0
	}
	var due float64
	for _, f := range fees {
		if bal := f.NetAmount - f.PaidAmount; bal > 0 {
			due += bal
		}
	}
	return due
}

// attendancePercent returns the student's present-rate. The bool reports
// whether there was any attendance data at all — with no records we must not
// hold a student at 0%.
func attendancePercent(ctx context.Context, db *gorm.DB, tenantID, studentID string) (float64, bool) {
	// Two independent queries rather than a reused builder — chaining a second
	// Where onto a *gorm.DB that has already run mutates the same statement.
	countRows := func(extra func(*gorm.DB) *gorm.DB) (int64, error) {
		q := db.WithContext(ctx).Model(&models.Attendance{}).
			Where("tenant_id = ? AND entity_type = ? AND entity_id = ?", tenantID, "student", studentID)
		if extra != nil {
			q = extra(q)
		}
		var n int64
		return n, q.Count(&n).Error
	}

	total, err := countRows(nil)
	if err != nil || total == 0 {
		return 0, false
	}
	present, err := countRows(func(q *gorm.DB) *gorm.DB {
		return q.Where("status IN ?", []string{
			string(models.AttendancePresent),
			string(models.AttendanceLate),
		})
	})
	if err != nil {
		return 0, false
	}
	return float64(present) / float64(total) * 100, true
}

// nextTicketSequence returns the next per-tenant ticket number. Counting rows
// is enough: tickets are never hard-deleted outside a student cascade, and the
// number is a human handle, not a key.
func nextTicketSequence(ctx context.Context, db *gorm.DB, tenantID string) (int, error) {
	var count int64
	if err := db.WithContext(ctx).Model(&models.HallTicket{}).
		Where("tenant_id = ?", tenantID).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return int(count) + 1, nil
}

// seatNumber formats a sequential seat, e.g. "A-012". A blank prefix yields a
// plain number.
func seatNumber(prefix string, n int) string {
	prefix = strings.TrimSpace(prefix)
	if prefix == "" {
		return fmt.Sprintf("%03d", n)
	}
	return fmt.Sprintf("%s-%03d", prefix, n)
}

func hallTicketsToModel(rows []models.HallTicket) []*model.HallTicket {
	out := make([]*model.HallTicket, len(rows))
	for i, row := range rows {
		out[i] = hallTicketToModel(row)
	}
	return out
}

func hallTicketToModel(h models.HallTicket) *model.HallTicket {
	m := &model.HallTicket{
		ID:             h.ID,
		ExamScheduleID: h.ExamScheduleID,
		StudentID:      h.StudentID,
		TicketNumber:   h.TicketNumber,
		Eligible:       h.Eligible,
		Status:         h.Status,
		// The QR is built on read rather than stored: the signature derives
		// from the JWT secret, so a rotated secret must invalidate old codes.
		QRPayload: qrcode.VerifyURL(config.App.AppBaseURL, h.TenantID, qrcode.KindHallTicket, h.ID),
	}
	m.SeatNumber = toStrPtr(h.SeatNumber)
	m.ExamCenter = toStrPtr(h.ExamCenter)
	m.HoldReason = toStrPtr(h.HoldReason)
	m.IssuedOn = toStrPtr(h.IssuedOn)
	if !h.CreatedAt.IsZero() {
		m.CreatedAt = toStrPtr(h.CreatedAt.Format(time.RFC3339))
	}
	if h.Student.ID != "" {
		m.Student = studentToModel(h.Student)
	}
	if h.ExamSchedule.ID != "" {
		m.ExamSchedule = examScheduleToModel(h.ExamSchedule)
	}
	return m
}
