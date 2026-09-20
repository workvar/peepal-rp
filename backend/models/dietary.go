package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Dietary / kitchen — healthcare industry, Phase 5. A diet plan per admitted
// patient and a log of meals served against it.

// Diet plan statuses.
const (
	DietActive       = "active"
	DietDiscontinued = "discontinued"
)

// DietPlan is the prescribed diet for an admitted patient.
type DietPlan struct {
	ID          string `gorm:"primaryKey" json:"id"`
	TenantID    string `gorm:"not null;index" json:"tenant_id"`
	AdmissionID string `gorm:"not null;index" json:"admission_id"`
	PatientID   string `gorm:"not null;index" json:"patient_id"`

	// DietType: normal | diabetic | renal | cardiac | soft | liquid | npo.
	DietType     string `gorm:"default:'normal'" json:"diet_type"`
	Calories     int    `json:"calories"`
	Restrictions string `json:"restrictions"`
	Notes        string `json:"notes"`
	Status       string `gorm:"default:'active';index" json:"status"`

	Servings []MealServing `gorm:"foreignKey:DietPlanID" json:"servings,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (d *DietPlan) BeforeCreate(tx *gorm.DB) error {
	if d.ID == "" {
		d.ID = uuid.NewString()
	}
	return nil
}

// MealServing records one meal delivered against a diet plan.
type MealServing struct {
	ID         string `gorm:"primaryKey" json:"id"`
	TenantID   string `gorm:"not null;index" json:"tenant_id"`
	DietPlanID string `gorm:"not null;index" json:"diet_plan_id"`

	// MealType: breakfast | lunch | dinner | snack.
	MealType string    `gorm:"default:'lunch'" json:"meal_type"`
	ServedAt time.Time `gorm:"index" json:"served_at"`
	// Status: served | refused | held.
	Status    string    `gorm:"default:'served'" json:"status"`
	Notes     string    `json:"notes"`
	CreatedAt time.Time `json:"created_at"`
}

func (m *MealServing) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	if m.ServedAt.IsZero() {
		m.ServedAt = time.Now()
	}
	return nil
}
