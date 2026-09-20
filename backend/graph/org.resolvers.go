package graph

import (
	"context"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"
)

// ── Org Profile ───────────────────────────────────────────────────────────────

func (r *queryResolver) OrgProfile(ctx context.Context) (*model.OrgProfile, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	// Identity policy comes from the tenant. Default to email-based if the
	// tenant cannot be loaded (should not happen for an authenticated user).
	staffReq, studentReq := true, true
	var tenant models.Tenant
	tenantLoaded := r.DB.First(&tenant, "id = ?", auth.TenantID).Error == nil
	if tenantLoaded {
		staffReq = tenant.StaffEmailReq()
		studentReq = tenant.StudentEmailReq()
	}

	var profile models.OrgProfile
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).First(&profile).Error; err != nil {
		// No profile row yet — fall back to the tenant name.
		name := ""
		if tenantLoaded {
			name = tenant.Name
		}
		return &model.OrgProfile{
			ID:                   auth.TenantID,
			Name:                 name,
			StaffEmailRequired:   staffReq,
			StudentEmailRequired: studentReq,
		}, nil
	}
	out := orgProfileToModel(profile)
	out.StaffEmailRequired = staffReq
	out.StudentEmailRequired = studentReq
	return out, nil
}

func (r *queryResolver) OrgSetupStatus(ctx context.Context) (*model.OrgSetupStatus, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var profileCount, deptCount, yearCount, userCount int64
	r.DB.Model(&models.OrgProfile{}).Where("tenant_id = ?", auth.TenantID).Count(&profileCount)
	r.DB.Model(&models.Department{}).Where("tenant_id = ?", auth.TenantID).Count(&deptCount)
	r.DB.Model(&models.AcademicYear{}).Where("tenant_id = ?", auth.TenantID).Count(&yearCount)
	r.DB.Model(&models.User{}).Where("tenant_id = ? AND role != ?", auth.TenantID, models.RoleAdmin).Count(&userCount)
	return &model.OrgSetupStatus{
		OrgProfile:   profileCount > 0,
		Departments:  deptCount > 0,
		AcademicYear: yearCount > 0,
		FirstUser:    userCount > 0,
	}, nil
}

func (r *mutationResolver) UpdateOrgProfile(ctx context.Context, input model.UpdateOrgProfileInput) (*model.OrgProfile, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}

	var profile models.OrgProfile
	err = r.DB.Where("tenant_id = ?", auth.TenantID).First(&profile).Error
	if err != nil {
		profile = models.OrgProfile{TenantID: auth.TenantID}
		if input.Name != nil {
			profile.Name = *input.Name
		}
		if input.LogoURL != nil {
			profile.LogoURL = *input.LogoURL
		}
		if input.Tagline != nil {
			profile.Tagline = *input.Tagline
		}
		if input.PrimaryColor != nil {
			profile.PrimaryColor = *input.PrimaryColor
		}
		if input.AccentColor != nil {
			profile.AccentColor = *input.AccentColor
		}
		if input.Accreditation != nil {
			profile.Accreditation = *input.Accreditation
		}
		r.DB.Create(&profile)
	} else {
		if input.Name != nil && *input.Name != "" {
			profile.Name = *input.Name
		}
		if input.LogoURL != nil {
			profile.LogoURL = *input.LogoURL
		}
		if input.Tagline != nil {
			profile.Tagline = *input.Tagline
		}
		if input.PrimaryColor != nil {
			profile.PrimaryColor = *input.PrimaryColor
		}
		if input.AccentColor != nil {
			profile.AccentColor = *input.AccentColor
		}
		if input.Accreditation != nil {
			profile.Accreditation = *input.Accreditation
		}
		profile.UpdatedAt = time.Now()
		r.DB.Save(&profile)
	}

	out := orgProfileToModel(profile)

	// Identity policy lives on the tenant, not the profile row. Apply any
	// changes, then reflect the current values back to the client.
	staffReq, studentReq := true, true
	var tenant models.Tenant
	if err := r.DB.First(&tenant, "id = ?", auth.TenantID).Error; err == nil {
		if input.StaffEmailRequired != nil {
			tenant.StaffEmailRequired = input.StaffEmailRequired
		}
		if input.StudentEmailRequired != nil {
			tenant.StudentEmailRequired = input.StudentEmailRequired
		}
		if input.StaffEmailRequired != nil || input.StudentEmailRequired != nil {
			r.DB.Save(&tenant)
		}
		staffReq = tenant.StaffEmailReq()
		studentReq = tenant.StudentEmailReq()
	}
	out.StaffEmailRequired = staffReq
	out.StudentEmailRequired = studentReq
	return out, nil
}

// ── Departments (update + delete) ─────────────────────────────────────────────

func (r *mutationResolver) UpdateDepartment(ctx context.Context, id string, input model.UpdateDepartmentInput) (*model.Department, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var dept models.Department
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&dept).Error; err != nil {
		return nil, ErrNotFound
	}
	if input.Name != nil && *input.Name != "" {
		dept.Name = *input.Name
	}
	if input.Code != nil {
		dept.Code = *input.Code
	}

	hodChanged := false
	if input.ClearHead != nil && *input.ClearHead {
		dept.HeadEmployeeID = nil
		hodChanged = true
	} else if input.HeadEmployeeId != nil && *input.HeadEmployeeId != "" {
		dept.HeadEmployeeID = input.HeadEmployeeId
		hodChanged = true
	}

	if err := r.DB.Save(&dept).Error; err != nil {
		return nil, err
	}

	// Cascade HOD change to all students enrolled in courses under this dept.
	if hodChanged {
		cascadeHODToStudents(r.DB, auth.TenantID, id, dept.HeadEmployeeID)
	}

	r.DB.Preload("HeadEmployee").Preload("HeadEmployee.User").First(&dept, "id = ?", dept.ID)
	return departmentToModel(dept), nil
}

func (r *mutationResolver) DeleteDepartment(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	var empCount int64
	r.DB.Model(&models.Employee{}).Where("department_id = ?", id).Count(&empCount)
	if empCount > 0 {
		return false, GQLErr("cannot delete department — employees assigned to it")
	}
	res := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.Department{})
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

// ── Academic Years ────────────────────────────────────────────────────────────

func (r *mutationResolver) CreateAcademicYear(ctx context.Context, input model.CreateAcademicYearInput) (*model.AcademicYear, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	start, _ := time.Parse("2006-01-02", input.StartDate)
	end, _ := time.Parse("2006-01-02", input.EndDate)

	isCurrent := false
	if input.IsCurrent != nil {
		isCurrent = *input.IsCurrent
	}
	if isCurrent {
		r.DB.Model(&models.AcademicYear{}).Where("tenant_id = ? AND is_current = ?", auth.TenantID, true).
			Update("is_current", false)
	}

	ay := models.AcademicYear{
		TenantID:  auth.TenantID,
		Name:      input.Name,
		StartDate: start,
		EndDate:   end,
		IsCurrent: isCurrent,
	}
	if err := r.DB.Create(&ay).Error; err != nil {
		return nil, err
	}
	return academicYearToModel(ay), nil
}

func (r *mutationResolver) UpdateAcademicYear(ctx context.Context, id string, input model.UpdateAcademicYearInput) (*model.AcademicYear, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var ay models.AcademicYear
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&ay).Error; err != nil {
		return nil, ErrNotFound
	}
	if input.Name != nil && *input.Name != "" {
		ay.Name = *input.Name
	}
	if input.StartDate != nil && *input.StartDate != "" {
		if t, err := time.Parse("2006-01-02", *input.StartDate); err == nil {
			ay.StartDate = t
		}
	}
	if input.EndDate != nil && *input.EndDate != "" {
		if t, err := time.Parse("2006-01-02", *input.EndDate); err == nil {
			ay.EndDate = t
		}
	}
	r.DB.Save(&ay)
	return academicYearToModel(ay), nil
}

func (r *mutationResolver) SetCurrentAcademicYear(ctx context.Context, id string) (*model.AcademicYear, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var ay models.AcademicYear
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&ay).Error; err != nil {
		return nil, ErrNotFound
	}
	r.DB.Model(&models.AcademicYear{}).Where("tenant_id = ? AND id != ?", auth.TenantID, id).
		Update("is_current", false)
	ay.IsCurrent = true
	r.DB.Save(&ay)
	return academicYearToModel(ay), nil
}

// ── Semesters ─────────────────────────────────────────────────────────────────

func (r *queryResolver) Semesters(ctx context.Context, academicYearID *string) ([]*model.Semester, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.Where("tenant_id = ?", auth.TenantID)
	if academicYearID != nil && *academicYearID != "" {
		q = q.Where("academic_year_id = ?", *academicYearID)
	}
	var rows []models.Semester
	if err := q.Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Semester, len(rows))
	for i, s := range rows {
		out[i] = semesterToModel(s)
	}
	return out, nil
}

func (r *mutationResolver) CreateSemester(ctx context.Context, input model.CreateSemesterInput) (*model.Semester, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	sem := models.Semester{
		TenantID:       auth.TenantID,
		AcademicYearID: input.AcademicYearID,
		Name:           input.Name,
	}
	if input.Number != nil {
		sem.Number = *input.Number
	}
	if input.StartDate != nil && *input.StartDate != "" {
		if t, err := time.Parse("2006-01-02", *input.StartDate); err == nil {
			sem.StartDate = t
		}
	}
	if input.EndDate != nil && *input.EndDate != "" {
		if t, err := time.Parse("2006-01-02", *input.EndDate); err == nil {
			sem.EndDate = t
		}
	}
	if err := r.DB.Create(&sem).Error; err != nil {
		return nil, err
	}
	return semesterToModel(sem), nil
}

// ── Custom Roles ──────────────────────────────────────────────────────────────

func (r *queryResolver) CustomRoles(ctx context.Context) ([]*model.CustomRole, error) {
	// Role and permission configuration is admin-facing.
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var roles []models.CustomRole
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).Find(&roles).Error; err != nil {
		return nil, err
	}

	// Self-heal: a tenant with no custom roles yet (created before the
	// per-industry defaults existed) gets its industry's ready-made roles
	// seeded on first read — the same pattern as SystemRoles below.
	if len(roles) == 0 {
		var tenant models.Tenant
		if err := r.DB.First(&tenant, "id = ?", auth.TenantID).Error; err == nil {
			if err := models.SeedDefaultRoles(r.DB, &tenant); err == nil {
				r.DB.Where("tenant_id = ?", auth.TenantID).Find(&roles)
			}
		}
	}

	out := make([]*model.CustomRole, len(roles))
	for i, cr := range roles {
		out[i] = customRoleToModel(cr)
	}
	return out, nil
}

func (r *mutationResolver) CreateCustomRole(ctx context.Context, input model.CreateCustomRoleInput) (*model.CustomRole, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	cr := models.CustomRole{
		TenantID: auth.TenantID,
		Name:     input.Name,
	}
	if input.Permissions != nil {
		cr.Permissions = *input.Permissions
	}
	if err := r.DB.Create(&cr).Error; err != nil {
		return nil, err
	}
	return customRoleToModel(cr), nil
}

func (r *mutationResolver) UpdateCustomRole(ctx context.Context, id string, input model.UpdateCustomRoleInput) (*model.CustomRole, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var cr models.CustomRole
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&cr).Error; err != nil {
		return nil, ErrNotFound
	}
	if input.Name != nil && *input.Name != "" {
		cr.Name = *input.Name
	}
	if input.Permissions != nil {
		cr.Permissions = *input.Permissions
	}
	cr.UpdatedAt = time.Now()
	r.DB.Save(&cr)
	return customRoleToModel(cr), nil
}

func (r *mutationResolver) DeleteCustomRole(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.CustomRole{})
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

func (r *mutationResolver) AssignUserCustomRole(ctx context.Context, userID string, customRoleID *string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	var u models.User
	if err := r.DB.Where("id = ? AND tenant_id = ?", userID, auth.TenantID).First(&u).Error; err != nil {
		return false, ErrNotFound
	}
	if customRoleID == nil || *customRoleID == "" {
		u.CustomRoleID = nil
	} else {
		var cr models.CustomRole
		if err := r.DB.Where("id = ? AND tenant_id = ?", *customRoleID, auth.TenantID).First(&cr).Error; err != nil {
			return false, GQLErr("custom role not found for this tenant")
		}
		u.CustomRoleID = customRoleID
	}
	r.DB.Save(&u)
	return true, nil
}

// ── helpers ───────────────────────────────────────────────────────────────────

func orgProfileToModel(p models.OrgProfile) *model.OrgProfile {
	return &model.OrgProfile{
		ID:            p.ID,
		Name:          p.Name,
		LogoURL:       p.LogoURL,
		Tagline:       p.Tagline,
		PrimaryColor:  p.PrimaryColor,
		AccentColor:   p.AccentColor,
		Accreditation: p.Accreditation,
	}
}

func semesterToModel(s models.Semester) *model.Semester {
	return &model.Semester{
		ID:             s.ID,
		AcademicYearID: s.AcademicYearID,
		Number:         s.Number,
		Name:           s.Name,
		StartDate:      s.StartDate.Format("2006-01-02"),
		EndDate:        s.EndDate.Format("2006-01-02"),
	}
}

func customRoleToModel(cr models.CustomRole) *model.CustomRole {
	return &model.CustomRole{
		ID:          cr.ID,
		Name:        cr.Name,
		Permissions: cr.Permissions,
	}
}

// SystemRoles returns the tenant's built-in roles, industry-labelled and
// ordered. These are seeded per-vertical at tenant creation (see
// models.SeedSystemRoles), so both the Roles page and the Add Employee dropdown
// read the same DB source instead of a hardcoded list. Falls back to seeding
// on the fly for any tenant created before this feature existed.
func (r *queryResolver) SystemRoles(ctx context.Context) ([]*model.SystemRole, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}

	var roles []models.SystemRole
	if err := r.DB.Where("tenant_id = ?", auth.TenantID).
		Order("sort_order asc").Find(&roles).Error; err != nil {
		return nil, err
	}

	// Self-heal: a tenant that predates this table gets seeded on first read.
	if len(roles) == 0 {
		var tenant models.Tenant
		if err := r.DB.First(&tenant, "id = ?", auth.TenantID).Error; err == nil {
			if err := models.SeedSystemRoles(r.DB, &tenant); err == nil {
				r.DB.Where("tenant_id = ?", auth.TenantID).
					Order("sort_order asc").Find(&roles)
			}
		}
	}

	out := make([]*model.SystemRole, len(roles))
	for i, sr := range roles {
		out[i] = &model.SystemRole{
			ID:          sr.ID,
			RoleID:      sr.RoleID,
			Label:       sr.Label,
			Description: sr.Description,
			Color:       sr.Color,
			SortOrder:   sr.SortOrder,
		}
	}
	return out, nil
}
