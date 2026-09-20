package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Role string

const (
	RoleSuperAdmin Role = "super_admin"
	RoleAdmin      Role = "admin"
	RoleTeacher    Role = "teacher"
	RoleStudent    Role = "student"
	RoleStaff      Role = "staff"
	// RolePatient backs the healthcare patient self-service portal (Phase 5).
	// Like students, patients are records first; a login account is created on
	// demand so they can view their own care.
	RolePatient Role = "patient"
)

type User struct {
	ID       string `gorm:"primaryKey" json:"id"`
	TenantID string `gorm:"not null;index" json:"tenant_id"`
	Name     string `gorm:"not null" json:"name"`
	// Email is the login credential for email-based accounts. It is optional:
	// tenants that run on Employee ID / Roll Number create staff/students with a
	// blank email (only the admin has one). Uniqueness is enforced per tenant
	// for non-blank emails via a partial unique index (see database migrations);
	// blank emails are allowed and never collide.
	Email    string `gorm:"default:''" json:"email"`
	Password string `gorm:"not null" json:"-"`
	Role     Role   `gorm:"not null;default:'staff'" json:"role"`
	IsActive bool   `gorm:"default:true" json:"is_active"`
	PhotoURL string `gorm:"default:''" json:"photo_url"`
	// CustomRoleID is an optional link to a tenant-scoped CustomRole. When set,
	// the user inherits the CustomRole's fine-grained permission set in addition
	// to whatever the base Role (admin/teacher/…) grants. Nullable.
	CustomRoleID *string `gorm:"index" json:"custom_role_id,omitempty"`
	// Permissions stores a JSON array of permission strings for super_admin users.
	// Example: ["manage_tenants","manage_plans","view_reports"]
	Permissions string `gorm:"type:text;default:''" json:"permissions"`
	// ManagerID points to another User (self-FK) — the immediate manager in the
	// organisation hierarchy. Used for manager-based approval flows and the
	// /organizationStructure tree. Nullable.
	ManagerID *string `gorm:"index" json:"manager_id,omitempty"`
	// DepartmentID copies the department of the user's Employee record (if
	// any). Stored on User as well so non-employee users (e.g. HR staff) can
	// also belong to a department for approval-flow routing.
	DepartmentID *string   `gorm:"index" json:"department_id,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.NewString()
	}
	return nil
}
