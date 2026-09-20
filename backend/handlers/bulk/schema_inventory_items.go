package bulk

import (
	"errors"
	"strings"
	"time"

	"collegeerp/database"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var inventoryCategoryValues = []string{"consumable", "reagent", "drug", "equipment", "other"}

var inventoryItemsSchema = &Schema{
	Resource:    "inventory_items",
	Title:       "Inventory Items",
	Description: "Seed the central store (consumables, reagents, equipment) in bulk. Each row becomes one stocked item; a positive opening stock is recorded as a receipt. Rows are skipped when an item with the same code already exists. Optionally link an item to a pharmacy drug so stock can be issued straight into the pharmacy.",
	RequireRole: []string{"admin", "staff"},
	Fields: []Field{
		{
			Name: "code", Label: "Code", Type: FieldString, Required: true,
			Description: "Internal item code, unique within your organisation.",
			Example:     "CONS-001",
		},
		{
			Name: "name", Label: "Name", Type: FieldString, Required: true,
			Description: "Item name.",
			Example:     "Surgical Gloves (M)",
		},
		{
			Name: "category", Label: "Category", Type: FieldEnum,
			AllowedValues: inventoryCategoryValues,
			Description:   "Item category. Defaults to consumable.",
			Example:       "consumable",
		},
		{
			Name: "unit", Label: "Unit", Type: FieldString,
			Description: "Stock unit (box, pack, piece, litre). Defaults to unit.",
			Example:     "box",
		},
		{
			Name: "unit_cost", Label: "Unit Cost", Type: FieldFloat, SkipIfBlank: true,
			Description: "Purchase cost per unit. Defaults to 0.",
			Example:     "250",
		},
		{
			Name: "opening_stock", Label: "Opening Stock", Type: FieldFloat, SkipIfBlank: true,
			Description: "Opening quantity on hand. Recorded as a receipt. Defaults to 0.",
			Example:     "40",
		},
		{
			Name: "reorder_level", Label: "Reorder Level", Type: FieldFloat, SkipIfBlank: true,
			Description: "Low-stock threshold. Defaults to 0.",
			Example:     "10",
		},
		{
			Name: "linked_drug", Label: "Linked Drug", Type: FieldString,
			Description: "Optional. Pharmacy drug (name or ID) this item issues into. Must already exist.",
			Example:     "",
		},
	},
	Create: createInventoryItemRow,
}

func createInventoryItemRow(ctx Ctx, row map[string]string) (string, error) {
	code := strings.TrimSpace(row["code"])
	name := strings.TrimSpace(row["name"])
	if code == "" || name == "" {
		return "", errors.New("code and name are required")
	}

	// Dedupe on (tenant, code) — matches the idx_inv_code unique index.
	var existing int64
	if err := database.DB.Model(&models.InventoryItem{}).
		Where("tenant_id = ? AND LOWER(code) = LOWER(?)", ctx.TenantID, code).
		Count(&existing).Error; err != nil {
		return "", err
	}
	if existing > 0 {
		return "", errors.New("an item with this code already exists — skipped")
	}

	category := strings.ToLower(strings.TrimSpace(row["category"]))
	if category == "" {
		category = "consumable"
	}
	unit := strings.TrimSpace(row["unit"])
	if unit == "" {
		unit = "unit"
	}

	linkedDrugID, err := resolveDrugID(ctx.TenantID, row["linked_drug"])
	if err != nil {
		return "", err
	}

	openingStock := ParseFloat(row["opening_stock"])
	if openingStock < 0 {
		return "", errors.New("opening stock cannot be negative")
	}

	it := models.InventoryItem{
		ID: uuid.NewString(), TenantID: ctx.TenantID,
		Code: code, Name: name, Category: category, Unit: unit,
		StockQty: openingStock, ReorderLevel: ParseFloat(row["reorder_level"]),
		UnitCost: ParseFloat(row["unit_cost"]), LinkedDrugID: linkedDrugID, Active: true,
	}

	// Create the item and, for a positive opening stock, a receipt transaction so
	// the ledger balances — both in one transaction.
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&it).Error; err != nil {
			return errors.New("could not create item — the code may already exist")
		}
		if openingStock > 0 {
			txn := models.StockTransaction{
				ID: uuid.NewString(), TenantID: ctx.TenantID, ItemID: it.ID,
				Kind: models.StockReceipt, Qty: openingStock, Reason: "opening stock",
				ByID: ctx.ActorID, Date: time.Now().Format("2006-01-02"),
			}
			if err := tx.Create(&txn).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return "", err
	}
	return it.ID, nil
}

func init() { Register(inventoryItemsSchema) }
