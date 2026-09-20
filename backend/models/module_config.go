package models

import (
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
)

// Dynamic module configuration.
//
// The coarse subscription modules (the toggles on the subscription screen) and
// the page→module mapping used by gating are super-admin editable and stored in
// the DB. They are cached in memory because gating reads them on hot paths, and
// fall back to the compiled-in defaults (ALL_MODULES + defaultPageMap) until the
// cache is loaded or when the DB has no rows.

// ModuleKeyUnassigned is the sentinel module_key for pages parked in the
// configurator's "unassigned" buffer. It is never a real catalog key, so the
// existing gating (TenantAllowsAccessModule / MyAccess) blocks such pages for
// every tenant until they're mapped to a module or to Core (""). In other words:
// hidden until assigned.
const ModuleKeyUnassigned = "__unassigned__"

// ── DB models ────────────────────────────────────────────────────────────────

// ModuleCatalog is one coarse subscription module. Key is the stable identifier
// stored in plan/subscription module CSVs (never renamed); Label is the display
// name shown in the UI.
type ModuleCatalog struct {
	Key       string    `gorm:"primaryKey" json:"key"`
	Label     string    `gorm:"not null" json:"label"`
	Sort      int       `gorm:"default:0" json:"sort"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ModulePageMap assigns one fine-grained access-matrix page (module id) to a
// coarse subscription module. ModuleKey == "" means the page is core (never
// gated by the subscription). One row per page.
type ModulePageMap struct {
	AccessModuleID string    `gorm:"primaryKey" json:"access_module_id"`
	ModuleKey      string    `gorm:"default:''" json:"module_key"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// ── Live cache ───────────────────────────────────────────────────────────────

var (
	moduleCfgMu     sync.RWMutex
	moduleCfgLoaded bool
	cachedPageMap   map[string]string
	cachedCatalog   []ModuleCatalog
)

// defaultModuleLabels mirrors the frontend MODULE_LABELS so seeded rows read
// nicely; unknown keys fall back to a capitalised key.
var defaultModuleLabels = map[string]string{
	"attendance": "Attendance", "marks": "Marks", "leaves": "Leaves",
	"employees": "Employees", "students": "Students", "payroll": "Payroll",
	"fees": "Fees", "announcements": "Announcements", "reports": "Reports",
	"academic": "Academic", "learning": "Learning Matrix", "hostel": "Hostel",
	"transport": "Transport", "library": "Library", "events": "Events",
	"timetable": "Timetable", "notifications": "Notifications",
	"clinical": "Clinical", "billing": "Clinical Billing", "pharmacy": "Pharmacy",
}

func defaultModuleLabel(key string) string {
	if l, ok := defaultModuleLabels[key]; ok {
		return l
	}
	if key == "" {
		return ""
	}
	return strings.ToUpper(key[:1]) + key[1:]
}

func defaultCatalog() []ModuleCatalog {
	out := make([]ModuleCatalog, 0, len(ALL_MODULES))
	for i, k := range ALL_MODULES {
		out = append(out, ModuleCatalog{Key: k, Label: defaultModuleLabel(k), Sort: i})
	}
	return out
}

// InitModuleConfig seeds defaults when empty, then loads the cache. Call once at
// startup (idempotent; a no-op once seeded, harmless if the tables don't exist).
func InitModuleConfig(db *gorm.DB) {
	SeedModuleConfig(db)
	reloadModuleConfig(db)
}

// RefreshModuleConfig reloads the cache after the configurator writes.
func RefreshModuleConfig(db *gorm.DB) { reloadModuleConfig(db) }

func reloadModuleConfig(db *gorm.DB) {
	var cats []ModuleCatalog
	_ = db.Order("sort asc, label asc").Find(&cats).Error
	var rows []ModulePageMap
	_ = db.Find(&rows).Error

	moduleCfgMu.Lock()
	defer moduleCfgMu.Unlock()

	if len(cats) > 0 {
		cachedCatalog = cats
	} else {
		cachedCatalog = defaultCatalog()
	}

	// Start from the built-in defaults, then overlay DB rows. Overlaying (rather
	// than replacing) keeps any page without a DB row on its default mapping, so
	// a partially-populated table never silently turns pages into "core".
	pm := make(map[string]string, len(defaultPageMap)+len(rows))
	for k, v := range defaultPageMap {
		pm[k] = v
	}
	for _, r := range rows {
		pm[r.AccessModuleID] = r.ModuleKey
	}
	cachedPageMap = pm
	moduleCfgLoaded = true
}

// ── Read helpers ─────────────────────────────────────────────────────────────

// ModuleCatalogList returns the coarse module catalog (cache, else defaults).
func ModuleCatalogList() []ModuleCatalog {
	moduleCfgMu.RLock()
	loaded, cat := moduleCfgLoaded, cachedCatalog
	moduleCfgMu.RUnlock()
	if loaded && cat != nil {
		out := make([]ModuleCatalog, len(cat))
		copy(out, cat)
		return out
	}
	return defaultCatalog()
}

// ModuleCatalogKeys returns the coarse module keys in display order.
func ModuleCatalogKeys() []string {
	cat := ModuleCatalogList()
	keys := make([]string, len(cat))
	for i, c := range cat {
		keys[i] = c.Key
	}
	return keys
}

// ModuleCatalogHasKey reports whether a coarse module key exists.
func ModuleCatalogHasKey(key string) bool {
	for _, c := range ModuleCatalogList() {
		if c.Key == key {
			return true
		}
	}
	return false
}

// SeedModuleConfig populates the catalog + page map from the compiled-in
// defaults when the tables are empty. Idempotent. Adds a row for every access
// module so an "all core" configuration is representable.
func SeedModuleConfig(db *gorm.DB) {
	// Additive: insert any compiled-in default that is missing, so new modules
	// (e.g. "clinical") appear on databases seeded by an older build. Existing
	// rows are never touched — super-admin edits survive restarts.
	var existingCats []ModuleCatalog
	_ = db.Find(&existingCats).Error
	haveCat := make(map[string]bool, len(existingCats))
	for _, c := range existingCats {
		haveCat[c.Key] = true
	}
	for i, k := range ALL_MODULES {
		if !haveCat[k] {
			_ = db.Create(&ModuleCatalog{Key: k, Label: defaultModuleLabel(k), Sort: i}).Error
		}
	}

	var existingMaps []ModulePageMap
	_ = db.Find(&existingMaps).Error
	haveMap := make(map[string]bool, len(existingMaps))
	for _, r := range existingMaps {
		haveMap[r.AccessModuleID] = true
	}
	for _, m := range AccessModules {
		if !haveMap[m.ID] {
			_ = db.Create(&ModulePageMap{AccessModuleID: m.ID, ModuleKey: defaultPageMap[m.ID]}).Error
		}
	}
}
