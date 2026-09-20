package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Announcement is a broadcast message from admin to specific roles or everyone
type Announcement struct {
	ID          string     `gorm:"primaryKey" json:"id"`
	TenantID    string     `gorm:"not null;index" json:"tenant_id"`
	Title       string     `gorm:"not null" json:"title"`
	Body        string     `gorm:"not null;type:text" json:"body"`
	AuthorID    string     `gorm:"not null;index" json:"author_id"`
	Author      User       `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	TargetRoles string     `gorm:"default:'all'" json:"target_roles"` // comma-separated: "all", "student", "teacher", "staff"
	Priority    string     `gorm:"default:'normal'" json:"priority"`  // low, normal, high, urgent
	IsPublished bool       `gorm:"default:true" json:"is_published"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (a *Announcement) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return nil
}

// Notification is a targeted in-app alert for a specific user
type Notification struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	TenantID  string    `gorm:"not null;index" json:"tenant_id"`
	UserID    string    `gorm:"not null;index" json:"user_id"`
	Title     string    `gorm:"not null" json:"title"`
	Body      string    `gorm:"type:text" json:"body"`
	Type      string    `gorm:"not null;default:'info'" json:"type"` // info, success, warning, error
	Category  string    `gorm:"default:'general'" json:"category"`   // leave, attendance, fee, marks, general
	RefID     string    `json:"ref_id"`                              // ID of related entity (leave ID, fee payment ID, etc.)
	RefType   string    `json:"ref_type"`                            // "leave", "fee_payment", etc.
	IsRead    bool      `gorm:"default:false;index" json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == "" {
		n.ID = uuid.New().String()
	}
	return nil
}
