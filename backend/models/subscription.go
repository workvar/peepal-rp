package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ALL_MODULES is the full list of feature modules available in Peepal
var ALL_MODULES = []string{
	"attendance", "marks", "leaves", "employees", "students",
	"payroll", "fees", "announcements", "reports", "academic",
	"learning", "hostel", "transport", "library", "events",
	"timetable", "notifications", "clinical", "billing", "pharmacy",
	"procurement", "finance",
}

// SubscriptionPlan is a reusable plan template created by super-admin
type SubscriptionPlan struct {
	ID            string  `gorm:"primaryKey" json:"id"`
	Name          string  `gorm:"not null;uniqueIndex" json:"name"`
	Description   string  `json:"description"`
	PriceMonthly  float64 `gorm:"default:0" json:"price_monthly"`
	PriceAnnually float64 `gorm:"default:0" json:"price_annually"`
	MaxStudents   int     `gorm:"default:100" json:"max_students"`
	MaxEmployees  int     `gorm:"default:20" json:"max_employees"`
	// Comma-separated module names, e.g. "attendance,marks,leaves"
	Modules   string    `gorm:"not null;default:'attendance,marks,leaves'" json:"modules"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (s *SubscriptionPlan) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

// TenantSubscription links a tenant to a plan with billing details
type TenantSubscription struct {
	ID       string           `gorm:"primaryKey" json:"id"`
	TenantID string           `gorm:"not null;uniqueIndex" json:"tenant_id"`
	Tenant   Tenant           `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	PlanID   string           `gorm:"not null;index" json:"plan_id"`
	Plan     SubscriptionPlan `gorm:"foreignKey:PlanID" json:"plan,omitempty"`
	// Override limits (0 = use plan defaults)
	MaxStudentsOverride  int `gorm:"default:0" json:"max_students_override"`
	MaxEmployeesOverride int `gorm:"default:0" json:"max_employees_override"`
	// Comma-separated module overrides (empty = use plan modules)
	ModulesOverride string    `gorm:"default:''" json:"modules_override"`
	Status          string    `gorm:"default:'active'" json:"status"`          // active, suspended, expired, trial
	BillingPeriod   string    `gorm:"default:'monthly'" json:"billing_period"` // monthly, annual
	StartDate       time.Time `json:"start_date"`
	EndDate         time.Time `json:"end_date"`
	TrialEndDate    time.Time `json:"trial_end_date"`
	Notes           string    `json:"notes"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func (s *TenantSubscription) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

// EffectiveMaxStudents returns the override if set, otherwise plan default
func (s *TenantSubscription) EffectiveMaxStudents() int {
	if s.MaxStudentsOverride > 0 {
		return s.MaxStudentsOverride
	}
	return s.Plan.MaxStudents
}

// EffectiveMaxEmployees returns the override if set, otherwise plan default
func (s *TenantSubscription) EffectiveMaxEmployees() int {
	if s.MaxEmployeesOverride > 0 {
		return s.MaxEmployeesOverride
	}
	return s.Plan.MaxEmployees
}

// EffectiveModules returns the override if set, otherwise plan modules
func (s *TenantSubscription) EffectiveModules() string {
	if s.ModulesOverride != "" {
		return s.ModulesOverride
	}
	return s.Plan.Modules
}
