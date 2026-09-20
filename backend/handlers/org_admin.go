package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"time"

	"github.com/gofiber/fiber/v2"
)

// GetOrgProfile returns org profile for the authenticated tenant (admin only).
func GetOrgProfile(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var profile models.OrgProfile
	err := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).First(&profile).Error
	if err != nil {
		// If no profile, return tenant info as fallback
		var tenant models.Tenant
		if err := database.DB.WithContext(c.Context()).First(&tenant, "id = ?", tenantID).Error; err != nil {
			return utils.NotFound(c, "Tenant not found")
		}
		return utils.OK(c, fiber.Map{
			"id":              tenantID,
			"name":            tenant.Name,
			"logo_url":        tenant.LogoURL,
			"timezone":        tenant.Timezone,
			"currency":        tenant.Currency,
			"primary_color":   "",
			"accent_color":    "",
			"accreditation":   "",
		}, "")
	}
	return utils.OK(c, profile, "")
}

type UpsertOrgProfileRequest struct {
	Name            string `json:"name"`
	LogoURL         string `json:"logo_url"`
	Tagline         string `json:"tagline"`
	PrimaryColor    string `json:"primary_color"`
	AccentColor     string `json:"accent_color"`
	Accreditation   string `json:"accreditation"`
}

// UpdateOrgProfile creates or updates org profile (admin only).
func UpdateOrgProfile(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req UpsertOrgProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	var profile models.OrgProfile
	err := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).First(&profile).Error
	if err != nil {
		// Create new profile
		profile = models.OrgProfile{
			TenantID:      tenantID,
			Name:          req.Name,
			LogoURL:       req.LogoURL,
			Tagline:       req.Tagline,
			PrimaryColor:  req.PrimaryColor,
			AccentColor:   req.AccentColor,
			Accreditation: req.Accreditation,
		}
		if err := database.DB.WithContext(c.Context()).Create(&profile).Error; err != nil {
			return utils.InternalError(c, "Could not create org profile")
		}
	} else {
		// Update existing profile
		if req.Name != "" {
			profile.Name = req.Name
		}
		if req.LogoURL != "" {
			profile.LogoURL = req.LogoURL
		}
		if req.Tagline != "" {
			profile.Tagline = req.Tagline
		}
		if req.PrimaryColor != "" {
			profile.PrimaryColor = req.PrimaryColor
		}
		if req.AccentColor != "" {
			profile.AccentColor = req.AccentColor
		}
		if req.Accreditation != "" {
			profile.Accreditation = req.Accreditation
		}
		profile.UpdatedAt = time.Now()
		if err := database.DB.WithContext(c.Context()).Save(&profile).Error; err != nil {
			return utils.InternalError(c, "Failed to save record")
		}
	}

	return utils.OK(c, profile, "Org profile saved")
}

// GetOrgSetupStatus returns the setup status of the organization (admin only).
func GetOrgSetupStatus(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var profileCount, deptCount, yearCount, userCount int64

	database.DB.WithContext(c.Context()).Model(&models.OrgProfile{}).Where("tenant_id = ?", tenantID).Count(&profileCount)
	database.DB.WithContext(c.Context()).Model(&models.Department{}).Where("tenant_id = ?", tenantID).Count(&deptCount)
	database.DB.WithContext(c.Context()).Model(&models.AcademicYear{}).Where("tenant_id = ?", tenantID).Count(&yearCount)
	database.DB.WithContext(c.Context()).Model(&models.User{}).Where("tenant_id = ? AND role != ?", tenantID, models.RoleAdmin).Count(&userCount)

	return utils.OK(c, fiber.Map{
		"org_profile":   profileCount > 0,
		"departments":   deptCount > 0,
		"academic_year": yearCount > 0,
		"first_user":    userCount > 0,
	}, "")
}

// DepartmentHandlers (moved from employees.go for org_admin context)

type UpdateDepartmentRequest struct {
	Name string `json:"name"`
	Code string `json:"code"`
}

// UpdateDepartment updates a department (admin only).
func UpdateDepartment(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	var dept models.Department
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&dept).Error; err != nil {
		return utils.NotFound(c, "Department not found")
	}

	var req UpdateDepartmentRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.Name != "" {
		dept.Name = req.Name
	}
	dept.Code = req.Code
	if err := database.DB.WithContext(c.Context()).Save(&dept).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	return utils.OK(c, dept, "Department updated")
}

// DeleteDepartment removes a department (admin only).
func DeleteDepartment(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	// Check if employees exist
	var empCount int64
	database.DB.WithContext(c.Context()).Model(&models.Employee{}).Where("department_id = ?", id).Count(&empCount)
	if empCount > 0 {
		return utils.BadRequest(c, "Cannot delete department — employees assigned to it")
	}

	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&models.Department{}).Error; err != nil {
		return utils.NotFound(c, "Department not found")
	}
	return utils.OK(c, nil, "Department deleted")
}

// AcademicYear handlers

type CreateAcademicYearRequest struct {
	Name      string `json:"name"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	IsCurrent bool   `json:"is_current"`
}

// ListAcademicYears returns academic years for the tenant (admin only).
func ListAcademicYears(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var years []models.AcademicYear
	database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Find(&years)
	return utils.OK(c, years, "")
}

// CreateAcademicYear creates a new academic year (admin only).
func CreateAcademicYear(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req CreateAcademicYearRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.Name == "" || req.StartDate == "" || req.EndDate == "" {
		return utils.BadRequest(c, "Name, start_date, and end_date are required")
	}

	startDate, _ := time.Parse("2006-01-02", req.StartDate)
	endDate, _ := time.Parse("2006-01-02", req.EndDate)

	// If is_current, unset previous current year
	if req.IsCurrent {
		database.DB.WithContext(c.Context()).Model(&models.AcademicYear{}).
			Where("tenant_id = ? AND is_current = ?", tenantID, true).
			Update("is_current", false)
	}

	year := models.AcademicYear{
		TenantID:  tenantID,
		Name:      req.Name,
		StartDate: startDate,
		EndDate:   endDate,
		IsCurrent: req.IsCurrent,
	}

	if err := database.DB.WithContext(c.Context()).Create(&year).Error; err != nil {
		return utils.InternalError(c, "Could not create academic year")
	}

	return utils.Created(c, year, "Academic year created")
}

// UpdateAcademicYear updates an academic year (admin only).
func UpdateAcademicYear(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	var year models.AcademicYear
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&year).Error; err != nil {
		return utils.NotFound(c, "Academic year not found")
	}

	var req CreateAcademicYearRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.Name != "" {
		year.Name = req.Name
	}
	if req.StartDate != "" {
		startDate, _ := time.Parse("2006-01-02", req.StartDate)
		year.StartDate = startDate
	}
	if req.EndDate != "" {
		endDate, _ := time.Parse("2006-01-02", req.EndDate)
		year.EndDate = endDate
	}

	if err := database.DB.WithContext(c.Context()).Save(&year).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	return utils.OK(c, year, "Academic year updated")
}

// SetCurrentAcademicYear sets the current academic year (admin only).
func SetCurrentAcademicYear(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	var year models.AcademicYear
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&year).Error; err != nil {
		return utils.NotFound(c, "Academic year not found")
	}

	// Unset other current years
	database.DB.WithContext(c.Context()).Model(&models.AcademicYear{}).
		Where("tenant_id = ? AND id != ?", tenantID, id).
		Update("is_current", false)

	// Set this as current
	year.IsCurrent = true
	if err := database.DB.WithContext(c.Context()).Save(&year).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}

	return utils.OK(c, year, "Academic year set as current")
}

// Semester handlers

type CreateSemesterRequest struct {
	AcademicYearID string `json:"academic_year_id"`
	Number         int    `json:"number"`
	Name           string `json:"name"`
	StartDate      string `json:"start_date"`
	EndDate        string `json:"end_date"`
}

// ListSemesters returns semesters for an academic year (admin only).
func ListSemesters(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	academicYearID := c.Query("academic_year_id")

	query := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID)
	if academicYearID != "" {
		query = query.Where("academic_year_id = ?", academicYearID)
	}

	var semesters []models.Semester
	query.Find(&semesters)
	return utils.OK(c, semesters, "")
}

// CreateSemester creates a new semester (admin only).
func CreateSemester(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req CreateSemesterRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.AcademicYearID == "" || req.Name == "" {
		return utils.BadRequest(c, "academic_year_id and name are required")
	}

	startDate, _ := time.Parse("2006-01-02", req.StartDate)
	endDate, _ := time.Parse("2006-01-02", req.EndDate)

	sem := models.Semester{
		TenantID:       tenantID,
		AcademicYearID: req.AcademicYearID,
		Number:         req.Number,
		Name:           req.Name,
		StartDate:      startDate,
		EndDate:        endDate,
	}

	if err := database.DB.WithContext(c.Context()).Create(&sem).Error; err != nil {
		return utils.InternalError(c, "Could not create semester")
	}

	return utils.Created(c, sem, "Semester created")
}

// CustomRole handlers

type CreateCustomRoleRequest struct {
	Name        string `json:"name"`
	Permissions string `json:"permissions"` // JSON string
}

// ListCustomRoles returns custom roles for the tenant (admin only).
func ListCustomRoles(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var roles []models.CustomRole
	database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Find(&roles)
	return utils.OK(c, roles, "")
}

// CreateCustomRole creates a new custom role (admin only).
func CreateCustomRole(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req CreateCustomRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.Name == "" {
		return utils.BadRequest(c, "Name is required")
	}

	role := models.CustomRole{
		TenantID:    tenantID,
		Name:        req.Name,
		Permissions: req.Permissions,
	}

	if err := database.DB.WithContext(c.Context()).Create(&role).Error; err != nil {
		return utils.InternalError(c, "Could not create custom role")
	}

	return utils.Created(c, role, "Custom role created")
}

// UpdateCustomRole updates a custom role (admin only).
func UpdateCustomRole(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	var role models.CustomRole
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&role).Error; err != nil {
		return utils.NotFound(c, "Custom role not found")
	}

	var req CreateCustomRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.Name != "" {
		role.Name = req.Name
	}
	if req.Permissions != "" {
		role.Permissions = req.Permissions
	}
	role.UpdatedAt = time.Now()

	if err := database.DB.WithContext(c.Context()).Save(&role).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	return utils.OK(c, role, "Custom role updated")
}

// DeleteCustomRole deletes a custom role (admin only).
func DeleteCustomRole(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	result := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&models.CustomRole{})
	if result.RowsAffected == 0 {
		return utils.NotFound(c, "Custom role not found")
	}
	return utils.OK(c, nil, "Custom role deleted")
}
