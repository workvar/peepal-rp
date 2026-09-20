package handlers

// org_structure.go — endpoints powering the /organizationStructure page and
// manager assignment. We keep this in REST so the frontend can fetch the
// full org tree with one GET and so manager assignment doesn't require
// regenerating the gqlgen schema.

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

// orgUser is the slim representation of a user shown in the structure tree.
type orgUser struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Email        string  `json:"email"`
	Role         string  `json:"role"`
	PhotoURL     string  `json:"photo_url"`
	ManagerID    *string `json:"manager_id,omitempty"`
	DepartmentID *string `json:"department_id,omitempty"`
	Designation  string  `json:"designation,omitempty"`
}

// ListOrgUsers returns every active user in the tenant, with manager/dept
// fields and (when available) the Employee designation. The frontend uses
// this both for the manager dropdown and to build the hierarchy tree.
func ListOrgUsers(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	users := loadOrgUsers(tenantID)
	return utils.OK(c, users, "")
}

// loadOrgUsers is shared between ListOrgUsers and GetOrgStructure.
func loadOrgUsers(tenantID string) []orgUser {
	var users []models.User
	database.DB.Where("tenant_id = ?", tenantID).Order("name asc").Find(&users)

	// Pull employee designations + departments in one shot.
	var emps []models.Employee
	database.DB.Where("tenant_id = ?", tenantID).Find(&emps)
	empByUser := map[string]models.Employee{}
	for _, e := range emps {
		empByUser[e.UserID] = e
	}

	out := make([]orgUser, 0, len(users))
	for _, u := range users {
		ou := orgUser{
			ID:           u.ID,
			Name:         u.Name,
			Email:        u.Email,
			Role:         string(u.Role),
			PhotoURL:     u.PhotoURL,
			ManagerID:    u.ManagerID,
			DepartmentID: u.DepartmentID,
		}
		if e, ok := empByUser[u.ID]; ok {
			ou.Designation = e.Designation
			if ou.DepartmentID == nil && e.DepartmentID != "" {
				deptID := e.DepartmentID
				ou.DepartmentID = &deptID
			}
		}
		out = append(out, ou)
	}
	return out
}

// orgNode is a node in the hierarchy tree returned by GetOrgStructure.
type orgNode struct {
	orgUser
	Children []*orgNode `json:"children"`
}

// GetOrgStructure returns the org as a forest of trees keyed by manager.
// Optional ?department=<id> filter shows only users in that department
// (their managers are kept as roots even if they sit elsewhere).
func GetOrgStructure(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	deptFilter := c.Query("department")
	users := loadOrgUsers(tenantID)

	if deptFilter != "" {
		filtered := make([]orgUser, 0, len(users))
		for _, u := range users {
			if u.DepartmentID != nil && *u.DepartmentID == deptFilter {
				filtered = append(filtered, u)
			}
		}
		users = filtered
	}

	nodes := map[string]*orgNode{}
	for _, u := range users {
		u := u
		nodes[u.ID] = &orgNode{orgUser: u, Children: []*orgNode{}}
	}
	roots := []*orgNode{}
	for _, n := range nodes {
		if n.ManagerID == nil {
			roots = append(roots, n)
			continue
		}
		parent, ok := nodes[*n.ManagerID]
		if !ok {
			roots = append(roots, n)
			continue
		}
		parent.Children = append(parent.Children, n)
	}
	return utils.OK(c, fiber.Map{"roots": roots, "users": users}, "")
}

// SetUserManagerRequest body for AssignUserManager.
type SetUserManagerRequest struct {
	ManagerID    *string `json:"manager_id"`    // null clears it
	DepartmentID *string `json:"department_id"` // optional
}

// AssignUserManager updates a user's manager and/or department. Admin only.
func AssignUserManager(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	if id == "" {
		return utils.BadRequest(c, "User id required")
	}
	var u models.User
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&u).Error; err != nil {
		return utils.NotFound(c, "User not found")
	}
	var body SetUserManagerRequest
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid body")
	}
	// A user cannot be their own manager.
	if body.ManagerID != nil && *body.ManagerID == u.ID {
		return utils.BadRequest(c, "A user cannot be their own manager")
	}
	// If a manager id is provided, ensure it belongs to the same tenant.
	if body.ManagerID != nil && *body.ManagerID != "" {
		var mgr models.User
		if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", *body.ManagerID, tenantID).First(&mgr).Error; err != nil {
			return utils.BadRequest(c, "Manager not found in this tenant")
		}
	} else {
		body.ManagerID = nil
	}
	u.ManagerID = body.ManagerID
	if body.DepartmentID != nil {
		if *body.DepartmentID == "" {
			u.DepartmentID = nil
		} else {
			u.DepartmentID = body.DepartmentID
		}
	}
	if err := database.DB.WithContext(c.Context()).Save(&u).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	return utils.OK(c, fiber.Map{
		"id":            u.ID,
		"manager_id":    u.ManagerID,
		"department_id": u.DepartmentID,
	}, "Updated")
}
