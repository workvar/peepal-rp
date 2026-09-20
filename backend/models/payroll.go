package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SalaryTemplate is a reusable, named salary structure that can be assigned
// to many employees. It owns only the pay component values — no employee FK.
type SalaryTemplate struct {
	ID               string    `gorm:"primaryKey" json:"id"`
	TenantID         string    `gorm:"not null;index" json:"tenant_id"`
	Name             string    `gorm:"not null" json:"name"` // e.g. "Assistant Professor - Grade A"
	Description      string    `json:"description"`
	BasicSalary      float64   `gorm:"not null" json:"basic_salary"`
	HRA              float64   `gorm:"default:0" json:"hra"`
	DA               float64   `gorm:"default:0" json:"da"`
	TA               float64   `gorm:"default:0" json:"ta"`
	MedicalAllowance float64   `gorm:"default:0" json:"medical_allowance"`
	OtherAllowances  float64   `gorm:"default:0" json:"other_allowances"`
	PF               float64   `gorm:"default:0" json:"pf"`
	ESI              float64   `gorm:"default:0" json:"esi"`
	TDS              float64   `gorm:"default:0" json:"tds"`
	OtherDeductions  float64   `gorm:"default:0" json:"other_deductions"`
	IsActive         bool      `gorm:"default:true" json:"is_active"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func (t *SalaryTemplate) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	return nil
}

// SalaryAssignment links an employee to a named SalaryTemplate for a given
// date range. Only one assignment per employee is active at a time.
// Per-employee overrides (extra allowance / extra deduction) allow bonuses
// or one-off adjustments on top of the shared template.
type SalaryAssignment struct {
	ID             string         `gorm:"primaryKey" json:"id"`
	TenantID       string         `gorm:"not null;index" json:"tenant_id"`
	EmployeeID     string         `gorm:"not null;index" json:"employee_id"`
	EmployeeModel  Employee       `gorm:"foreignKey:EmployeeID;references:ID" json:"employee"`
	TemplateID     string         `gorm:"not null;index" json:"template_id"`
	TemplateModel  SalaryTemplate `gorm:"foreignKey:TemplateID" json:"template"`
	ExtraAllowance float64        `gorm:"default:0" json:"extra_allowance"`
	ExtraDeduction float64        `gorm:"default:0" json:"extra_deduction"`
	EffectiveFrom  time.Time      `gorm:"not null" json:"effective_from"`
	EffectiveTo    *time.Time     `json:"effective_to"` // nil = still active
	IsActive       bool           `gorm:"default:true" json:"is_active"`
	Notes          string         `json:"notes"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}

func (a *SalaryAssignment) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}

// Payroll represents a monthly payroll record for an employee.
// The calculated pay components are snapshotted here so a later template
// change doesn't retroactively alter a generated payslip.
type Payroll struct {
	ID               string     `gorm:"primaryKey" json:"id"`
	TenantID         string     `gorm:"not null;index" json:"tenant_id"`
	EmployeeID       string     `gorm:"not null;index" json:"employee_id"`
	EmployeeModel    Employee   `gorm:"foreignKey:EmployeeID;references:ID" json:"employee"`
	TemplateID       string     `gorm:"index" json:"template_id"` // which template was used
	TemplateName     string     `json:"template_name"`            // snapshot so renames don't lose info
	Month            int        `gorm:"not null" json:"month"`
	Year             int        `gorm:"not null" json:"year"`
	BasicSalary      float64    `gorm:"not null" json:"basic_salary"`
	HRA              float64    `gorm:"default:0" json:"hra"`
	DA               float64    `gorm:"default:0" json:"da"`
	TA               float64    `gorm:"default:0" json:"ta"`
	MedicalAllowance float64    `gorm:"default:0" json:"medical_allowance"`
	OtherAllowances  float64    `gorm:"default:0" json:"other_allowances"`
	ExtraAllowance   float64    `gorm:"default:0" json:"extra_allowance"`
	GrossSalary      float64    `gorm:"not null" json:"gross_salary"`
	PF               float64    `gorm:"default:0" json:"pf"`
	ESI              float64    `gorm:"default:0" json:"esi"`
	TDS              float64    `gorm:"default:0" json:"tds"`
	OtherDeductions  float64    `gorm:"default:0" json:"other_deductions"`
	ExtraDeduction   float64    `gorm:"default:0" json:"extra_deduction"`
	TotalDeductions  float64    `gorm:"not null" json:"total_deductions"`
	NetSalary        float64    `gorm:"not null" json:"net_salary"`
	WorkingDays      int        `gorm:"default:0" json:"working_days"`
	PresentDays      int        `gorm:"default:0" json:"present_days"`
	LeaveDays        int        `gorm:"default:0" json:"leave_days"`
	Status           string     `gorm:"default:'draft'" json:"status"`
	PaymentDate      *time.Time `json:"payment_date"`
	PaymentMode      string     `json:"payment_mode"`
	Notes            string     `json:"notes"`
	ProcessedBy      string     `gorm:"index" json:"processed_by"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

func (p *Payroll) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	return nil
}

// PayrollDeduction represents ad-hoc deductions for a payroll record.
type PayrollDeduction struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	TenantID  string    `gorm:"not null;index" json:"tenant_id"`
	PayrollID string    `gorm:"not null;index" json:"payroll_id"`
	Name      string    `gorm:"not null" json:"name"`
	Amount    float64   `gorm:"not null" json:"amount"`
	Reason    string    `json:"reason"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (pd *PayrollDeduction) BeforeCreate(tx *gorm.DB) error {
	if pd.ID == "" {
		pd.ID = uuid.NewString()
	}
	return nil
}

// SalaryStructure is kept as a thin alias for the old GraphQL/API layer so
// existing generated resolvers keep compiling. It is *not* auto-migrated —
// the new system uses SalaryTemplate + SalaryAssignment. Any code still
// referring to this type should be migrated to the new models.
//
// The resolver layer synthesises SalaryStructure instances from
// SalaryAssignment + SalaryTemplate for backward-compatible reads.
type SalaryStructure struct {
	ID               string    `json:"id"`
	TenantID         string    `json:"tenant_id"`
	EmployeeID       string    `json:"employee_id"`
	EmployeeModel    Employee  `json:"employee"`
	BasicSalary      float64   `json:"basic_salary"`
	HRA              float64   `json:"hra"`
	DA               float64   `json:"da"`
	TA               float64   `json:"ta"`
	MedicalAllowance float64   `json:"medical_allowance"`
	OtherAllowances  float64   `json:"other_allowances"`
	PF               float64   `json:"pf"`
	ESI              float64   `json:"esi"`
	TDS              float64   `json:"tds"`
	OtherDeductions  float64   `json:"other_deductions"`
	EffectiveFrom    time.Time `json:"effective_from"`
	IsActive         bool      `json:"is_active"`
	Notes            string    `json:"notes"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}
