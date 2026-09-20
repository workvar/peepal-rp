package graph_test

import (
	"testing"

	"collegeerp/graph"
	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupProcurementDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := "host=localhost user=postgres password=postgres dbname=collegeerp_test port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Skipf("test DB unavailable: %v", err)
	}
	if err := db.AutoMigrate(
		&models.Vendor{}, &models.PurchaseOrder{}, &models.PurchaseOrderItem{},
		&models.PurchaseInvoice{}, &models.InventoryItem{}, &models.StockTransaction{},
		&models.Drug{}, &models.DrugBatch{},
	); err != nil {
		t.Skipf("migrate failed: %v", err)
	}
	t.Cleanup(func() {
		for _, tbl := range []string{
			"stock_transactions", "drug_batches", "purchase_order_items",
			"purchase_orders", "purchase_invoices", "inventory_items", "drugs", "vendors",
		} {
			db.Exec("DELETE FROM " + tbl)
		}
	})
	return db
}

func TestReceivePurchaseOrder_StockAndBatch(t *testing.T) {
	db := setupProcurementDB(t)
	r := graph.Resolver{DB: db}
	ctx := authCtx("t1", "admin")

	vendor := models.Vendor{TenantID: "t1", Name: "Acme", Active: true}
	db.Create(&vendor)
	drug := models.Drug{TenantID: "t1", Name: "Paracetamol", UnitPrice: 2, StockQty: 0}
	db.Create(&drug)
	item := models.InventoryItem{TenantID: "t1", Code: "PARA", Name: "Paracetamol", StockQty: 0, LinkedDrugID: drug.ID}
	db.Create(&item)

	po, err := r.Mutation().CreatePurchaseOrder(ctx, model.CreatePurchaseOrderInput{
		VendorID: vendor.ID,
		Items: []*model.PurchaseOrderItemInput{
			{ItemID: &item.ID, ItemName: "Paracetamol", Qty: 100, UnitCost: 2},
		},
	})
	if err != nil {
		t.Fatalf("create PO: %v", err)
	}
	lineID := po.Items[0].ID

	// Partial receipt: 40 of 100.
	exp := "2027-01-01"
	batch := "B-001"
	po2, err := r.Mutation().ReceivePurchaseOrder(ctx, po.ID, model.ReceivePurchaseOrderInput{
		Lines: []*model.ReceiveLineInput{
			{LineID: lineID, ReceivedQty: 40, BatchNo: &batch, ExpiryDate: &exp},
		},
	})
	if err != nil {
		t.Fatalf("receive: %v", err)
	}
	if po2.Status != models.POStatusPartial {
		t.Fatalf("status = %s, want partially_received", po2.Status)
	}

	var it models.InventoryItem
	db.First(&it, "id = ?", item.ID)
	if it.StockQty != 40 {
		t.Fatalf("inventory stock = %g, want 40", it.StockQty)
	}
	var txns int64
	db.Model(&models.StockTransaction{}).Where("item_id = ? AND kind = ?", item.ID, models.StockReceipt).Count(&txns)
	if txns != 1 {
		t.Fatalf("stock receipt rows = %d, want 1", txns)
	}
	var dr models.Drug
	db.First(&dr, "id = ?", drug.ID)
	if dr.StockQty != 40 {
		t.Fatalf("drug stock = %g, want 40", dr.StockQty)
	}
	var batches []models.DrugBatch
	db.Where("drug_id = ?", drug.ID).Find(&batches)
	if len(batches) != 1 || batches[0].Qty != 40 || batches[0].BatchNo != "B-001" {
		t.Fatalf("unexpected batches: %+v", batches)
	}

	// Receive the rest → fully received.
	po3, err := r.Mutation().ReceivePurchaseOrder(ctx, po.ID, model.ReceivePurchaseOrderInput{
		Lines: []*model.ReceiveLineInput{
			{LineID: lineID, ReceivedQty: 60, BatchNo: &batch, ExpiryDate: &exp},
		},
	})
	if err != nil {
		t.Fatalf("receive 2: %v", err)
	}
	if po3.Status != models.POStatusReceived {
		t.Fatalf("status = %s, want received", po3.Status)
	}

	// Over-receiving now errors.
	if _, err := r.Mutation().ReceivePurchaseOrder(ctx, po.ID, model.ReceivePurchaseOrderInput{
		Lines: []*model.ReceiveLineInput{{LineID: lineID, ReceivedQty: 1, BatchNo: &batch}},
	}); err == nil {
		t.Fatal("expected error when receiving beyond ordered qty")
	}
}
