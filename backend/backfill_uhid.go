package main

// One-off backfill for Phase 4's UHID field: patients registered before this
// phase have UHID = "". Assigns each one the next free UH-###### per their
// tenant, using the same generator shape as the resolver (graph/patients.
// resolvers.go's nextUHID) reimplemented here since main can't import graph.
// Safe to run more than once — already-assigned patients are skipped.

import (
	"fmt"
	"log"

	"collegeerp/database"
	"collegeerp/models"
)

func backfillPatientUHIDs() {
	var tenantIDs []string
	if err := database.DB.Model(&models.Patient{}).
		Where("uhid = ''").Distinct("tenant_id").Pluck("tenant_id", &tenantIDs).Error; err != nil {
		log.Fatalf("backfill-uhid: could not list tenants: %v", err)
	}

	total := 0
	for _, tenantID := range tenantIDs {
		var patients []models.Patient
		if err := database.DB.Where("tenant_id = ? AND uhid = ''", tenantID).
			Order("created_at ASC").Find(&patients).Error; err != nil {
			log.Fatalf("backfill-uhid: could not list patients for tenant %s: %v", tenantID, err)
		}
		var n int64
		if err := database.DB.Model(&models.Patient{}).
			Where("tenant_id = ?", tenantID).Count(&n).Error; err != nil {
			log.Fatalf("backfill-uhid: could not count patients for tenant %s: %v", tenantID, err)
		}
		next := n - int64(len(patients)) + 1
		if next < 1 {
			next = 1
		}
		for _, p := range patients {
			uhid, err := nextFreeUHID(tenantID, next)
			if err != nil {
				log.Fatalf("backfill-uhid: %v", err)
			}
			if err := database.DB.Model(&models.Patient{}).
				Where("id = ?", p.ID).Update("uhid", uhid).Error; err != nil {
				log.Fatalf("backfill-uhid: could not update patient %s: %v", p.ID, err)
			}
			next++
			total++
		}
	}
	log.Printf("backfill-uhid: assigned UHID to %d patient(s) across %d tenant(s).", total, len(tenantIDs))
}

// nextFreeUHID finds the first unused UH-###### at or after `from` for a
// tenant, probing forward the same way the live resolver does.
func nextFreeUHID(tenantID string, from int64) (string, error) {
	for i := int64(0); i < 100000; i++ {
		candidate := fmt.Sprintf("UH-%06d", from+i)
		var exists int64
		if err := database.DB.Model(&models.Patient{}).
			Where("tenant_id = ? AND uhid = ?", tenantID, candidate).
			Count(&exists).Error; err != nil {
			return "", err
		}
		if exists == 0 {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("could not find a free UHID for tenant %s", tenantID)
}
