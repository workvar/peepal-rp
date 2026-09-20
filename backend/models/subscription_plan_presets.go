package models

import (
	"strings"

	"gorm.io/gorm"
)

// Vertical module presets + default plan seeding.
//
// Peepal serves more than one industry (education, healthcare, ...). These
// presets give a super-admin a one-click starting point instead of hand
// picking modules every time: they back both the built-in "Education" /
// "Hospital" plans seeded below and the quick-fill preset buttons in the
// plan creator UI. GetModuleConfig (handlers/module_config.go) serves
// ModulePresetList() over the wire so the frontend never hardcodes its own
// copy of these lists.

// EducationModules are the coarse modules relevant to a school/college.
var EducationModules = []string{
	"attendance", "marks", "leaves", "employees", "students",
	"payroll", "fees", "announcements", "reports", "academic",
	"learning", "hostel", "transport", "library", "events",
	"timetable", "notifications", "finance", "procurement",
}

// HospitalModules are the coarse modules relevant to a hospital/clinic.
var HospitalModules = []string{
	"employees", "payroll", "attendance", "leaves", "announcements",
	"reports", "notifications", "clinical", "billing", "pharmacy",
	"procurement", "finance", "events",
}

// ModulePreset is a named group of module keys a super-admin can apply in one
// click while building a plan.
type ModulePreset struct {
	Key     string   `json:"key"`
	Label   string   `json:"label"`
	Modules []string `json:"modules"`
}

// ModulePresetList returns the vertical presets offered in the plan creator.
func ModulePresetList() []ModulePreset {
	return []ModulePreset{
		{Key: "education", Label: "Education", Modules: EducationModules},
		{Key: "hospital", Label: "Hospital", Modules: HospitalModules},
	}
}

// defaultPlans describes the built-in plans seeded on first run.
var defaultPlans = []struct {
	Name        string
	Description string
	Modules     []string
}{
	{
		Name:        "Education",
		Description: "For schools & colleges — students, academics, fees, hostel, transport and more.",
		Modules:     EducationModules,
	},
	{
		Name:        "Hospital",
		Description: "For hospitals & clinics — patients, clinical billing, pharmacy, OT, wards and more.",
		Modules:     HospitalModules,
	},
}

// SeedDefaultPlans creates the built-in "Education" and "Hospital" plans the
// first time they're missing (matched by name). Idempotent and additive,
// like SeedModuleConfig: never touches a plan that already exists, so a
// super-admin who renamed or edited one keeps their changes across restarts.
func SeedDefaultPlans(db *gorm.DB) {
	for _, d := range defaultPlans {
		var count int64
		db.Model(&SubscriptionPlan{}).Where("name = ?", d.Name).Count(&count)
		if count > 0 {
			continue
		}
		_ = db.Create(&SubscriptionPlan{
			Name:         d.Name,
			Description:  d.Description,
			MaxStudents:  500,
			MaxEmployees: 100,
			Modules:      strings.Join(d.Modules, ","),
			IsActive:     true,
		}).Error
	}
}
