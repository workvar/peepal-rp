package graph_test

import (
	"context"
	"testing"

	"collegeerp/graph"
	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Coursework tests (Phase 6a): one submission row per (student, assignment),
// grading writes marks, and a closed assignment stops accepting work.

// userAuthCtx is authCtx plus a user id, needed wherever a resolver resolves
// the caller's own employee / student profile from the login account.
func userAuthCtx(tenantID, role, userID string) context.Context {
	return context.WithValue(context.Background(), graph.TestAuthKey, graph.AuthContext{
		TenantID: tenantID,
		Role:     role,
		UserID:   userID,
	})
}

func setupAssignmentDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := "host=localhost user=postgres password=postgres dbname=collegeerp_test port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Skipf("test DB unavailable: %v", err)
	}
	if err := db.AutoMigrate(
		&models.User{}, &models.Department{}, &models.Employee{},
		&models.Course{}, &models.Student{}, &models.Subject{},
		&models.StudentAssignment{}, &models.AssignmentSubmission{},
	); err != nil {
		t.Skipf("migrate failed: %v", err)
	}
	t.Cleanup(func() {
		for _, tbl := range []string{
			"assignment_submissions", "student_assignments", "students",
			"subjects", "courses", "employees", "departments", "users",
		} {
			db.Exec("DELETE FROM " + tbl)
		}
	})
	return db
}

// assignmentFixture creates a teacher, a course, and one enrolled student.
func assignmentFixture(t *testing.T, db *gorm.DB) (models.Employee, models.Student, models.Course) {
	t.Helper()
	tu := models.User{TenantID: "t1", Name: "Tina Teacher", Email: "tina@t1.com", Password: "x", Role: models.RoleTeacher, IsActive: true}
	db.Create(&tu)
	teacher := models.Employee{TenantID: "t1", UserID: tu.ID, EmployeeID: "T001"}
	db.Create(&teacher)

	course := models.Course{TenantID: "t1", Name: "BSc CS", Code: "CS"}
	db.Create(&course)

	su := models.User{TenantID: "t1", Name: "Sam Student", Email: "sam@t1.com", Password: "x", Role: models.RoleStudent, IsActive: true}
	db.Create(&su)
	student := models.Student{
		TenantID: "t1", UserID: su.ID, CourseID: course.ID,
		RollNumber: "R001", Semester: 3, Section: "A", AdmissionStatus: "active",
	}
	db.Create(&student)
	return teacher, student, course
}

func TestSubmitAssignment_UpsertsSingleRow(t *testing.T) {
	db := setupAssignmentDB(t)
	r := graph.Resolver{DB: db}
	teacher, student, course := assignmentFixture(t, db)

	a := models.StudentAssignment{
		TenantID: "t1", Title: "Essay", CourseID: course.ID, Semester: 3, Section: "A",
		TeacherID: teacher.ID, MaxMarks: 10, Status: models.AssignmentPublished,
	}
	db.Create(&a)

	ctx := userAuthCtx("t1", "student", student.UserID)
	first := "first attempt"
	if _, err := r.Mutation().SubmitAssignment(ctx, a.ID, model.SubmitAssignmentInput{Text: &first}); err != nil {
		t.Fatalf("first submit: %v", err)
	}
	second := "second attempt"
	if _, err := r.Mutation().SubmitAssignment(ctx, a.ID, model.SubmitAssignmentInput{Text: &second}); err != nil {
		t.Fatalf("resubmit: %v", err)
	}

	var rows []models.AssignmentSubmission
	db.Where("assignment_id = ? AND student_id = ?", a.ID, student.ID).Find(&rows)
	if len(rows) != 1 {
		t.Fatalf("want exactly 1 submission row, got %d", len(rows))
	}
	if rows[0].Text != second {
		t.Errorf("resubmission did not overwrite: got %q", rows[0].Text)
	}
}

func TestGradeAssignmentSubmission_SetsMarks(t *testing.T) {
	db := setupAssignmentDB(t)
	r := graph.Resolver{DB: db}
	teacher, student, course := assignmentFixture(t, db)

	a := models.StudentAssignment{
		TenantID: "t1", Title: "Lab 1", CourseID: course.ID, Semester: 3, Section: "A",
		TeacherID: teacher.ID, MaxMarks: 20, Status: models.AssignmentPublished,
	}
	db.Create(&a)
	sub := models.AssignmentSubmission{
		TenantID: "t1", AssignmentID: a.ID, StudentID: student.ID,
		Text: "done", Status: models.SubmissionSubmitted,
	}
	db.Create(&sub)

	tctx := userAuthCtx("t1", "teacher", teacher.UserID)
	fb := "neat work"
	graded, err := r.Mutation().GradeAssignmentSubmission(tctx, sub.ID, 17, &fb)
	if err != nil {
		t.Fatalf("grade: %v", err)
	}
	if graded.MarksAwarded == nil || *graded.MarksAwarded != 17 {
		t.Errorf("marks not recorded: %+v", graded.MarksAwarded)
	}
	if graded.Status != models.SubmissionGraded {
		t.Errorf("status = %s, want graded", graded.Status)
	}

	// Marks above the assignment maximum must be refused.
	if _, err := r.Mutation().GradeAssignmentSubmission(tctx, sub.ID, 25, nil); err == nil {
		t.Error("expected an error when marks exceed maxMarks")
	}
}

func TestSubmitAssignment_BlockedAfterClose(t *testing.T) {
	db := setupAssignmentDB(t)
	r := graph.Resolver{DB: db}
	teacher, student, course := assignmentFixture(t, db)

	a := models.StudentAssignment{
		TenantID: "t1", Title: "Closed one", CourseID: course.ID, Semester: 3, Section: "A",
		TeacherID: teacher.ID, MaxMarks: 10, Status: models.AssignmentClosed,
	}
	db.Create(&a)

	ctx := userAuthCtx("t1", "student", student.UserID)
	text := "too late"
	if _, err := r.Mutation().SubmitAssignment(ctx, a.ID, model.SubmitAssignmentInput{Text: &text}); err == nil {
		t.Fatal("expected submission to a closed assignment to fail")
	}
}
