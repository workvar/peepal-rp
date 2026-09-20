package bulk

import (
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var drugBatchesSchema = &Schema{
	Resource:    "drug_batches",
	Title:       "Drug Batches",
	Description: "Log received batches/lots against existing pharmacy drugs — batch number, expiry, quantity, and unit cost. Each row adds its quantity to the drug's stock and feeds expiry tracking + FEFO dispensing. Reference drugs by name (as they appear in the catalog) or ID.",
	RequireRole: []string{"admin", "staff"},
	Fields: []Field{
		{
			Name: "drug", Label: "Drug", Type: FieldString, Required: true,
			Description: "Existing drug — its catalog name (e.g. Crocin) or ID. Must already exist; upload the drugs sheet first.",
			Example:     "Crocin",
		},
		{
			Name: "batch_no", Label: "Batch No", Type: FieldString, Required: true,
			Description: "Manufacturer/received batch or lot number.",
			Example:     "B2026-001",
		},
		{
			Name: "expiry_date", Label: "Expiry Date", Type: FieldDate, SkipIfBlank: true,
			Description: "Batch expiry (YYYY-MM-DD). Leave blank for non-expiring stock.",
			Example:     "2027-06-30",
		},
		{
			Name: "qty", Label: "Quantity", Type: FieldFloat, Required: true,
			Description: "Units received in this batch. Added to the drug's current stock.",
			Example:     "100",
		},
		{
			Name: "unit_cost", Label: "Unit Cost", Type: FieldFloat, SkipIfBlank: true,
			Description: "Optional purchase cost per unit for this batch.",
			Example:     "1.80",
		},
	},
	Create: createDrugBatchRow,
}

func createDrugBatchRow(ctx Ctx, row map[string]string) (string, error) {
	drugID, err := resolveDrugID(ctx.TenantID, row["drug"])
	if err != nil {
		return "", err
	}
	if drugID == "" {
		return "", errors.New("drug is required")
	}
	batchNo := strings.TrimSpace(row["batch_no"])
	if batchNo == "" {
		return "", errors.New("batch_no is required")
	}
	qty := ParseFloat(row["qty"])
	if qty <= 0 {
		return "", errors.New("qty must be greater than zero")
	}

	batch := models.DrugBatch{
		ID: uuid.NewString(), TenantID: ctx.TenantID, DrugID: drugID,
		BatchNo: batchNo, ExpiryDate: strings.TrimSpace(row["expiry_date"]),
		Qty: qty, UnitCost: ParseFloat(row["unit_cost"]),
	}

	// Insert the batch and bump the drug's denormalized stock in one transaction.
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&batch).Error; err != nil {
			return err
		}
		return tx.Model(&models.Drug{}).
			Where("id = ? AND tenant_id = ?", drugID, ctx.TenantID).
			Update("stock_qty", gorm.Expr("stock_qty + ?", qty)).Error
	}); err != nil {
		return "", err
	}
	return batch.ID, nil
}

func init() { Register(drugBatchesSchema) }
