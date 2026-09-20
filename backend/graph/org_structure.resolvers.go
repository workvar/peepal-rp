package graph

import (
	"context"

	"collegeerp/graph/model"
	"collegeerp/models"
)

func (r *queryResolver) OrgUsers(ctx context.Context) ([]*model.OrgUser, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	users, d := loadOrgData(r, auth.TenantID)
	out := make([]*model.OrgUser, len(users))
	for i, u := range users {
		out[i] = toOrgUser(u, d)
	}
	return out, nil
}

func (r *queryResolver) OrgStructure(ctx context.Context, department *string) (*model.OrgStructure, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	users, d := loadOrgData(r, auth.TenantID)

	flat := make([]*model.OrgUser, 0, len(users))
	for _, u := range users {
		ou := toOrgUser(u, d)
		if department != nil && *department != "" {
			if ou.DepartmentID == nil || *ou.DepartmentID != *department {
				continue
			}
		}
		flat = append(flat, ou)
	}

	// Build node map.
	nodeMap := map[string]*model.OrgNode{}
	for _, ou := range flat {
		nodeMap[ou.ID] = &model.OrgNode{
			ID:           ou.ID,
			Name:         ou.Name,
			Email:        ou.Email,
			Role:         ou.Role,
			PhotoUrl:     ou.PhotoUrl,
			ManagerID:    ou.ManagerID,
			DepartmentID: ou.DepartmentID,
			Designation:  ou.Designation,
			Children:     []*model.OrgNode{},
		}
	}

	// For student nodes with no manager, derive the parent from their
	// department's HOD so they appear nested in the tree even before
	// manager_id has been persisted on the user record.
	for _, n := range nodeMap {
		if n.ManagerID != nil || n.Role != "student" || n.DepartmentID == nil {
			continue
		}
		if hodUID, ok := d.deptHODUserID[*n.DepartmentID]; ok && hodUID != "" {
			uid := hodUID
			n.ManagerID = &uid
		}
	}

	roots := []*model.OrgNode{}
	for _, n := range nodeMap {
		if n.ManagerID == nil {
			roots = append(roots, n)
			continue
		}
		parent, ok := nodeMap[*n.ManagerID]
		if !ok {
			roots = append(roots, n)
			continue
		}
		parent.Children = append(parent.Children, n)
	}

	return &model.OrgStructure{Roots: roots, Users: flat}, nil
}

func (r *mutationResolver) AssignUserManager(ctx context.Context, userID string, managerID *string, departmentID *string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}

	var u models.User
	if err := r.DB.Where("id = ? AND tenant_id = ?", userID, auth.TenantID).First(&u).Error; err != nil {
		return false, ErrNotFound
	}

	// Prevent self-manager.
	if managerID != nil && *managerID == u.ID {
		return false, GQLErr("a user cannot be their own manager")
	}

	if managerID != nil && *managerID != "" {
		var mgr models.User
		if err := r.DB.Where("id = ? AND tenant_id = ?", *managerID, auth.TenantID).First(&mgr).Error; err != nil {
			return false, GQLErr("manager not found in this tenant")
		}
		u.ManagerID = managerID
	} else {
		u.ManagerID = nil
	}

	if departmentID != nil {
		if *departmentID == "" {
			u.DepartmentID = nil
		} else {
			u.DepartmentID = departmentID
		}
	}

	r.DB.Save(&u)
	return true, nil
}

// ── helpers ──────────────────────────────────────────────────────────────────

type orgData struct {
	empByUser     map[string]models.Employee
	studentByUser map[string]models.Student
	// deptHODUserID maps departmentID → HOD's user_id (empty string if no HOD set).
	deptHODUserID map[string]string
}

func loadOrgData(r *queryResolver, tenantID string) ([]models.User, orgData) {
	var users []models.User
	r.DB.Where("tenant_id = ?", tenantID).Order("name asc").Find(&users)

	var emps []models.Employee
	r.DB.Where("tenant_id = ?", tenantID).Find(&emps)

	var students []models.Student
	r.DB.Preload("Course").Where("tenant_id = ?", tenantID).Find(&students)

	var depts []models.Department
	r.DB.Preload("HeadEmployee").Where("tenant_id = ?", tenantID).Find(&depts)

	empByUser := map[string]models.Employee{}
	for _, e := range emps {
		empByUser[e.UserID] = e
	}
	studentByUser := map[string]models.Student{}
	for _, s := range students {
		studentByUser[s.UserID] = s
	}
	// Build dept → HOD user_id map.
	deptHODUserID := map[string]string{}
	for _, dep := range depts {
		if dep.HeadEmployee != nil && dep.HeadEmployee.UserID != "" {
			deptHODUserID[dep.ID] = dep.HeadEmployee.UserID
		}
	}
	return users, orgData{empByUser: empByUser, studentByUser: studentByUser, deptHODUserID: deptHODUserID}
}

func toOrgUser(u models.User, d orgData) *model.OrgUser {
	ou := &model.OrgUser{
		ID:           u.ID,
		Name:         u.Name,
		Email:        u.Email,
		Role:         string(u.Role),
		PhotoUrl:     u.PhotoURL,
		ManagerID:    u.ManagerID,
		DepartmentID: u.DepartmentID,
		Designation:  "",
	}
	if e, ok := d.empByUser[u.ID]; ok {
		ou.Designation = e.Designation
		if ou.DepartmentID == nil && e.DepartmentID != "" {
			deptID := e.DepartmentID
			ou.DepartmentID = &deptID
		}
	}
	if s, ok := d.studentByUser[u.ID]; ok {
		// Show course name as designation so students are identifiable in the tree.
		if s.Course.Name != "" {
			label := s.Course.Name
			if s.Course.Code != "" {
				label = s.Course.Code
			}
			ou.Designation = label
		}
		// Populate DepartmentID from the course's department if not already set.
		if ou.DepartmentID == nil && s.Course.DepartmentID != "" {
			deptID := s.Course.DepartmentID
			ou.DepartmentID = &deptID
		}
	}
	return ou
}
