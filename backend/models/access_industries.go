package models

import "gorm.io/gorm"

// Industry scoping for access modules.
//
// Every tenant has a TenantType (education / corporate / healthcare /
// nonprofit). Some modules only make sense for one industry: Marks or Fees for
// education, Patients or Appointments for healthcare. This file tags such
// modules; untagged modules are shared across every industry.
//
// The tags are enforced in three places so an industry never sees another
// industry's modules:
//   - MyAccess forces flags to all-false for out-of-industry modules (hides
//     them from nav and the route guard for everyone, admins included);
//   - AccessMatrix omits them from the access-control editor;
//   - accessFieldMiddleware rejects their GraphQL operations outright.

// moduleIndustries maps an access-module id to the industries it belongs to.
// A module absent from this map is shared and available to every industry.
var moduleIndustries = map[string][]TenantType{
	// ── Education-only ───────────────────────────────────────────────
	"students":            {TenantTypeEducation},
	"marks":               {TenantTypeEducation},
	"results":             {TenantTypeEducation},
	"courses":             {TenantTypeEducation},
	"subjects":            {TenantTypeEducation},
	"exams":               {TenantTypeEducation},
	"exam-types":          {TenantTypeEducation},
	"curriculum":          {TenantTypeEducation},
	"grading":             {TenantTypeEducation},
	"timetable":           {TenantTypeEducation},
	"question-bank":       {TenantTypeEducation},
	"question-papers":     {TenantTypeEducation},
	"hall-tickets":        {TenantTypeEducation},
	"attendance-shortage": {TenantTypeEducation},
	// Both render a per-student roster keyed on roll number / course-batch,
	// which has no meaning outside education.
	"attendance-summary": {TenantTypeEducation},
	"attendance-export":  {TenantTypeEducation},
	"fees":               {TenantTypeEducation},
	"fee-structures":     {TenantTypeEducation},
	"fee-dues":           {TenantTypeEducation},
	"fee-categories":     {TenantTypeEducation},
	"fee-addons":         {TenantTypeEducation},
	"fee-allocations":    {TenantTypeEducation},
	"fee-students":       {TenantTypeEducation},
	"fee-overview":       {TenantTypeEducation},
	"hostel":             {TenantTypeEducation},
	"transport":          {TenantTypeEducation},
	"library":            {TenantTypeEducation},
	"reports-marks":      {TenantTypeEducation},
	"reports-fees":       {TenantTypeEducation},
	"academic-years":     {TenantTypeEducation},
	"portal":             {TenantTypeEducation},
	"my-fees":            {TenantTypeEducation},
	"my-grades":          {TenantTypeEducation},
	// Student life & campus ops (Phase 6).
	"assignments":     {TenantTypeEducation},
	"my-assignments":  {TenantTypeEducation},
	"mess":            {TenantTypeEducation},
	"my-mess":         {TenantTypeEducation},
	"transport-live":  {TenantTypeEducation},
	"my-hall-tickets": {TenantTypeEducation},

	// ── Healthcare-only ──────────────────────────────────────────────
	"patients":       {TenantTypeHealthcare},
	"appointments":   {TenantTypeHealthcare},
	"encounters":     {TenantTypeHealthcare},
	"billing":        {TenantTypeHealthcare},
	"pharmacy":       {TenantTypeHealthcare},
	"schedules":      {TenantTypeHealthcare},
	"laboratory":     {TenantTypeHealthcare},
	"radiology":      {TenantTypeHealthcare},
	"wards":          {TenantTypeHealthcare},
	"admissions":     {TenantTypeHealthcare},
	"nursing":        {TenantTypeHealthcare},
	"claims":         {TenantTypeHealthcare},
	"inventory":      {TenantTypeHealthcare},
	"ot":             {TenantTypeHealthcare},
	"triage":         {TenantTypeHealthcare},
	"bloodbank":      {TenantTypeHealthcare},
	"ambulance":      {TenantTypeHealthcare},
	"dietary":        {TenantTypeHealthcare},
	"telemedicine":   {TenantTypeHealthcare},
	"referrals":      {TenantTypeHealthcare},
	"patient-portal": {TenantTypeHealthcare},
}

// ModuleAllowedForIndustry reports whether the module is available to a tenant
// of the given type. Unknown module ids and untagged modules are shared.
func ModuleAllowedForIndustry(moduleID string, t TenantType) bool {
	industries, tagged := moduleIndustries[moduleID]
	if !tagged {
		return true
	}
	c := t.Canonical()
	for _, ind := range industries {
		if ind == c {
			return true
		}
	}
	return false
}

// TenantTypeOf loads a tenant's canonical type. Falls back to education when
// the tenant cannot be found so legacy callers keep today's behaviour.
func TenantTypeOf(db *gorm.DB, tenantID string) TenantType {
	var t Tenant
	if err := db.Select("type").Where("id = ?", tenantID).First(&t).Error; err != nil {
		return TenantTypeEducation
	}
	return t.Type.Canonical()
}
