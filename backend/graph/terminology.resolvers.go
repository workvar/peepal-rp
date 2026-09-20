package graph

import (
	"context"

	"collegeerp/graph/model"
	"collegeerp/models"
)

func (r *queryResolver) Terminology(ctx context.Context) (*model.TerminologyPayload, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}

	var tenant models.Tenant
	if err := r.DB.First(&tenant, "id = ?", auth.TenantID).Error; err != nil {
		// Unknown tenant — fall back to education defaults.
		canonical := models.TenantTypeEducation
		return terminologyPayload(canonical), nil
	}

	canonical := tenant.Type.Canonical()
	return terminologyPayload(canonical), nil
}

func terminologyPayload(t models.TenantType) *model.TerminologyPayload {
	l := models.DefaultTerminology(t)
	return &model.TerminologyPayload{
		Type: string(t),
		Labels: &model.TerminologyLabels{
			Organization:       l.Organization,
			OrganizationPlural: l.OrganizationPlural,
			Member:             l.Member,
			MemberPlural:       l.MemberPlural,
			Staff:              l.Staff,
			StaffPlural:        l.StaffPlural,
			Department:         l.Department,
			DepartmentPlural:   l.DepartmentPlural,
			Course:             l.Course,
			CoursePlural:       l.CoursePlural,
			Attendance:         l.Attendance,
			Marks:              l.Marks,
			Leave:              l.Leave,
		},
	}
}
