package graph_test

import (
	"testing"
	"time"

	"collegeerp/graph"
	"collegeerp/models"
)

func TestDashboardStats_IncludesClinicalCounts(t *testing.T) {
	db := setupTestDB(t)
	if err := db.AutoMigrate(
		&models.Student{},
		&models.Leave{},
		&models.Payroll{},
		&models.Attendance{},
		&models.Patient{},
		&models.Appointment{},
		&models.Encounter{},
		&models.Admission{},
		&models.Ward{},
		&models.Bed{},
	); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	t.Cleanup(func() {
		db.Exec("DELETE FROM beds")
		db.Exec("DELETE FROM wards")
		db.Exec("DELETE FROM admissions")
		db.Exec("DELETE FROM encounters")
		db.Exec("DELETE FROM appointments")
		db.Exec("DELETE FROM patients")
	})

	const tenant = "tenant-A"
	today := time.Now().Format("2006-01-02")

	p := models.Patient{TenantID: tenant, MRN: "MRN-1", FirstName: "Ada", Status: "active"}
	if err := db.Create(&p).Error; err != nil {
		t.Fatalf("patient: %v", err)
	}
	if err := db.Create(&models.Encounter{
		TenantID: tenant, PatientID: p.ID, ClinicianID: "c1",
		VisitType: models.VisitOPD, VisitDate: today, Status: models.EncounterOpen,
	}).Error; err != nil {
		t.Fatalf("encounter: %v", err)
	}
	ward := models.Ward{TenantID: tenant, Code: "W1", Name: "General"}
	if err := db.Create(&ward).Error; err != nil {
		t.Fatalf("ward: %v", err)
	}
	occupied := models.Bed{TenantID: tenant, WardID: ward.ID, BedNumber: "1", Status: models.BedOccupied}
	free := models.Bed{TenantID: tenant, WardID: ward.ID, BedNumber: "2", Status: models.BedAvailable}
	if err := db.Create(&occupied).Error; err != nil {
		t.Fatalf("bed occupied: %v", err)
	}
	if err := db.Create(&free).Error; err != nil {
		t.Fatalf("bed free: %v", err)
	}
	if err := db.Create(&models.Admission{
		TenantID: tenant, PatientID: p.ID, WardID: ward.ID, BedID: occupied.ID,
		AdmissionDate: today, Status: models.AdmissionAdmitted,
	}).Error; err != nil {
		t.Fatalf("admission: %v", err)
	}

	r := graph.Resolver{DB: db}
	stats, err := r.Query().DashboardStats(authCtx(tenant, "admin"))
	if err != nil {
		t.Fatalf("DashboardStats: %v", err)
	}
	if stats.Patients != 1 {
		t.Errorf("patients: got %d, want 1", stats.Patients)
	}
	if stats.TodayOpd != 1 {
		t.Errorf("today OPD: got %d, want 1", stats.TodayOpd)
	}
	if stats.OpenOpd != 1 {
		t.Errorf("open OPD: got %d, want 1", stats.OpenOpd)
	}
	if stats.ActiveAdmissions != 1 {
		t.Errorf("active admissions: got %d, want 1", stats.ActiveAdmissions)
	}
	if stats.OccupiedBeds != 1 {
		t.Errorf("occupied beds: got %d, want 1", stats.OccupiedBeds)
	}
	if stats.AvailableBeds != 1 {
		t.Errorf("available beds: got %d, want 1", stats.AvailableBeds)
	}
}
