package model

// ── Role Access Matrix ──────────────────────────────────────────────────────
// Hand-written to match graph/schema.graphqls. Registered in gqlgen.yml so the
// generator binds to these instead of emitting its own.

type ModuleAccess struct {
	Module    string `json:"module"`
	CanView   bool   `json:"canView"`
	CanCreate bool   `json:"canCreate"`
	CanEdit   bool   `json:"canEdit"`
	CanDelete bool   `json:"canDelete"`
}

type AccessModuleMeta struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Group string `json:"group"`
}

type RoleAccess struct {
	SubjectType string          `json:"subjectType"`
	SubjectKey  string          `json:"subjectKey"`
	Label       string          `json:"label"`
	IsCustom    bool            `json:"isCustom"`
	Modules     []*ModuleAccess `json:"modules"`
}

type AccessMatrix struct {
	Modules []*AccessModuleMeta `json:"modules"`
	Roles   []*RoleAccess       `json:"roles"`
}

type ModuleAccessInput struct {
	Module    string `json:"module"`
	CanView   bool   `json:"canView"`
	CanCreate bool   `json:"canCreate"`
	CanEdit   bool   `json:"canEdit"`
	CanDelete bool   `json:"canDelete"`
}

type UpdateRoleAccessInput struct {
	SubjectType string               `json:"subjectType"`
	SubjectKey  string               `json:"subjectKey"`
	Modules     []*ModuleAccessInput `json:"modules"`
}
