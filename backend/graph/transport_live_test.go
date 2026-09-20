package graph_test

import (
	"testing"

	"collegeerp/graph"
	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Live transport tests (Phase 6c): a ping moves the vehicle and stamps
// LastPingAt, and a driver has at most one day sheet per date.

func setupTransportLiveDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := "host=localhost user=postgres password=postgres dbname=collegeerp_test port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Skipf("test DB unavailable: %v", err)
	}
	if err := db.AutoMigrate(
		&models.User{}, &models.Department{}, &models.Employee{},
		&models.TransportRoute{}, &models.TransportVehicle{}, &models.DriverAttendance{},
	); err != nil {
		t.Skipf("migrate failed: %v", err)
	}
	t.Cleanup(func() {
		for _, tbl := range []string{
			"driver_attendances", "transport_vehicles", "transport_routes",
			"employees", "departments", "users",
		} {
			db.Exec("DELETE FROM " + tbl)
		}
	})
	return db
}

func transportFixture(t *testing.T, db *gorm.DB) (models.Employee, models.TransportVehicle) {
	t.Helper()
	u := models.User{TenantID: "t1", Name: "Dev Driver", Email: "dev@t1.com", Password: "x", Role: models.RoleStaff, IsActive: true}
	db.Create(&u)
	driver := models.Employee{TenantID: "t1", UserID: u.ID, EmployeeID: "D001"}
	db.Create(&driver)

	route := models.TransportRoute{TenantID: "t1", RouteName: "North", StartPoint: "Depot", EndPoint: "Campus"}
	db.Create(&route)
	vehicle := models.TransportVehicle{
		TenantID: "t1", VehicleNumber: "KA01AB1234", VehicleType: "bus",
		Capacity: 40, RouteID: route.ID, Status: "active", DriverEmployeeID: driver.ID,
	}
	db.Create(&vehicle)
	return driver, vehicle
}

func TestPingVehicleLocation_UpdatesPositionAndTimestamp(t *testing.T) {
	db := setupTransportLiveDB(t)
	r := graph.Resolver{DB: db}
	_, vehicle := transportFixture(t, db)

	live, err := r.Mutation().PingVehicleLocation(authCtx("t1", "staff"), vehicle.ID, 12.9716, 77.5946)
	if err != nil {
		t.Fatalf("ping: %v", err)
	}
	if live.Latitude != 12.9716 || live.Longitude != 77.5946 {
		t.Errorf("position not stored: %f, %f", live.Latitude, live.Longitude)
	}
	if live.LastPingAt == nil {
		t.Error("lastPingAt not stamped")
	}

	var saved models.TransportVehicle
	db.First(&saved, "id = ?", vehicle.ID)
	if saved.LastPingAt == nil {
		t.Error("lastPingAt not persisted")
	}

	// Out-of-range coordinates are rejected.
	if _, err := r.Mutation().PingVehicleLocation(authCtx("t1", "staff"), vehicle.ID, 999, 0); err == nil {
		t.Error("expected an error for an out-of-range latitude")
	}
}

func TestMarkDriverAttendance_UniquePerEmployeeAndDate(t *testing.T) {
	db := setupTransportLiveDB(t)
	r := graph.Resolver{DB: db}
	driver, vehicle := transportFixture(t, db)
	ctx := authCtx("t1", "admin")

	in := "08:00"
	if _, err := r.Mutation().MarkDriverAttendance(ctx, model.DriverAttendanceInput{
		EmployeeID: driver.ID, VehicleID: &vehicle.ID, Date: "2026-07-18", CheckInAt: &in,
	}); err != nil {
		t.Fatalf("first mark: %v", err)
	}
	out := "17:30"
	saved, err := r.Mutation().MarkDriverAttendance(ctx, model.DriverAttendanceInput{
		EmployeeID: driver.ID, VehicleID: &vehicle.ID, Date: "2026-07-18", CheckOutAt: &out,
	})
	if err != nil {
		t.Fatalf("second mark: %v", err)
	}

	var n int64
	db.Model(&models.DriverAttendance{}).
		Where("employee_id = ? AND date = ?", driver.ID, "2026-07-18").Count(&n)
	if n != 1 {
		t.Fatalf("want 1 day sheet, got %d", n)
	}
	// The second call must not wipe the earlier check-in.
	if saved.CheckInAt == nil || *saved.CheckInAt != in {
		t.Errorf("check-in lost on update: %+v", saved.CheckInAt)
	}
	if saved.CheckOutAt == nil || *saved.CheckOutAt != out {
		t.Errorf("check-out not recorded: %+v", saved.CheckOutAt)
	}
}
