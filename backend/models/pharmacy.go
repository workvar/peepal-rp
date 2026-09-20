package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Pharmacy (healthcare industry): a drug catalog with live stock, and dispense
// records that decrement it. Phase 2 tracks a single stock number per drug;
// batch/expiry-level inventory arrives with the stores module.

// Drug is one catalog entry the pharmacy stocks and dispenses.
type Drug struct {
	ID          string `gorm:"primaryKey" json:"id"`
	TenantID    string `gorm:"not null;index;uniqueIndex:idx_drug_name" json:"tenant_id"`
	Name        string `gorm:"not null;uniqueIndex:idx_drug_name" json:"name"`
	GenericName string `json:"generic_name"`
	// Form: tablet | capsule | syrup | injection | ointment | drops | other.
	Form     string `gorm:"default:'tablet'" json:"form"`
	Strength string `json:"strength"` // e.g. "500mg"
	// Unit is what one stock count means (tablet, bottle, vial, tube).
	Unit         string    `gorm:"default:'unit'" json:"unit"`
	UnitPrice    float64   `gorm:"not null;default:0" json:"unit_price"`
	StockQty     float64   `gorm:"not null;default:0" json:"stock_qty"`
	ReorderLevel float64   `gorm:"not null;default:0" json:"reorder_level"`
	Active       bool      `gorm:"default:true" json:"active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (d *Drug) BeforeCreate(tx *gorm.DB) error {
	if d.ID == "" {
		d.ID = uuid.NewString()
	}
	return nil
}

// Dispense is one hand-over of drugs to a patient, optionally linked to the
// encounter whose prescription it fulfils. Creating one decrements stock
// inside a transaction.
type Dispense struct {
	ID          string  `gorm:"primaryKey" json:"id"`
	TenantID    string  `gorm:"not null;index" json:"tenant_id"`
	PatientID   string  `gorm:"not null;index" json:"patient_id"`
	Patient     Patient `gorm:"foreignKey:PatientID" json:"patient,omitempty"`
	EncounterID string  `gorm:"index" json:"encounter_id"`
	// Date is YYYY-MM-DD.
	Date        string         `gorm:"not null;index" json:"date"`
	Items       []DispenseItem `gorm:"foreignKey:DispenseID" json:"items,omitempty"`
	TotalAmount float64        `gorm:"not null;default:0" json:"total_amount"`
	Notes       string         `json:"notes"`
	CreatedAt   time.Time      `json:"created_at"`
}

func (d *Dispense) BeforeCreate(tx *gorm.DB) error {
	if d.ID == "" {
		d.ID = uuid.NewString()
	}
	return nil
}

// DispenseItem is one drug line on a dispense; name/price frozen at hand-over.
type DispenseItem struct {
	ID         string  `gorm:"primaryKey" json:"id"`
	TenantID   string  `gorm:"not null;index" json:"tenant_id"`
	DispenseID string  `gorm:"not null;index" json:"dispense_id"`
	DrugID     string  `gorm:"not null;index" json:"drug_id"`
	DrugName   string  `gorm:"not null" json:"drug_name"`
	Qty        float64 `gorm:"not null" json:"qty"`
	UnitPrice  float64 `gorm:"not null;default:0" json:"unit_price"`
	Amount     float64 `gorm:"not null;default:0" json:"amount"`
	// Batch provenance (Phase 2 FEFO): which DrugBatch this line drew from.
	// Blank on legacy rows dispensed before batch tracking existed.
	BatchID string `gorm:"index" json:"batch_id"`
	BatchNo string `json:"batch_no"`
}

func (it *DispenseItem) BeforeCreate(tx *gorm.DB) error {
	if it.ID == "" {
		it.ID = uuid.NewString()
	}
	return nil
}
