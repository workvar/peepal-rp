package bulk

import (
	"fmt"
	"strings"
)

// Helpers shared by schedule-shaped bulk uploads (clinician consulting
// windows today, duty rosters later).

var weekdayNames = map[string]int{
	"sunday": 0, "sun": 0, "0": 0,
	"monday": 1, "mon": 1, "1": 1,
	"tuesday": 2, "tue": 2, "tues": 2, "2": 2,
	"wednesday": 3, "wed": 3, "3": 3,
	"thursday": 4, "thu": 4, "thur": 4, "thurs": 4, "4": 4,
	"friday": 5, "fri": 5, "5": 5,
	"saturday": 6, "sat": 6, "6": 6,
}

// parseWeekday accepts a weekday name, its short form, or 0–6 (Sunday first,
// matching time.Weekday and the ClinicianSchedule model).
func parseWeekday(raw string) (int, error) {
	key := strings.ToLower(strings.TrimSpace(raw))
	if key == "" {
		return 0, fmt.Errorf("day_of_week is required")
	}
	if d, ok := weekdayNames[key]; ok {
		return d, nil
	}
	return 0, fmt.Errorf("unrecognised day_of_week: %s (use monday…sunday or 0–6)", raw)
}

// isHHMM reports whether v is a 24-hour HH:MM clock time.
func isHHMM(v string) bool {
	v = strings.TrimSpace(v)
	if len(v) != 5 || v[2] != ':' {
		return false
	}
	for i, c := range v {
		if i == 2 {
			continue
		}
		if c < '0' || c > '9' {
			return false
		}
	}
	h := int(v[0]-'0')*10 + int(v[1]-'0')
	m := int(v[3]-'0')*10 + int(v[4]-'0')
	return h < 24 && m < 60
}
