package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Department struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index;uniqueIndex:idx_dept_name" json:"tenant_id"`
	Name     string `gorm:"not null;uniqueIndex:idx_dept_name" json:"name"`
	Code     string `gorm:"default:''" json:"code"`
	// HeadEmployeeID is the employee designated as Head of Department (HOD).
	// Students enrolled in courses under this department automatically get
	// their user.manager_id set to the HOD's user_id.
	HeadEmployeeID *string    `gorm:"index" json:"head_employee_id,omitempty"`
	HeadEmployee   *Employee  `gorm:"foreignKey:HeadEmployeeID" json:"head_employee,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	Employees      []Employee `gorm:"foreignKey:DepartmentID" json:"employees,omitempty"`
}

func (d *Department) BeforeCreate(tx *gorm.DB) error {
	if d.ID == "" {
		d.ID = uuid.NewString()
	}
	return nil
}

type Employee struct {
	ID               string                  `gorm:"primaryKey" json:"id"`
	TenantID         string                  `gorm:"not null;index;uniqueIndex:idx_emp_id" json:"tenant_id"`
	UserID           string                  `gorm:"uniqueIndex;not null" json:"user_id"`
	User             User                    `gorm:"foreignKey:UserID" json:"user"`
	DepartmentID     string                  `json:"department_id"`
	Department       Department              `gorm:"foreignKey:DepartmentID" json:"department"`
	Designation      string                  `json:"designation"`
	Phone            string                  `json:"phone"`
	EmployeeID       string                  `gorm:"uniqueIndex:idx_emp_id" json:"employee_id"`
	DateOfBirth      string                  `json:"date_of_birth"`
	Gender           string                  `json:"gender"`
	BloodGroup       string                  `json:"blood_group"`
	PhotoURL         string                  `json:"photo_url"`
	Address          string                  `json:"address"`
	City             string                  `json:"city"`
	State            string                  `json:"state"`
	Pincode          string                  `json:"pincode"`
	Nationality      string                  `json:"nationality"`
	PersonalEmail    string                  `json:"personal_email"`
	EmergencyName    string                  `json:"emergency_name"`
	EmergencyPhone   string                  `json:"emergency_phone"`
	EmploymentType   string                  `gorm:"default:'permanent'" json:"employment_type"` // permanent/contract/part-time
	ProbationEndDate string                  `json:"probation_end_date"`
	GradeLevel       string                  `json:"grade_level"`
	JoinDate         time.Time               `json:"join_date"`
	CreatedAt        time.Time               `json:"created_at"`
	UpdatedAt        time.Time               `json:"updated_at"`
	PaymentDetails   *EmployeePaymentDetails `gorm:"foreignKey:EmployeeID" json:"payment_details,omitempty"`
}

func (e *Employee) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.NewString()
	}
	return nil
}

// EmployeePaymentDetails holds payment-related compliance fields for an employee.
type EmployeePaymentDetails struct {
	ID            string    `gorm:"primaryKey" json:"id"`
	TenantID      string    `gorm:"not null;index" json:"tenant_id"`
	EmployeeID    string    `gorm:"uniqueIndex;not null" json:"employee_id"`
	EmployeeModel *Employee `gorm:"foreignKey:EmployeeID" json:"-"`

	// Bank Account
	BankName      string `json:"bank_name"`
	AccountNumber string `json:"account_number"`
	AccountType   string `json:"account_type"` // savings / current
	IFSCCode      string `json:"ifsc_code"`
	BranchName    string `json:"branch_name"`

	// PF
	PFNumber          string  `json:"pf_number"`
	UANNumber         string  `json:"uan_number"`
	PFEmployeePercent float64 `gorm:"default:12" json:"pf_employee_percent"`
	PFEmployerPercent float64 `gorm:"default:12" json:"pf_employer_percent"`

	// ESI
	ESINumber     string `json:"esi_number"`
	ESIDispensary string `json:"esi_dispensary"`

	// Tax / TDS
	PANNumber string `json:"pan_number"`
	TaxRegime string `json:"tax_regime"` // old / new
	Form16Ref string `json:"form16_ref"`

	// NPS / Gratuity
	NPSAccountNumber string `json:"nps_account_number"`
	NPSTier          string `json:"nps_tier"` // tier1 / tier2
	GratuityEligible bool   `gorm:"default:false" json:"gratuity_eligible"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (epd *EmployeePaymentDetails) BeforeCreate(tx *gorm.DB) error {
	if epd.ID == "" {
		epd.ID = uuid.NewString()
	}
	return nil
}
