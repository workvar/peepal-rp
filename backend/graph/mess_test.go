package graph_test

import (
	"testing"

	"collegeerp/graph"
	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Mess tests (Phase 6b): meal attendance is unique per (student, date, meal)
// and an expense may only reference a vendor / PO that exists in the tenant.

func setupMessDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := "host=localhost user=postgres password=postgres dbname=collegeerp_test port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Skipf("test DB unavailable: %v", err)
	}
	if err := db.AutoMigrate(
		&models.User{}, &models.Course{}, &models.Student{},
		&models.HostelBlock{}, &models.HostelRoom{}, &models.HostelAllocation{},
		&models.Vendor{}, &models.PurchaseOrder{},
		&models.MessMenu{}, &models.MessAttendance{}, &models.MessExpense{},
	); err != nil {
		t.Skipf("migrate failed: %v", err)
	}
	t.Cleanup(func() {
		for _, tbl := range []string{
			"mess_attendances", "mess_expenses", "mess_menus",
			"hostel_allocations", "hostel_rooms", "hostel_blocks",
			"purchase_orders", "vendors", "students", "courses", "users",
		} {
			db.Exec("DELETE FROM " + tbl)
		}
	})
	return db
}

func messStudent(t *testing.T, db *gorm.DB, roll string) models.Student {
	t.Helper()
	u := models.User{TenantID: "t1", Name: "Student " + roll, Email: roll + "@t1.com", Password: "x", Role: models.RoleStudent, IsActive: true}
	db.Create(&u)
	s := models.Student{TenantID: "t1", UserID: u.ID, RollNumber: roll, AdmissionStatus: "active"}
	db.Create(&s)
	return s
}

func TestMarkMessAttendance_UniquePerStudentDateMeal(t *testing.T) {
	db := setupMessDB(t)
	r := graph.Resolver{DB: db}
	ctx := authCtx("t1", "staff")

	s1 := messStudent(t, db, "R001")
	s2 := messStudent(t, db, "R002")

	if _, err := r.Mutation().MarkMessAttendance(ctx, "2026-07-18", models.MealLunch, []string{s1.ID, s2.ID}); err != nil {
		t.Fatalf("first mark: %v", err)
	}
	// Re-submitting the same roster must update, not duplicate.
	if _, err := r.Mutation().MarkMessAttendance(ctx, "2026-07-18", models.MealLunch, []string{s1.ID, s2.ID}); err != nil {
		t.Fatalf("second mark: %v", err)
	}

	var n int64
	db.Model(&models.MessAttendance{}).
		Where("tenant_id = ? AND date = ? AND meal = ?", "t1", "2026-07-18", models.MealLunch).Count(&n)
	if n != 2 {
		t.Fatalf("want 2 attendance rows, got %d", n)
	}

	// Dropping a student from the roster clears their mark.
	res, err := r.Mutation().MarkMessAttendance(ctx, "2026-07-18", models.MealLunch, []string{s1.ID})
	if err != nil {
		t.Fatalf("third mark: %v", err)
	}
	if res.Cleared != 1 {
		t.Errorf("cleared = %d, want 1", res.Cleared)
	}
	db.Model(&models.MessAttendance{}).
		Where("tenant_id = ? AND date = ? AND meal = ?", "t1", "2026-07-18", models.MealLunch).Count(&n)
	if n != 1 {
		t.Errorf("want 1 row after roster shrink, got %d", n)
	}
}

func TestCreateMessExpense_ValidatesVendorAndPO(t *testing.T) {
	db := setupMessDB(t)
	r := graph.Resolver{DB: db}
	ctx := authCtx("t1", "staff")

	vendor := models.Vendor{TenantID: "t1", Name: "Green Grocers", Active: true}
	db.Create(&vendor)
	po := models.PurchaseOrder{TenantID: "t1", PONumber: "PO-00001", VendorID: vendor.ID, Status: "open"}
	db.Create(&po)

	cat := models.MessExpenseGroceries
	saved, err := r.Mutation().CreateMessExpense(ctx, model.MessExpenseInput{
		Date: "2026-07-18", Category: &cat, Amount: 4500,
		VendorID: &vendor.ID, PurchaseOrderID: &po.ID,
	})
	if err != nil {
		t.Fatalf("create expense: %v", err)
	}
	if saved.VendorName == nil || *saved.VendorName != "Green Grocers" {
		t.Errorf("vendor not linked: %+v", saved.VendorName)
	}
	if saved.PoNumber == nil || *saved.PoNumber != "PO-00001" {
		t.Errorf("PO not linked: %+v", saved.PoNumber)
	}

	// An unknown vendor is rejected rather than silently stored.
	bogus := "no-such-vendor"
	if _, err := r.Mutation().CreateMessExpense(ctx, model.MessExpenseInput{
		Date: "2026-07-18", Amount: 100, VendorID: &bogus,
	}); err == nil {
		t.Error("expected an error for an unknown vendor id")
	}
}
