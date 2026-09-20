package models

import "strings"

// DefaultModulesFor returns a comma-separated list of modules that make
// sense out-of-the-box for the given tenant type. Super-admins can still
// override this when creating / editing subscriptions.
func DefaultModulesFor(t TenantType) string {
	mods := defaultModuleList(t.Canonical())
	return strings.Join(mods, ",")
}

func defaultModuleList(t TenantType) []string {
	switch t {
	case TenantTypeCorporate:
		return []string{
			"attendance", "leaves", "employees", "payroll",
			"announcements", "reports", "events", "notifications",
			"learning",
		}
	case TenantTypeHealthcare:
		return []string{
			"attendance", "leaves", "employees", "clinical",
			"billing", "pharmacy",
			"announcements", "reports", "events", "notifications",
		}
	case TenantTypeNonprofit:
		return []string{
			"attendance", "leaves", "employees", "students", // students = members here
			"announcements", "events", "notifications", "reports",
		}
	default: // Education — the original default set.
		return []string{
			"attendance", "marks", "leaves", "employees", "students",
			"academic", "timetable", "fees", "announcements",
			"events", "reports", "notifications",
		}
	}
}
