package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Laboratory (LIS) — healthcare industry, Phase 3.
//
// A tenant maintains a catalog of lab tests. Clinicians place lab orders from an
// encounter (or standalone for a walk-in); each order carries one or more test
// line items. Results are entered per line with a reference range and an
// auto-computed flag (normal/high/low) so abnormal values stand out.

// LabOrder statuses.
const (
	LabOrderOrdered   = "ordered"   // requested, sample not yet collected
	LabOrderCollected = "collected" // sample collected, awaiting result
	LabOrderResulted  = "resulted"  // all lines have results
	LabOrderCancelled = "cancelled"
)

// Result flags for a lab line.
const (
	LabFlagNormal   = "normal"
	LabFlagHigh     = "high"
	LabFlagLow      = "low"
	LabFlagAbnormal = "abnormal" // non-numeric out-of-range (e.g. "Positive")
)

// LabTest is one catalog entry the lab can order and result.
type LabTest struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_labtest_code" json:"tenant_id"`
	// Code is a short human handle, unique within the tenant (e.g. CBC, LFT).
	Code string `gorm:"not null;uniqueIndex:idx_labtest_code" json:"code"`
	Name string `gorm:"not null" json:"name"`
	// Category groups tests (haematology, biochemistry, microbiology, …).
	Category string `json:"category"`
	// Panel groups tests into a named order-set (CBC, LFT, KFT, …) that a
	// clinician orders as one unit. Independent of Category — a panel can span
	// categories, and a category can span several panels. Blank for
	// standalone tests ordered on their own.
	Panel string `gorm:"index" json:"panel"`
	// Method is the assay/technique used (e.g. "ELISA", "Flow cytometry"),
	// surfaced on the pathology report. Blank when not tracked.
	Method string `json:"method"`
	// SampleType: blood | urine | stool | swab | other.
	SampleType string `gorm:"default:'blood'" json:"sample_type"`
	// Unit and numeric reference bounds drive the normal/high/low flag. When
	// RefLow == RefHigh == 0 the test is treated as qualitative (no auto flag).
	Unit      string    `json:"unit"`
	RefLow    float64   `gorm:"default:0" json:"ref_low"`
	RefHigh   float64   `gorm:"default:0" json:"ref_high"`
	RefText   string    `json:"ref_text"` // human-readable range, e.g. "13-17 g/dL"
	Price     float64   `gorm:"not null;default:0" json:"price"`
	Active    bool      `gorm:"default:true" json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (t *LabTest) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	return nil
}

// LabOrder is a request for one or more tests, tied to a patient and optionally
// to the encounter that produced it.
type LabOrder struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	PatientID string  `gorm:"not null;index" json:"patient_id"`
	Patient   Patient `gorm:"foreignKey:PatientID" json:"patient,omitempty"`

	// EncounterID links the visit this order came from; blank for standalone.
	EncounterID string `gorm:"index" json:"encounter_id"`

	OrderedByID string   `gorm:"index" json:"ordered_by_id"`
	OrderedBy   Employee `gorm:"foreignKey:OrderedByID" json:"ordered_by,omitempty"`

	// OrderDate is YYYY-MM-DD.
	OrderDate string         `gorm:"not null;index" json:"order_date"`
	Status    string         `gorm:"default:'ordered';index" json:"status"`
	Notes     string         `json:"notes"`
	Items     []LabOrderItem `gorm:"foreignKey:OrderID" json:"items,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (o *LabOrder) BeforeCreate(tx *gorm.DB) error {
	if o.ID == "" {
		o.ID = uuid.NewString()
	}
	return nil
}

// LabOrderItem is one test on an order, with its frozen catalog snapshot and an
// optional result. Snapshotting name/unit/range keeps historic reports stable
// even if the catalog entry later changes.
type LabOrderItem struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`
	OrderID  string `gorm:"not null;index" json:"order_id"`

	TestID   string  `gorm:"index" json:"test_id"`
	TestCode string  `json:"test_code"`
	TestName string  `json:"test_name"`
	Unit     string  `json:"unit"`
	RefLow   float64 `json:"ref_low"`
	RefHigh  float64 `json:"ref_high"`
	RefText  string  `json:"ref_text"`
	Price    float64 `json:"price"`

	// ResultValue is the entered result (blank until resulted). Flag is derived.
	ResultValue string     `json:"result_value"`
	Flag        string     `json:"flag"`
	ResultedAt  *time.Time `json:"resulted_at"`

	CreatedAt time.Time `json:"created_at"`
}

func (i *LabOrderItem) BeforeCreate(tx *gorm.DB) error {
	if i.ID == "" {
		i.ID = uuid.NewString()
	}
	return nil
}
