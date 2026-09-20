package graph_test

// Learning Matrix resolver tests.
//
// These tests require a reachable PostgreSQL server (DSN as per
// setupTestDB). They mirror the 8 verification cases in the design spec.

import (
	"errors"
	"testing"

	"collegeerp/graph"
	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupLearningDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := "host=localhost user=postgres password=postgres dbname=collegeerp_test port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Skipf("test DB unavailable: %v", err)
	}
	db.AutoMigrate(
		&models.User{},
		&models.Department{},
		&models.Employee{},
		&models.LearningGoal{},
		&models.LearningSection{},
		&models.LearningUnit{},
		&models.LearningAssignment{},
		&models.GoalAssignment{},
		&models.EmployeeGoalProgress{},
		&models.UnitProgress{},
		&models.AssignmentProgress{},
	)
	t.Cleanup(func() {
		db.Exec("DELETE FROM unit_progresses")
		db.Exec("DELETE FROM assignment_progresses")
		db.Exec("DELETE FROM employee_goal_progresses")
		db.Exec("DELETE FROM goal_assignments")
		db.Exec("DELETE FROM learning_units")
		db.Exec("DELETE FROM learning_assignments")
		db.Exec("DELETE FROM learning_sections")
		db.Exec("DELETE FROM learning_goals")
		db.Exec("DELETE FROM employees")
		db.Exec("DELETE FROM departments")
		db.Exec("DELETE FROM users")
	})
	return db
}

// seedGoalWithItems creates a goal with two sections; section 1 has a unit + an
// assignment, section 2 has a unit. Returns IDs for later use.
func seedGoalWithItems(t *testing.T, db *gorm.DB, tenantID string) (goalID, s1UnitID, s1AssignID, s2UnitID string) {
	goal := models.LearningGoal{TenantID: tenantID, Title: "Onboarding", IsMandatory: true}
	if err := db.Create(&goal).Error; err != nil {
		t.Fatalf("create goal: %v", err)
	}
	s1 := models.LearningSection{GoalID: goal.ID, Title: "Getting Started", OrderIndex: 0}
	s2 := models.LearningSection{GoalID: goal.ID, Title: "Advanced", OrderIndex: 1}
	db.Create(&s1)
	db.Create(&s2)
	u1 := models.LearningUnit{SectionID: s1.ID, Title: "Intro video", OrderIndex: 0, VideoType: "external", VideoURL: "https://youtu.be/x"}
	a1 := models.LearningAssignment{SectionID: s1.ID, Title: "Quiz 1", OrderIndex: 1, AssessmentType: "completion"}
	u2 := models.LearningUnit{SectionID: s2.ID, Title: "Deep dive", OrderIndex: 0, VideoType: "none"}
	db.Create(&u1)
	db.Create(&a1)
	db.Create(&u2)
	return goal.ID, u1.ID, a1.ID, u2.ID
}

// 1. assignGoalToDepartment creates progress rows for every employee.
func TestAssignGoalToDepartment_CreatesProgressRows(t *testing.T) {
	db := setupLearningDB(t)
	tenant := "t-1"

	dept := models.Department{TenantID: tenant, Name: "Engineering"}
	db.Create(&dept)
	u1 := models.User{TenantID: tenant, Name: "A", Email: "a@t.com", Password: "x", Role: models.RoleStaff, IsActive: true}
	u2 := models.User{TenantID: tenant, Name: "B", Email: "b@t.com", Password: "x", Role: models.RoleStaff, IsActive: true}
	db.Create(&u1)
	db.Create(&u2)
	e1 := models.Employee{TenantID: tenant, UserID: u1.ID, DepartmentID: dept.ID, EmployeeID: "E1"}
	e2 := models.Employee{TenantID: tenant, UserID: u2.ID, DepartmentID: dept.ID, EmployeeID: "E2"}
	db.Create(&e1)
	db.Create(&e2)

	goalID, _, _, _ := seedGoalWithItems(t, db, tenant)

	r := graph.Resolver{DB: db}
	if _, err := r.Mutation().AssignGoalToDepartment(authCtx(tenant, "admin"), goalID, dept.ID); err != nil {
		t.Fatalf("assign: %v", err)
	}

	var egpCount int64
	db.Model(&models.EmployeeGoalProgress{}).Where("goal_id = ?", goalID).Count(&egpCount)
	if egpCount != 2 {
		t.Fatalf("want 2 EGP rows, got %d", egpCount)
	}
	var upCount, apCount int64
	db.Model(&models.UnitProgress{}).Count(&upCount)
	db.Model(&models.AssignmentProgress{}).Count(&apCount)
	if upCount != 4 { // 2 units × 2 employees
		t.Errorf("want 4 UnitProgress rows, got %d", upCount)
	}
	if apCount != 2 { // 1 assignment × 2 employees
		t.Errorf("want 2 AssignmentProgress rows, got %d", apCount)
	}
}

// 2. Duplicate assignment returns a descriptive error.
func TestAssignGoalToDepartment_DuplicateReturnsError(t *testing.T) {
	db := setupLearningDB(t)
	tenant := "t-2"
	dept := models.Department{TenantID: tenant, Name: "HR"}
	db.Create(&dept)
	goalID, _, _, _ := seedGoalWithItems(t, db, tenant)

	r := graph.Resolver{DB: db}
	if _, err := r.Mutation().AssignGoalToDepartment(authCtx(tenant, "admin"), goalID, dept.ID); err != nil {
		t.Fatalf("first assign: %v", err)
	}
	if _, err := r.Mutation().AssignGoalToDepartment(authCtx(tenant, "admin"), goalID, dept.ID); err == nil {
		t.Fatal("expected duplicate error")
	} else if !errors.Is(err, graph.ErrValidation) {
		t.Errorf("expected ErrValidation, got %v", err)
	}
}

// 3. updateItemProgress on a locked item returns an error.
func TestUpdateItemProgress_Locked(t *testing.T) {
	db := setupLearningDB(t)
	tenant := "t-3"
	dept := models.Department{TenantID: tenant, Name: "Ops"}
	db.Create(&dept)
	u := models.User{TenantID: tenant, Name: "X", Email: "x@t.com", Password: "x", Role: models.RoleStaff, IsActive: true}
	db.Create(&u)
	emp := models.Employee{TenantID: tenant, UserID: u.ID, DepartmentID: dept.ID, EmployeeID: "X1"}
	db.Create(&emp)
	goalID, _, s1Assign, _ := seedGoalWithItems(t, db, tenant)

	r := graph.Resolver{DB: db}
	if _, err := r.Mutation().AssignGoalToDepartment(authCtx(tenant, "admin"), goalID, dept.ID); err != nil {
		t.Fatalf("assign: %v", err)
	}
	var egp models.EmployeeGoalProgress
	db.Where("goal_id = ? AND employee_id = ?", goalID, emp.ID).First(&egp)

	// Attempt to complete the assignment (position 1) before the unit (position 0).
	_, err := r.Mutation().UpdateItemProgress(authCtx(tenant, "admin"), model.UpdateItemProgressInput{
		EmployeeGoalProgressID: egp.ID,
		ItemID:                 s1Assign,
		ItemType:               "assignment",
		Status:                 "passed",
	})
	if err == nil {
		t.Fatal("expected lock error")
	}
	if !errors.Is(err, graph.ErrValidation) {
		t.Errorf("expected ErrValidation, got %v", err)
	}
}

// 4. All units completed + assignments passed → EGP.status = "completed".
func TestUpdateItemProgress_AutoCompletes(t *testing.T) {
	db := setupLearningDB(t)
	tenant := "t-4"
	dept := models.Department{TenantID: tenant, Name: "Eng"}
	db.Create(&dept)
	u := models.User{TenantID: tenant, Name: "Z", Email: "z@t.com", Password: "x", Role: models.RoleStaff, IsActive: true}
	db.Create(&u)
	emp := models.Employee{TenantID: tenant, UserID: u.ID, DepartmentID: dept.ID, EmployeeID: "Z1"}
	db.Create(&emp)
	goalID, s1Unit, s1Assign, s2Unit := seedGoalWithItems(t, db, tenant)

	r := graph.Resolver{DB: db}
	r.Mutation().AssignGoalToDepartment(authCtx(tenant, "admin"), goalID, dept.ID)
	var egp models.EmployeeGoalProgress
	db.Where("goal_id = ? AND employee_id = ?", goalID, emp.ID).First(&egp)

	steps := []struct {
		id, kind, status string
	}{
		{s1Unit, "unit", "completed"},
		{s1Assign, "assignment", "passed"},
		{s2Unit, "unit", "completed"},
	}
	for _, step := range steps {
		if _, err := r.Mutation().UpdateItemProgress(authCtx(tenant, "admin"), model.UpdateItemProgressInput{
			EmployeeGoalProgressID: egp.ID,
			ItemID:                 step.id,
			ItemType:               step.kind,
			Status:                 step.status,
		}); err != nil {
			t.Fatalf("step %v: %v", step, err)
		}
	}
	db.First(&egp, "id = ?", egp.ID)
	if egp.Status != "completed" {
		t.Errorf("want status=completed, got %s", egp.Status)
	}
}

// 5. Partial completion → EGP status = "in_progress".
func TestUpdateItemProgress_PartialInProgress(t *testing.T) {
	db := setupLearningDB(t)
	tenant := "t-5"
	dept := models.Department{TenantID: tenant, Name: "Ops"}
	db.Create(&dept)
	u := models.User{TenantID: tenant, Name: "Y", Email: "y@t.com", Password: "x", Role: models.RoleStaff, IsActive: true}
	db.Create(&u)
	emp := models.Employee{TenantID: tenant, UserID: u.ID, DepartmentID: dept.ID, EmployeeID: "Y1"}
	db.Create(&emp)
	goalID, s1Unit, _, _ := seedGoalWithItems(t, db, tenant)

	r := graph.Resolver{DB: db}
	r.Mutation().AssignGoalToDepartment(authCtx(tenant, "admin"), goalID, dept.ID)
	var egp models.EmployeeGoalProgress
	db.Where("goal_id = ? AND employee_id = ?", goalID, emp.ID).First(&egp)

	if _, err := r.Mutation().UpdateItemProgress(authCtx(tenant, "admin"), model.UpdateItemProgressInput{
		EmployeeGoalProgressID: egp.ID,
		ItemID:                 s1Unit,
		ItemType:               "unit",
		Status:                 "completed",
	}); err != nil {
		t.Fatalf("complete unit: %v", err)
	}
	db.First(&egp, "id = ?", egp.ID)
	if egp.Status != "in_progress" {
		t.Errorf("want in_progress, got %s", egp.Status)
	}
}

// 6. Score missing for score-based assignment returns validation error.
func TestUpdateItemProgress_ScoreMissing(t *testing.T) {
	db := setupLearningDB(t)
	tenant := "t-6"
	dept := models.Department{TenantID: tenant, Name: "QA"}
	db.Create(&dept)
	u := models.User{TenantID: tenant, Name: "S", Email: "s@t.com", Password: "x", Role: models.RoleStaff, IsActive: true}
	db.Create(&u)
	emp := models.Employee{TenantID: tenant, UserID: u.ID, DepartmentID: dept.ID, EmployeeID: "S1"}
	db.Create(&emp)

	goal := models.LearningGoal{TenantID: tenant, Title: "ScoredOnly", IsMandatory: true}
	db.Create(&goal)
	sec := models.LearningSection{GoalID: goal.ID, Title: "S", OrderIndex: 0}
	db.Create(&sec)
	assign := models.LearningAssignment{SectionID: sec.ID, Title: "Exam", OrderIndex: 0, AssessmentType: "score", PassScore: 70}
	db.Create(&assign)

	r := graph.Resolver{DB: db}
	r.Mutation().AssignGoalToDepartment(authCtx(tenant, "admin"), goal.ID, dept.ID)
	var egp models.EmployeeGoalProgress
	db.Where("goal_id = ? AND employee_id = ?", goal.ID, emp.ID).First(&egp)

	_, err := r.Mutation().UpdateItemProgress(authCtx(tenant, "admin"), model.UpdateItemProgressInput{
		EmployeeGoalProgressID: egp.ID,
		ItemID:                 assign.ID,
		ItemType:               "assignment",
		Status:                 "passed",
	})
	if err == nil {
		t.Fatal("expected score-required error")
	}
	if !errors.Is(err, graph.ErrValidation) {
		t.Errorf("expected ErrValidation, got %v", err)
	}
}

// 7. removeGoalAssignment cascades all child progress rows.
func TestRemoveGoalAssignment_Cascades(t *testing.T) {
	db := setupLearningDB(t)
	tenant := "t-7"
	dept := models.Department{TenantID: tenant, Name: "HR"}
	db.Create(&dept)
	u := models.User{TenantID: tenant, Name: "C", Email: "c@t.com", Password: "x", Role: models.RoleStaff, IsActive: true}
	db.Create(&u)
	emp := models.Employee{TenantID: tenant, UserID: u.ID, DepartmentID: dept.ID, EmployeeID: "C1"}
	db.Create(&emp)
	goalID, _, _, _ := seedGoalWithItems(t, db, tenant)

	r := graph.Resolver{DB: db}
	ga, err := r.Mutation().AssignGoalToDepartment(authCtx(tenant, "admin"), goalID, dept.ID)
	if err != nil {
		t.Fatalf("assign: %v", err)
	}
	if _, err := r.Mutation().RemoveGoalAssignment(authCtx(tenant, "admin"), ga.ID); err != nil {
		t.Fatalf("remove: %v", err)
	}

	var egpCount, upCount, apCount int64
	db.Model(&models.EmployeeGoalProgress{}).Count(&egpCount)
	db.Model(&models.UnitProgress{}).Count(&upCount)
	db.Model(&models.AssignmentProgress{}).Count(&apCount)
	if egpCount != 0 || upCount != 0 || apCount != 0 {
		t.Errorf("expected full cascade, got egp=%d up=%d ap=%d", egpCount, upCount, apCount)
	}
}

//  8. Sequential locking across sections: first item of Section 2 is locked
//     until all of Section 1 is complete.
func TestSequentialLocking_AcrossSections(t *testing.T) {
	db := setupLearningDB(t)
	tenant := "t-8"
	dept := models.Department{TenantID: tenant, Name: "Eng"}
	db.Create(&dept)
	u := models.User{TenantID: tenant, Name: "L", Email: "l@t.com", Password: "x", Role: models.RoleStaff, IsActive: true}
	db.Create(&u)
	emp := models.Employee{TenantID: tenant, UserID: u.ID, DepartmentID: dept.ID, EmployeeID: "L1"}
	db.Create(&emp)
	goalID, s1Unit, s1Assign, s2Unit := seedGoalWithItems(t, db, tenant)

	r := graph.Resolver{DB: db}
	r.Mutation().AssignGoalToDepartment(authCtx(tenant, "admin"), goalID, dept.ID)
	var egp models.EmployeeGoalProgress
	db.Where("goal_id = ? AND employee_id = ?", goalID, emp.ID).First(&egp)

	// Try Section 2 first item — should be locked.
	_, err := r.Mutation().UpdateItemProgress(authCtx(tenant, "admin"), model.UpdateItemProgressInput{
		EmployeeGoalProgressID: egp.ID,
		ItemID:                 s2Unit,
		ItemType:               "unit",
		Status:                 "completed",
	})
	if err == nil {
		t.Fatal("expected cross-section lock error")
	}

	// Unlock Section 1 fully.
	for _, step := range []struct {
		id, kind, status string
	}{
		{s1Unit, "unit", "completed"},
		{s1Assign, "assignment", "passed"},
	} {
		if _, err := r.Mutation().UpdateItemProgress(authCtx(tenant, "admin"), model.UpdateItemProgressInput{
			EmployeeGoalProgressID: egp.ID,
			ItemID:                 step.id,
			ItemType:               step.kind,
			Status:                 step.status,
		}); err != nil {
			t.Fatalf("section 1 step %v: %v", step, err)
		}
	}

	// Now Section 2 first item should be accessible.
	if _, err := r.Mutation().UpdateItemProgress(authCtx(tenant, "admin"), model.UpdateItemProgressInput{
		EmployeeGoalProgressID: egp.ID,
		ItemID:                 s2Unit,
		ItemType:               "unit",
		Status:                 "completed",
	}); err != nil {
		t.Fatalf("expected unlock, got %v", err)
	}
}
