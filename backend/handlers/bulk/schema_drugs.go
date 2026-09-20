package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var drugForms = []string{"tablet", "capsule", "syrup", "injection", "ointment", "drops", "other"}

var drugsSchema = &Schema{
	Resource:    "drugs",
	Title:       "Drugs",
	Description: "Seed the pharmacy drug catalog in bulk — name, generic, form, strength, price, opening stock, and reorder level. Rows are skipped (not overwritten) when a drug with the same name already exists for your organisation.",
	RequireRole: []string{"admin", "staff"},
	Fields: []Field{
		{
			Name: "name", Label: "Name", Type: FieldString, Required: true,
			Description: "Brand / trade name as it appears on the shelf.",
			Example:     "Crocin",
		},
		{
			Name: "generic_name", Label: "Generic Name", Type: FieldString,
			Description: "Active ingredient / generic name.",
			Example:     "Paracetamol",
		},
		{
			Name: "form", Label: "Form", Type: FieldEnum,
			AllowedValues: drugForms,
			Description:   "Dosage form. Defaults to tablet when blank.",
			Example:       "tablet",
		},
		{
			Name: "strength", Label: "Strength", Type: FieldString,
			Description: "Dose per unit.",
			Example:     "500mg",
		},
		{
			Name: "unit", Label: "Unit", Type: FieldString,
			Description: "What one stock count represents (tablet, bottle, vial, tube). Defaults to unit.",
			Example:     "tablet",
		},
		{
			Name: "unit_price", Label: "Unit Price", Type: FieldFloat, SkipIfBlank: true,
			Description: "Selling price per unit. Defaults to 0.",
			Example:     "2.50",
		},
		{
			Name: "stock_qty", Label: "Opening Stock", Type: FieldFloat, SkipIfBlank: true,
			Description: "Opening stock quantity. Defaults to 0.",
			Example:     "100",
		},
		{
			Name: "reorder_level", Label: "Reorder Level", Type: FieldFloat, SkipIfBlank: true,
			Description: "Low-stock threshold that flags the drug for reorder. Defaults to 0.",
			Example:     "20",
		},
		{
			Name: "batch_no", Label: "Batch No", Type: FieldString,
			Description: "Optional. When set, the opening stock is recorded as an initial batch/lot so it shows up in expiry tracking and dispenses FEFO.",
			Example:     "B2026-001",
		},
		{
			Name: "expiry_date", Label: "Expiry Date", Type: FieldDate, SkipIfBlank: true,
			Description: "Optional batch expiry (YYYY-MM-DD). Only used when a batch number is given.",
			Example:     "2027-06-30",
		},
	},
	Create: createDrugRow,
}

func createDrugRow(ctx Ctx, row map[string]string) (string, error) {
	name := strings.TrimSpace(row["name"])
	if name == "" {
		return "", errors.New("name is required")
	}

	// Dedupe on (tenant, name) — matches the idx_drug_name unique index.
	var existing int64
	if err := database.DB.Model(&models.Drug{}).
		Where("tenant_id = ? AND name = ?", ctx.TenantID, name).
		Count(&existing).Error; err != nil {
		return "", err
	}
	if existing > 0 {
		return "", errors.New("a drug with this name already exists — skipped")
	}

	form := strings.ToLower(strings.TrimSpace(row["form"]))
	if form == "" {
		form = "tablet"
	}
	unit := strings.TrimSpace(row["unit"])
	if unit == "" {
		unit = "unit"
	}

	stockQty := ParseFloat(row["stock_qty"])
	d := models.Drug{
		ID: uuid.NewString(), TenantID: ctx.TenantID,
		Name: name, GenericName: strings.TrimSpace(row["generic_name"]),
		Form: form, Strength: strings.TrimSpace(row["strength"]), Unit: unit,
		UnitPrice: ParseFloat(row["unit_price"]), StockQty: stockQty,
		ReorderLevel: ParseFloat(row["reorder_level"]), Active: true,
	}

	batchNo := strings.TrimSpace(row["batch_no"])
	unitPrice := ParseFloat(row["unit_price"])
	expiry := strings.TrimSpace(row["expiry_date"])

	// Create the drug and, when a batch number is supplied, an initial batch for
	// the opening stock — both in one transaction so a failure rolls back.
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&d).Error; err != nil {
			return errors.New("could not create drug — the name may already exist")
		}
		if batchNo != "" && stockQty > 0 {
			batch := models.DrugBatch{
				ID: uuid.NewString(), TenantID: ctx.TenantID, DrugID: d.ID,
				BatchNo: batchNo, ExpiryDate: expiry, Qty: stockQty, UnitCost: unitPrice,
			}
			if err := tx.Create(&batch).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return "", err
	}
	return d.ID, nil
}

func init() { Register(drugsSchema) }
