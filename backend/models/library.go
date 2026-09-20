package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type LibraryBook struct {
	ID              string    `gorm:"primaryKey" json:"id"`
	TenantID        string    `gorm:"not null;index" json:"tenant_id"`
	Title           string    `gorm:"not null" json:"title"`
	Author          string    `gorm:"not null" json:"author"`
	ISBN            string    `gorm:"index" json:"isbn"`
	Publisher       string    `json:"publisher"`
	PublishYear     int       `json:"publish_year"`
	Category        string    `json:"category"` // subject/genre
	TotalCopies     int       `gorm:"not null" json:"total_copies"`
	AvailableCopies int       `gorm:"not null" json:"available_copies"`
	Rack            string    `json:"rack"`  // physical rack / aisle label, e.g. "A3"
	Shelf           string    `json:"shelf"` // shelf within the rack, e.g. "2"
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func (lb *LibraryBook) BeforeCreate(tx *gorm.DB) error {
	if lb.ID == "" {
		lb.ID = uuid.NewString()
	}
	return nil
}

type LibraryIssue struct {
	ID         string      `gorm:"primaryKey" json:"id"`
	TenantID   string      `gorm:"not null;index" json:"tenant_id"`
	BookID     string      `gorm:"not null;index" json:"book_id"`
	Book       LibraryBook `gorm:"foreignKey:BookID" json:"book"`
	UserID     string      `gorm:"not null;index" json:"user_id"` // who borrowed (student or staff user id)
	User       User        `gorm:"foreignKey:UserID" json:"user"`
	IssueDate  time.Time   `gorm:"not null" json:"issue_date"`
	DueDate    time.Time   `gorm:"not null" json:"due_date"`
	ReturnDate *time.Time  `json:"return_date"`
	Status     string      `gorm:"default:'issued'" json:"status"` // issued, returned, overdue
	FineAmount float64     `gorm:"default:0" json:"fine_amount"`
	CreatedAt  time.Time   `json:"created_at"`
	UpdatedAt  time.Time   `json:"updated_at"`
}

func (li *LibraryIssue) BeforeCreate(tx *gorm.DB) error {
	if li.ID == "" {
		li.ID = uuid.NewString()
	}
	return nil
}
