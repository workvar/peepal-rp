package graph

// Scheduling rules shared by the appointment resolvers.
//
// A clinician with no active schedule is freely bookable (small clinics may
// never configure schedules). Once any active window exists, bookings must
// start inside a window on that weekday.

import (
	"context"
	"fmt"
	"time"

	"collegeerp/models"
)

// validHHMM reports whether s is a zero-padded 24h "HH:MM" time. Lexicographic
// comparison of two valid values then matches chronological order.
func validHHMM(s string) bool {
	if len(s) != 5 || s[2] != ':' {
		return false
	}
	hh := int(s[0]-'0')*10 + int(s[1]-'0')
	mm := int(s[3]-'0')*10 + int(s[4]-'0')
	for _, c := range []byte{s[0], s[1], s[3], s[4]} {
		if c < '0' || c > '9' {
			return false
		}
	}
	return hh <= 23 && mm <= 59
}

// checkClinicianAvailability returns an error when the clinician has active
// schedules and the requested date/startTime falls outside every window.
func checkClinicianAvailability(r *mutationResolver, ctx context.Context, tenantID, clinicianID, date, startTime string) error {
	day, err := time.Parse("2006-01-02", date)
	if err != nil {
		return fmt.Errorf("date must be YYYY-MM-DD")
	}
	if !validHHMM(startTime) {
		return fmt.Errorf("start time must be HH:MM")
	}

	var schedules []models.ClinicianSchedule
	if err := r.DB.WithContext(ctx).
		Where("tenant_id = ? AND clinician_id = ? AND active = ?", tenantID, clinicianID, true).
		Find(&schedules).Error; err != nil {
		return err
	}
	if len(schedules) == 0 {
		return nil // no schedule configured: freely bookable
	}

	weekday := int(day.Weekday())
	worksToday := false
	for _, s := range schedules {
		if s.DayOfWeek != weekday {
			continue
		}
		worksToday = true
		if startTime >= s.StartTime && startTime < s.EndTime {
			return nil
		}
	}
	if !worksToday {
		return GQLErr("the clinician does not consult on " + day.Weekday().String() + "s")
	}
	return GQLErr("the requested time is outside the clinician's consulting hours for " + day.Weekday().String())
}
