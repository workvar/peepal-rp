package graph_test

import (
	"context"
	"testing"

	"collegeerp/graph"
	"collegeerp/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
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
		&models.EmployeePaymentDetails{},
	)
	t.Cleanup(func() {
		db.Exec("DELETE FROM employee_payment_details")
		db.Exec("DELETE FROM employees")
		db.Exec("DELETE FROM departments")
		db.Exec("DELETE FROM users")
	})
	return db
}

func authCtx(tenantID, role string) context.Context {
	ctx := context.Background()
	return context.WithValue(ctx, graph.TestAuthKey, graph.AuthContext{
		TenantID: tenantID,
		Role:     role,
	})
}

func TestEmployeesQuery_TenantScoped(t *testing.T) {
	db := setupTestDB(t)

	u1 := models.User{TenantID: "tenant-A", Name: "Alice", Email: "alice@a.com", Password: "x", Role: models.RoleStaff, IsActive: true}
	u2 := models.User{TenantID: "tenant-B", Name: "Bob", Email: "bob@b.com", Password: "x", Role: models.RoleStaff, IsActive: true}
	db.Create(&u1)
	db.Create(&u2)

	emp1 := models.Employee{TenantID: "tenant-A", UserID: u1.ID, EmployeeID: "A001"}
	emp2 := models.Employee{TenantID: "tenant-B", UserID: u2.ID, EmployeeID: "B001"}
	db.Create(&emp1)
	db.Create(&emp2)

	r := graph.Resolver{DB: db}
	employees, err := r.Query().Employees(authCtx("tenant-A", "admin"))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(employees) != 1 {
		t.Fatalf("want 1 employee for tenant-A, got %d", len(employees))
	}
	if employees[0].EmployeeID != "A001" {
		t.Errorf("wrong employee: got %s, want A001", employees[0].EmployeeID)
	}
}

func TestDeactivateUser_AdminOnly(t *testing.T) {
	db := setupTestDB(t)

	u := models.User{TenantID: "tenant-A", Name: "Charlie", Email: "charlie@a.com", Password: "x", Role: models.RoleStaff, IsActive: true}
	db.Create(&u)

	r := graph.Resolver{DB: db}
	_, err := r.Mutation().DeactivateUser(authCtx("tenant-A", "staff"), u.ID)
	if err == nil {
		t.Fatal("expected ErrForbidden for non-admin caller, got nil")
	}
}
