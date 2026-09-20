package graph_test

import (
	"testing"

	"collegeerp/graph"
	"collegeerp/graph/model"
	"collegeerp/models"
)

func TestDispenseFEFO_EarliestExpiryFirst(t *testing.T) {
	db := setupProcurementDB(t)
	// Patient + dispense tables too.
	if err := db.AutoMigrate(&models.Patient{}, &models.Dispense{}, &models.DispenseItem{}); err != nil {
		t.Skipf("migrate failed: %v", err)
	}
	t.Cleanup(func() {
		db.Exec("DELETE FROM dispense_items")
		db.Exec("DELETE FROM dispenses")
		db.Exec("DELETE FROM patients")
	})

	r := graph.Resolver{DB: db}
	ctx := authCtx("t1", "admin")

	drug := models.Drug{TenantID: "t1", Name: "Amoxicillin", UnitPrice: 5, StockQty: 30, Active: true}
	db.Create(&drug)
	// Two batches: later expiry has more stock; earlier expiry must go first.
	db.Create(&models.DrugBatch{TenantID: "t1", DrugID: drug.ID, BatchNo: "LATE", ExpiryDate: "2028-01-01", Qty: 20})
	db.Create(&models.DrugBatch{TenantID: "t1", DrugID: drug.ID, BatchNo: "EARLY", ExpiryDate: "2026-01-01", Qty: 10})

	patient := models.Patient{TenantID: "t1", MRN: "MRN1"}
	db.Create(&patient)

	// Dispense 15: should drain EARLY (10) then take 5 from LATE.
	_, err := r.Mutation().CreateDispense(ctx, model.CreateDispenseInput{
		PatientID: patient.ID,
		Items:     []*model.DispenseItemInput{{DrugID: drug.ID, Qty: 15}},
	})
	if err != nil {
		t.Fatalf("dispense: %v", err)
	}

	var early, late models.DrugBatch
	db.Where("drug_id = ? AND batch_no = ?", drug.ID, "EARLY").First(&early)
	db.Where("drug_id = ? AND batch_no = ?", drug.ID, "LATE").First(&late)
	if early.Qty != 0 {
		t.Fatalf("EARLY batch qty = %g, want 0 (drained first)", early.Qty)
	}
	if late.Qty != 15 {
		t.Fatalf("LATE batch qty = %g, want 15", late.Qty)
	}
	var dr models.Drug
	db.First(&dr, "id = ?", drug.ID)
	if dr.StockQty != 15 {
		t.Fatalf("drug stock = %g, want 15", dr.StockQty)
	}

	// Now only 15 remain; dispensing 20 must error.
	if _, err := r.Mutation().CreateDispense(ctx, model.CreateDispenseInput{
		PatientID: patient.ID,
		Items:     []*model.DispenseItemInput{{DrugID: drug.ID, Qty: 20}},
	}); err == nil {
		t.Fatal("expected shortage error when dispensing beyond available")
	}
}
