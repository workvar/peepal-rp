package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SystemRole is the per-tenant, industry-aware presentation of a built-in role.
//
// The underlying role id (admin/teacher/student/staff) is a fixed enum enforced
// across the backend's access control — it never changes. This table only
// carries how a given tenant *presents* that role: its label, description,
// accent colour and ordering. Rows are seeded from the tenant's industry when
// the tenant is created (see SeedSystemRoles), so a hospital shows
// "Clinician / Trainee / Support Staff" while a college shows
// "Teacher / Student / Staff" — all reading from one DB source that both the
// Roles page and the Add Employee dropdown consume, instead of hardcoded lists.
type SystemRole struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`

	// RoleID is the enforced enum value this row presents: admin / teacher /
	// student / staff. Access control keys off this, never off Label.
	RoleID string `gorm:"not null;index" json:"role_id"`

	Label       string `gorm:"not null" json:"label"`
	Description string `json:"description"`
	Color       string `json:"color"`     // ui accent: blue / green / yellow / violet
	SortOrder   int    `json:"sort_order"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (s *SystemRole) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}
