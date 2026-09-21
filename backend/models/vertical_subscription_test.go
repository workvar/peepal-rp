package models

import (
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

func verticalSubDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{Logger: gormlogger.Discard})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(&SubscriptionPlan{}, &TenantSubscription{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})
	return db
}

func TestEnsureVerticalSubscription_CreatesHospitalPlan(t *testing.T) {
	db := verticalSubDB(t)
	edu := SubscriptionPlan{Name: "Education", Modules: "students,fees", IsActive: true}
	hosp := SubscriptionPlan{Name: "Hospital", Modules: "clinical,billing,pharmacy", IsActive: true}
	if err := db.Create(&edu).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&hosp).Error; err != nil {
		t.Fatal(err)
	}

	const tenantID = "tenant-hospital"
	EnsureVerticalSubscription(db, tenantID, TenantTypeHealthcare)

	var sub TenantSubscription
	if err := db.Where("tenant_id = ?", tenantID).First(&sub).Error; err != nil {
		t.Fatalf("expected subscription: %v", err)
	}
	if sub.PlanID != hosp.ID {
		t.Fatalf("plan %s, want Hospital %s", sub.PlanID, hosp.ID)
	}
}

func TestEnsureVerticalSubscription_SwapsEducationToHospital(t *testing.T) {
	db := verticalSubDB(t)
	edu := SubscriptionPlan{Name: "Education", Modules: "students,fees", IsActive: true}
	hosp := SubscriptionPlan{Name: "Hospital", Modules: "clinical,billing,pharmacy", IsActive: true}
	if err := db.Create(&edu).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&hosp).Error; err != nil {
		t.Fatal(err)
	}
	const tenantID = "tenant-convert"
	if err := db.Create(&TenantSubscription{
		TenantID:        tenantID,
		PlanID:          edu.ID,
		Status:          "active",
		ModulesOverride: "students,fees",
	}).Error; err != nil {
		t.Fatal(err)
	}

	EnsureVerticalSubscription(db, tenantID, TenantTypeHealthcare)

	var sub TenantSubscription
	if err := db.Where("tenant_id = ?", tenantID).First(&sub).Error; err != nil {
		t.Fatal(err)
	}
	if sub.PlanID != hosp.ID {
		t.Fatalf("plan %s, want Hospital %s", sub.PlanID, hosp.ID)
	}
	if sub.ModulesOverride != "" {
		t.Fatalf("override %q, want empty so Hospital modules apply", sub.ModulesOverride)
	}
}

func TestEnsureVerticalSubscription_LeavesCustomPlan(t *testing.T) {
	db := verticalSubDB(t)
	custom := SubscriptionPlan{Name: "Premium", Modules: "students,clinical", IsActive: true}
	hosp := SubscriptionPlan{Name: "Hospital", Modules: "clinical", IsActive: true}
	if err := db.Create(&custom).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&hosp).Error; err != nil {
		t.Fatal(err)
	}
	const tenantID = "tenant-custom"
	if err := db.Create(&TenantSubscription{TenantID: tenantID, PlanID: custom.ID, Status: "active"}).Error; err != nil {
		t.Fatal(err)
	}

	EnsureVerticalSubscription(db, tenantID, TenantTypeHealthcare)

	var sub TenantSubscription
	if err := db.Where("tenant_id = ?", tenantID).First(&sub).Error; err != nil {
		t.Fatal(err)
	}
	if sub.PlanID != custom.ID {
		t.Fatalf("custom plan was swapped; still want %s, got %s", custom.ID, sub.PlanID)
	}
}

func TestTenantTypeCanonical(t *testing.T) {
	if TenantTypeCollege.Canonical() != TenantTypeEducation {
		t.Fatal("college should canonicalise to education")
	}
	if TenantTypeHealthcare.Canonical() != TenantTypeHealthcare {
		t.Fatal("healthcare should stay healthcare")
	}
	if TenantType("").Canonical() != TenantTypeEducation {
		t.Fatal("empty type should canonicalise to education")
	}
}
