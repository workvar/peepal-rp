package handlers

// Payroll handlers: generation, listing, status updates, deletion, and summaries.

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"errors"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// ListPayrolls returns payroll records for the tenant with optional
// month, year, employee_id, and status filters.
func ListPayrolls(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	month := c.Query("month")
	year := c.Query("year")
	employeeID := c.Query("employee_id")
	status := c.Query("status")

	var payrolls []models.Payroll
	q := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).
		Preload("EmployeeModel").
		Preload("EmployeeModel.User").
		Preload("EmployeeModel.Department")
	if month != "" {
		q = q.Where("month = ?", month)
	}
	if year != "" {
		q = q.Where("year = ?", year)
	}
	if employeeID != "" {
		q = q.Where("employee_id = ?", employeeID)
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	q.Order("year desc, month desc").Find(&payrolls)
	return utils.OK(c, payrolls, "")
}

// GetMyPayrolls returns payroll records belonging to the calling user's employee profile.
func GetMyPayrolls(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := c.Locals("userID").(string)

	var employee models.Employee
	if err := database.DB.WithContext(c.Context()).Where("tenant_id = ? AND user_id = ?", tenantID, userID).First(&employee).Error; err != nil {
		return utils.NotFound(c, "Employee profile not found")
	}

	var payrolls []models.Payroll
	database.DB.WithContext(c.Context()).Where("tenant_id = ? AND employee_id = ?", tenantID, employee.ID).
		Preload("EmployeeModel").
		Preload("EmployeeModel.User").
		Preload("EmployeeModel.Department").
		Order("year desc, month desc").Find(&payrolls)
	return utils.OK(c, payrolls, "")
}

// GeneratePayroll creates a draft payroll record for an employee and month,
// pro-rating allowances by attendance while keeping deductions fixed.
func GeneratePayroll(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := c.Locals("userID").(string)

	type Request struct {
		EmployeeID  string `json:"employee_id"`
		Month       int    `json:"month"`
		Year        int    `json:"year"`
		WorkingDays int    `json:"working_days"`
		PresentDays int    `json:"present_days"`
		LeaveDays   int    `json:"leave_days"`
		Notes       string `json:"notes"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.EmployeeID == "" || req.Month == 0 || req.Year == 0 {
		return utils.BadRequest(c, "employee_id, month, and year are required")
	}
	if req.Month < 1 || req.Month > 12 {
		return utils.BadRequest(c, "month must be between 1 and 12")
	}
	if req.WorkingDays < 0 || req.PresentDays < 0 || req.LeaveDays < 0 {
		return utils.BadRequest(c, "working_days, present_days, and leave_days cannot be negative")
	}

	// Duplicate check.
	var existing models.Payroll
	existingResult := database.DB.WithContext(c.Context()).Where(
		"tenant_id = ? AND employee_id = ? AND month = ? AND year = ?",
		tenantID, req.EmployeeID, req.Month, req.Year,
	).Limit(1).Find(&existing)
	if existingResult.Error != nil {
		return utils.InternalError(c, "Failed to validate existing payroll")
	}
	if existingResult.RowsAffected > 0 {
		return utils.BadRequest(c, "Payroll already exists for this employee and month")
	}

	assignment, err := resolveAssignmentForPayroll(tenantID, req.EmployeeID, req.Month, req.Year)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return utils.BadRequest(c, "No salary template assigned to this employee for the selected month. Assign one before generating payroll.")
		}
		return utils.InternalError(c, "Failed to resolve salary assignment")
	}
	tpl := assignment.TemplateModel

	ratio := 1.0
	if req.WorkingDays > 0 {
		ratio = float64(req.PresentDays+req.LeaveDays) / float64(req.WorkingDays)
		if ratio > 1.0 {
			ratio = 1.0
		}
		if ratio < 0 {
			ratio = 0
		}
	}

	basic := tpl.BasicSalary * ratio
	hra := tpl.HRA * ratio
	da := tpl.DA * ratio
	ta := tpl.TA * ratio
	medical := tpl.MedicalAllowance * ratio
	other := tpl.OtherAllowances * ratio
	extraAllow := assignment.ExtraAllowance * ratio
	gross := basic + hra + da + ta + medical + other + extraAllow

	// Deductions are NOT pro-rated: statutory contributions are typically
	// fixed, and ad-hoc extra deductions (e.g. loan recovery) shouldn't
	// shrink just because the employee missed a few days.
	pf := tpl.PF
	esi := tpl.ESI
	tds := tpl.TDS
	otherDed := tpl.OtherDeductions
	extraDed := assignment.ExtraDeduction
	totalDed := pf + esi + tds + otherDed + extraDed
	net := gross - totalDed
	if net < 0 {
		net = 0
	}

	payroll := models.Payroll{
		TenantID:         tenantID,
		EmployeeID:       req.EmployeeID,
		TemplateID:       tpl.ID,
		TemplateName:     tpl.Name,
		Month:            req.Month,
		Year:             req.Year,
		BasicSalary:      basic,
		HRA:              hra,
		DA:               da,
		TA:               ta,
		MedicalAllowance: medical,
		OtherAllowances:  other,
		ExtraAllowance:   extraAllow,
		GrossSalary:      gross,
		PF:               pf,
		ESI:              esi,
		TDS:              tds,
		OtherDeductions:  otherDed,
		ExtraDeduction:   extraDed,
		TotalDeductions:  totalDed,
		NetSalary:        net,
		WorkingDays:      req.WorkingDays,
		PresentDays:      req.PresentDays,
		LeaveDays:        req.LeaveDays,
		Status:           "draft",
		ProcessedBy:      userID,
		Notes:            req.Notes,
	}
	if err := database.DB.WithContext(c.Context()).Create(&payroll).Error; err != nil {
		return utils.InternalError(c, "Failed to generate payroll")
	}
	return utils.Created(c, payroll, "Payroll generated successfully")
}

// UpdatePayrollStatus transitions a payroll record between draft, approved, and paid.
func UpdatePayrollStatus(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var payroll models.Payroll
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&payroll).Error; err != nil {
		return utils.NotFound(c, "Payroll not found")
	}

	type Request struct {
		Status      string     `json:"status"`
		PaymentDate *time.Time `json:"payment_date"`
		PaymentMode string     `json:"payment_mode"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	validStatuses := map[string]bool{"draft": true, "approved": true, "paid": true}
	if !validStatuses[req.Status] {
		return utils.BadRequest(c, "Invalid status. Must be draft, approved, or paid")
	}

	payroll.Status = req.Status
	if req.PaymentDate != nil {
		payroll.PaymentDate = req.PaymentDate
	}
	if req.PaymentMode != "" {
		payroll.PaymentMode = req.PaymentMode
	}
	if err := database.DB.WithContext(c.Context()).Save(&payroll).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	return utils.OK(c, payroll, "Payroll status updated")
}

// DeletePayroll removes a payroll record unless it has already been paid.
func DeletePayroll(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var payroll models.Payroll
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&payroll).Error; err != nil {
		return utils.NotFound(c, "Payroll not found")
	}
	if payroll.Status == "paid" {
		return utils.BadRequest(c, "Cannot delete a paid payroll record")
	}
	if err := database.DB.WithContext(c.Context()).Delete(&payroll).Error; err != nil {
		return utils.InternalError(c, "Failed to delete record")
	}
	return utils.OK(c, nil, "Payroll deleted")
}

// GetPayrollSummary aggregates gross, deduction, net, and status counts for a period.
func GetPayrollSummary(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	month := c.Query("month")
	year := c.Query("year")

	var payrolls []models.Payroll
	q := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).
		Preload("EmployeeModel").
		Preload("EmployeeModel.User").
		Preload("EmployeeModel.Department")
	if month != "" {
		q = q.Where("month = ?", month)
	}
	if year != "" {
		q = q.Where("year = ?", year)
	}
	q.Find(&payrolls)

	type Summary struct {
		TotalEmployees  int     `json:"total_employees"`
		TotalGross      float64 `json:"total_gross"`
		TotalDeductions float64 `json:"total_deductions"`
		TotalNet        float64 `json:"total_net"`
		DraftCount      int     `json:"draft_count"`
		ApprovedCount   int     `json:"approved_count"`
		PaidCount       int     `json:"paid_count"`
	}
	var summary Summary
	summary.TotalEmployees = len(payrolls)
	for _, p := range payrolls {
		summary.TotalGross += p.GrossSalary
		summary.TotalDeductions += p.TotalDeductions
		summary.TotalNet += p.NetSalary
		switch p.Status {
		case "draft":
			summary.DraftCount++
		case "approved":
			summary.ApprovedCount++
		case "paid":
			summary.PaidCount++
		}
	}
	return utils.OK(c, summary, "")
}
