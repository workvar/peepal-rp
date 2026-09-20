package handlers

import (
	"collegeerp/audit"
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"errors"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// ListDepartments returns all departments for the authenticated tenant.
func ListDepartments(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var depts []models.Department
	database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Find(&depts)
	return utils.OK(c, depts, "")
}

// CreateDepartment creates a new department for the authenticated tenant.
func CreateDepartment(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var dept models.Department
	if err := c.BodyParser(&dept); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if dept.Name == "" {
		return utils.BadRequest(c, "Department name is required")
	}
	dept.TenantID = tenantID
	if err := database.DB.WithContext(c.Context()).Create(&dept).Error; err != nil {
		return utils.BadRequest(c, "Department already exists")
	}
	// This REST path bypasses the GraphQL field middleware, so record the audit
	// entry here (mirrors the createDepartment mutation's audit).
	audit.Record(audit.Entry{
		TenantID: tenantID, ActorID: middleware.UserID(c), ActorRole: middleware.UserRole(c),
		Action: models.AuditCreate, Module: "departments", Operation: "createDepartment",
		EntityID: dept.ID, IP: c.IP(),
	})
	return utils.Created(c, dept, "Department created")
}

// ListEmployees returns all employees for the authenticated tenant.
func ListEmployees(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var employees []models.Employee
	database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).
		Preload("User").
		Preload("Department").
		Preload("PaymentDetails").
		Find(&employees)
	return utils.OK(c, employees, "")
}

// GetEmployee returns a single employee for the authenticated tenant.
func GetEmployee(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	var emp models.Employee
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).
		Preload("User").
		Preload("Department").
		Preload("PaymentDetails").
		First(&emp).Error; err != nil {
		return utils.NotFound(c, "Employee not found")
	}
	return utils.OK(c, emp, "")
}

type PaymentDetailsRequest struct {
	BankName          string  `json:"bank_name"`
	AccountNumber     string  `json:"account_number"`
	AccountType       string  `json:"account_type"`
	IFSCCode          string  `json:"ifsc_code"`
	BranchName        string  `json:"branch_name"`
	PFNumber          string  `json:"pf_number"`
	UANNumber         string  `json:"uan_number"`
	PFEmployeePercent float64 `json:"pf_employee_percent"`
	PFEmployerPercent float64 `json:"pf_employer_percent"`
	ESINumber         string  `json:"esi_number"`
	ESIDispensary     string  `json:"esi_dispensary"`
	PANNumber         string  `json:"pan_number"`
	TaxRegime         string  `json:"tax_regime"`
	Form16Ref         string  `json:"form16_ref"`
	NPSAccountNumber  string  `json:"nps_account_number"`
	NPSTier           string  `json:"nps_tier"`
	GratuityEligible  bool    `json:"gratuity_eligible"`
}

type CreateEmployeeRequest struct {
	UserID           string `json:"user_id"`
	DepartmentID     string `json:"department_id"`
	Designation      string `json:"designation"`
	Phone            string `json:"phone"`
	EmployeeID       string `json:"employee_id"`
	DateOfBirth      string `json:"date_of_birth"`
	Gender           string `json:"gender"`
	BloodGroup       string `json:"blood_group"`
	PhotoURL         string `json:"photo_url"`
	Address          string `json:"address"`
	City             string `json:"city"`
	State            string `json:"state"`
	Pincode          string `json:"pincode"`
	Nationality      string `json:"nationality"`
	PersonalEmail    string `json:"personal_email"`
	EmergencyName    string `json:"emergency_name"`
	EmergencyPhone   string `json:"emergency_phone"`
	EmploymentType   string `json:"employment_type"`
	ProbationEndDate string `json:"probation_end_date"`
	GradeLevel       string `json:"grade_level"`
	JoinDate         string `json:"join_date"` // "2006-01-02"
	PaymentDetails *PaymentDetailsRequest `json:"payment_details"`
}

// CreateEmployee registers a user as an employee for the authenticated tenant.
func CreateEmployee(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req CreateEmployeeRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.UserID == "" {
		return utils.BadRequest(c, "user_id is required")
	}

	joinDate, _ := time.Parse("2006-01-02", req.JoinDate)
	emp := models.Employee{
		TenantID:         tenantID,
		UserID:           req.UserID,
		DepartmentID:     req.DepartmentID,
		Designation:      req.Designation,
		Phone:            req.Phone,
		EmployeeID:       req.EmployeeID,
		DateOfBirth:      req.DateOfBirth,
		Gender:           req.Gender,
		BloodGroup:       req.BloodGroup,
		PhotoURL:         req.PhotoURL,
		Address:          req.Address,
		City:             req.City,
		State:            req.State,
		Pincode:          req.Pincode,
		Nationality:      req.Nationality,
		PersonalEmail:    req.PersonalEmail,
		EmergencyName:    req.EmergencyName,
		EmergencyPhone:   req.EmergencyPhone,
		EmploymentType:   req.EmploymentType,
		ProbationEndDate: req.ProbationEndDate,
		GradeLevel:       req.GradeLevel,
		JoinDate:         joinDate,
	}

	err := database.DB.WithContext(c.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&emp).Error; err != nil {
			return err
		}
		if req.PaymentDetails != nil {
			pd := models.EmployeePaymentDetails{
				TenantID:          tenantID,
				EmployeeID:        emp.ID,
				BankName:          req.PaymentDetails.BankName,
				AccountNumber:     req.PaymentDetails.AccountNumber,
				AccountType:       req.PaymentDetails.AccountType,
				IFSCCode:          req.PaymentDetails.IFSCCode,
				BranchName:        req.PaymentDetails.BranchName,
				PFNumber:          req.PaymentDetails.PFNumber,
				UANNumber:         req.PaymentDetails.UANNumber,
				PFEmployeePercent: req.PaymentDetails.PFEmployeePercent,
				PFEmployerPercent: req.PaymentDetails.PFEmployerPercent,
				ESINumber:         req.PaymentDetails.ESINumber,
				ESIDispensary:     req.PaymentDetails.ESIDispensary,
				PANNumber:         req.PaymentDetails.PANNumber,
				TaxRegime:         req.PaymentDetails.TaxRegime,
				Form16Ref:         req.PaymentDetails.Form16Ref,
				NPSAccountNumber:  req.PaymentDetails.NPSAccountNumber,
				NPSTier:           req.PaymentDetails.NPSTier,
				GratuityEligible:  req.PaymentDetails.GratuityEligible,
			}
			if err := tx.Create(&pd).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return utils.BadRequest(c, "Could not create employee — user may already be registered")
	}

	database.DB.WithContext(c.Context()).Preload("User").Preload("Department").Preload("PaymentDetails").First(&emp, "id = ?", emp.ID)
	return utils.Created(c, emp, "Employee created")
}

// UpdateEmployee updates employee details for the authenticated tenant.
func UpdateEmployee(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	var emp models.Employee
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&emp).Error; err != nil {
		return utils.NotFound(c, "Employee not found")
	}

	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if v, ok := body["designation"].(string); ok {
		emp.Designation = v
	}
	if v, ok := body["phone"].(string); ok {
		emp.Phone = v
	}
	if v, ok := body["department_id"].(string); ok {
		emp.DepartmentID = v
	}
	if v, ok := body["employee_id"].(string); ok {
		emp.EmployeeID = v
	}
	if v, ok := body["date_of_birth"].(string); ok {
		emp.DateOfBirth = v
	}
	if v, ok := body["gender"].(string); ok {
		emp.Gender = v
	}
	if v, ok := body["blood_group"].(string); ok {
		emp.BloodGroup = v
	}
	if v, ok := body["photo_url"].(string); ok {
		emp.PhotoURL = v
	}
	if v, ok := body["address"].(string); ok {
		emp.Address = v
	}
	if v, ok := body["city"].(string); ok {
		emp.City = v
	}
	if v, ok := body["state"].(string); ok {
		emp.State = v
	}
	if v, ok := body["pincode"].(string); ok {
		emp.Pincode = v
	}
	if v, ok := body["nationality"].(string); ok {
		emp.Nationality = v
	}
	if v, ok := body["personal_email"].(string); ok {
		emp.PersonalEmail = v
	}
	if v, ok := body["emergency_name"].(string); ok {
		emp.EmergencyName = v
	}
	if v, ok := body["emergency_phone"].(string); ok {
		emp.EmergencyPhone = v
	}
	if v, ok := body["employment_type"].(string); ok {
		emp.EmploymentType = v
	}
	if v, ok := body["probation_end_date"].(string); ok {
		emp.ProbationEndDate = v
	}
	if v, ok := body["grade_level"].(string); ok {
		emp.GradeLevel = v
	}

	// Upsert payment_details if provided
	if pdRaw, ok := body["payment_details"].(map[string]interface{}); ok && pdRaw != nil {
		var pd models.EmployeePaymentDetails
		result := database.DB.WithContext(c.Context()).Where("employee_id = ?", emp.ID).First(&pd)
		isNew := errors.Is(result.Error, gorm.ErrRecordNotFound)
		if result.Error != nil && !isNew {
			return utils.BadRequest(c, "Could not fetch payment details")
		}
		pd.TenantID = tenantID
		pd.EmployeeID = emp.ID
		if v, ok := pdRaw["bank_name"].(string); ok { pd.BankName = v }
		if v, ok := pdRaw["account_number"].(string); ok { pd.AccountNumber = v }
		if v, ok := pdRaw["account_type"].(string); ok { pd.AccountType = v }
		if v, ok := pdRaw["ifsc_code"].(string); ok { pd.IFSCCode = v }
		if v, ok := pdRaw["branch_name"].(string); ok { pd.BranchName = v }
		if v, ok := pdRaw["pf_number"].(string); ok { pd.PFNumber = v }
		if v, ok := pdRaw["uan_number"].(string); ok { pd.UANNumber = v }
		if v, ok := pdRaw["pf_employee_percent"].(float64); ok { pd.PFEmployeePercent = v }
		if v, ok := pdRaw["pf_employer_percent"].(float64); ok { pd.PFEmployerPercent = v }
		if v, ok := pdRaw["esi_number"].(string); ok { pd.ESINumber = v }
		if v, ok := pdRaw["esi_dispensary"].(string); ok { pd.ESIDispensary = v }
		if v, ok := pdRaw["pan_number"].(string); ok { pd.PANNumber = v }
		if v, ok := pdRaw["tax_regime"].(string); ok { pd.TaxRegime = v }
		if v, ok := pdRaw["form16_ref"].(string); ok { pd.Form16Ref = v }
		if v, ok := pdRaw["nps_account_number"].(string); ok { pd.NPSAccountNumber = v }
		if v, ok := pdRaw["nps_tier"].(string); ok { pd.NPSTier = v }
		if v, ok := pdRaw["gratuity_eligible"].(bool); ok { pd.GratuityEligible = v }
		if isNew {
			if err := database.DB.WithContext(c.Context()).Create(&pd).Error; err != nil {
				return utils.BadRequest(c, "Could not save payment details")
			}
		} else {
			if err := database.DB.WithContext(c.Context()).Save(&pd).Error; err != nil {
				return utils.BadRequest(c, "Could not update payment details")
			}
		}
	}

	if err := database.DB.WithContext(c.Context()).Save(&emp).Error; err != nil {
		return utils.BadRequest(c, "Could not update employee")
	}
	database.DB.WithContext(c.Context()).Preload("User").Preload("Department").Preload("PaymentDetails").First(&emp, "id = ?", emp.ID)
	return utils.OK(c, emp, "Employee updated")
}

// DeleteEmployee removes an employee record for the authenticated tenant.
func DeleteEmployee(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&models.Employee{}).Error; err != nil {
		return utils.NotFound(c, "Employee not found")
	}
	return utils.OK(c, nil, "Employee deleted")
}
