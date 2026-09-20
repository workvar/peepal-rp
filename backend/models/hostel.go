package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type HostelBlock struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	TenantID  string    `gorm:"not null;index" json:"tenant_id"`
	Name      string    `gorm:"not null" json:"name"` // Block A, Boys Hostel etc
	Type      string    `gorm:"not null" json:"type"` // boys, girls, mixed
	Floors    int       `gorm:"not null" json:"floors"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (h *HostelBlock) BeforeCreate(tx *gorm.DB) error {
	if h.ID == "" {
		h.ID = uuid.NewString()
	}
	return nil
}

type HostelRoom struct {
	ID         string      `gorm:"primaryKey" json:"id"`
	TenantID   string      `gorm:"not null;index;uniqueIndex:idx_room_block_no" json:"tenant_id"`
	BlockID    string      `gorm:"not null;index;uniqueIndex:idx_room_block_no" json:"block_id"`
	Block      HostelBlock `gorm:"foreignKey:BlockID" json:"block"`
	RoomNumber string      `gorm:"not null;uniqueIndex:idx_room_block_no" json:"room_number"`
	Floor      int         `gorm:"not null" json:"floor"`
	Capacity   int         `gorm:"not null" json:"capacity"`
	Occupied   int         `gorm:"default:0" json:"occupied"`
	RoomType   string      `gorm:"not null" json:"room_type"`         // single, double, triple, dormitory
	Status     string      `gorm:"default:'available'" json:"status"` // available, full, maintenance
	MonthlyFee float64     `gorm:"not null" json:"monthly_fee"`
	// Class-based pricing. RoomClassID links the room to a reusable RoomClass
	// that carries a rate; RateType/RateAmount are an optional per-room override
	// (RateType == "" means "inherit the class rate, or fall back to MonthlyFee").
	RoomClassID *string    `gorm:"index" json:"room_class_id"`
	RoomClass   *RoomClass `gorm:"foreignKey:RoomClassID" json:"room_class,omitempty"`
	RateType    string     `json:"rate_type"`   // override: "", monthly, semester, annual
	RateAmount  float64    `json:"rate_amount"` // override amount, used when RateType != ""
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (r *HostelRoom) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	return nil
}

type HostelAllocation struct {
	ID         string     `gorm:"primaryKey" json:"id"`
	TenantID   string     `gorm:"not null;index" json:"tenant_id"`
	StudentID  string     `gorm:"not null;index" json:"student_id"`
	Student    Student    `gorm:"foreignKey:StudentID" json:"student"`
	RoomID     string     `gorm:"not null;index" json:"room_id"`
	Room       HostelRoom `gorm:"foreignKey:RoomID" json:"room"`
	BedNumber  int        `gorm:"default:0" json:"bed_number"` // 1-based bed slot within the room
	AllocDate  time.Time  `gorm:"not null" json:"alloc_date"`
	VacateDate *time.Time `json:"vacate_date"`
	Status     string     `gorm:"default:'active'" json:"status"` // active, vacated
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

func (a *HostelAllocation) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	return nil
}

// RoomClass is a reusable pricing/category template for hostel rooms (for
// example "3-Sharing AC" or "Free Sharing"). Rooms link to a class and inherit
// its rate unless they set a per-room override. One rate per class; the
// annual <-> semester split uses the current academic year's semester count,
// computed at read time.
type RoomClass struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	TenantID    string    `gorm:"not null;index" json:"tenant_id"`
	Name        string    `gorm:"not null" json:"name"`
	Description string    `json:"description"`
	RateType    string    `gorm:"not null;default:'semester'" json:"rate_type"` // monthly, semester, annual
	RateAmount  float64   `gorm:"not null;default:0" json:"rate_amount"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (rc *RoomClass) BeforeCreate(tx *gorm.DB) error {
	if rc.ID == "" {
		rc.ID = uuid.NewString()
	}
	return nil
}
