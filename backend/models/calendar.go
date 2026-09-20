package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CalendarSettings stores the annual calendar generation rules for a tenant.
// The admin can configure which weekends are considered holidays, etc., and
// then auto-generate the institutional calendar from these rules.
//
// SaturdayRule supported values:
//   - "none"     : no Saturdays are holidays
//   - "all"      : every Saturday is a holiday
//   - "specific" : only the Saturdays whose week-of-month index is in
//     SaturdayWeeks (comma separated list like "2,4") are holidays.
type CalendarSettings struct {
	ID             string    `gorm:"primaryKey" json:"id"`
	TenantID       string    `gorm:"not null;uniqueIndex" json:"tenant_id"`
	SundayOff      bool      `gorm:"default:true" json:"sunday_off"`
	SaturdayRule   string    `gorm:"default:'none'" json:"saturday_rule"` // none | all | specific
	SaturdayWeeks  string    `gorm:"default:''" json:"saturday_weeks"`    // e.g. "2,4"
	DefaultWorking int       `gorm:"default:0" json:"default_working"`    // target working days/month (0 = ignore)
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (c *CalendarSettings) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.NewString()
	}
	return nil
}
