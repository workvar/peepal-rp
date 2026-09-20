package handlers

import (
	"bytes"
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	pdftemplate "collegeerp/pdf-template"
	"collegeerp/utils"
	"fmt"

	"github.com/gofiber/fiber/v2"
)

// DownloadPayslipPDF serves a paid payroll as a PDF payslip.
//
// Authorization:
//   - admin / super_admin: can download any payroll in their tenant
//   - teacher / staff / student: can download only their own (if employee profile linked)
//
// Only payrolls with status == "paid" are downloadable. Draft or approved
// records are rejected with a 400 so employees can't download an unfinalised
// payslip — matches the frontend gating.
func DownloadPayslipPDF(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := middleware.UserID(c)
	role := middleware.UserRole(c)
	id := c.Params("id")

	if id == "" {
		return utils.BadRequest(c, "Payroll id is required")
	}

	// Fetch payroll with employee + user + department + tenant for header.
	var payroll models.Payroll
	if err := database.DB.WithContext(c.Context()).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Preload("EmployeeModel").
		Preload("EmployeeModel.User").
		Preload("EmployeeModel.Department").
		First(&payroll).Error; err != nil {
		return utils.NotFound(c, "Payroll not found")
	}

	// Gating: only paid payrolls may be downloaded as a payslip.
	if payroll.Status != "paid" {
		return utils.BadRequest(c, "Only paid payrolls can be downloaded as a payslip")
	}

	// Ownership check for non-admins: the requesting user must be linked to
	// the employee on this payroll record.
	isAdmin := role == string(models.RoleAdmin) || role == string(models.RoleSuperAdmin)
	if !isAdmin {
		var employee models.Employee
		if err := database.DB.WithContext(c.Context()).
			Where("tenant_id = ? AND user_id = ?", tenantID, userID).
			First(&employee).Error; err != nil {
			return utils.Forbidden(c, "No employee profile linked to this account")
		}
		if employee.ID != payroll.EmployeeID {
			return utils.Forbidden(c, "You can only download your own payslips")
		}
	}

	// Look up tenant name for the header.
	var tenant models.Tenant
	_ = database.DB.WithContext(c.Context()).Where("id = ?", tenantID).First(&tenant).Error // non-fatal

	// Ensure nested employee data is populated. GORM's nested preload can
	// silently return an empty Employee or User; always re-fetch from the FK on
	// the Payroll row — the same fallback exists in enrichPayrollForDisplay.
	if payroll.EmployeeID != "" &&
		(payroll.EmployeeModel.ID == "" || payroll.EmployeeModel.User.ID == "") {
		var emp models.Employee
		if err := database.DB.WithContext(c.Context()).
			Where("id = ?", payroll.EmployeeID).
			Preload("User").
			Preload("Department").
			First(&emp).Error; err == nil {
			// Direct user lookup if nested preload still returned empty.
			if emp.User.ID == "" && emp.UserID != "" {
				var u models.User
				if err2 := database.DB.WithContext(c.Context()).
					Where("id = ?", emp.UserID).First(&u).Error; err2 == nil {
					emp.User = u
				}
			}
			payroll.EmployeeModel = emp
		}
	}

	// Build the PDF.
	data := buildPayslipData(payroll, tenant)
	pdfBytes, err := pdftemplate.BuildPayslipPDF(data)
	if err != nil {
		return utils.InternalError(c, "Failed to generate payslip PDF")
	}

	// Stream back as a download.
	empCode := payroll.EmployeeModel.EmployeeID
	if empCode == "" {
		empCode = payroll.EmployeeID
	}
	filename := fmt.Sprintf("payslip_%s_%04d-%02d.pdf", empCode, payroll.Year, payroll.Month)

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	return c.SendStream(bytes.NewReader(pdfBytes))
}

// buildPayslipData flattens GORM models into the view-model the PDF
// builder consumes. Kept here (not in utils/) because it touches many
// model fields and is specific to this handler.
func buildPayslipData(p models.Payroll, tenant models.Tenant) pdftemplate.PayslipData {
	emp := p.EmployeeModel

	empName := ""
	empEmail := ""
	if emp.User.ID != "" {
		empName = emp.User.Name
		empEmail = emp.User.Email
	}

	deptName := ""
	if emp.Department.ID != "" {
		deptName = emp.Department.Name
	}

	paymentDate := ""
	if p.PaymentDate != nil {
		paymentDate = p.PaymentDate.Format("02 January 2006")
	}
	paymentMode := formatPaymentMode(p.PaymentMode)

	currency := tenant.Currency
	if currency == "" {
		currency = "INR"
	}

	return pdftemplate.PayslipData{
		TenantName:   tenant.Name,
		EmployeeName: empName,
		EmployeeCode: emp.EmployeeID,
		Department:   deptName,
		Designation:  emp.Designation,
		Email:        empEmail,
		Period:       fmt.Sprintf("%s %d", monthFullName(p.Month), p.Year),
		PaymentDate:  paymentDate,
		PaymentMode:  paymentMode,
		WorkingDays:  p.WorkingDays,
		PresentDays:  p.PresentDays,
		LeaveDays:    p.LeaveDays,
		Payroll:      p,
		Currency:     currency,
	}
}

func formatPaymentMode(mode string) string {
	switch mode {
	case "bank_transfer":
		return "Bank Transfer"
	case "cash":
		return "Cash"
	case "cheque":
		return "Cheque"
	case "upi":
		return "UPI"
	case "neft":
		return "NEFT"
	case "rtgs":
		return "RTGS"
	case "imps":
		return "IMPS"
	case "":
		return "-"
	default:
		return mode
	}
}

func monthFullName(m int) string {
	names := []string{
		"January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December",
	}
	if m < 1 || m > 12 {
		return ""
	}
	return names[m-1]
}
