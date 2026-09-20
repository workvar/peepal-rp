package graph

// Converters for the diagnostics resolvers (laboratory + radiology). Kept
// separate from the resolver logic so the CRUD files stay short.

import (
	"context"
	"strconv"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

// parseFloat parses a decimal string, tolerating surrounding spaces.
func parseFloat(s string) (float64, error) {
	return strconv.ParseFloat(strings.TrimSpace(s), 64)
}

// uniqueErr maps a likely unique-constraint violation to a friendly validation
// error; other DB errors pass through unchanged.
func uniqueErr(err error, msg string) error {
	if err == nil {
		return nil
	}
	if strings.Contains(strings.ToLower(err.Error()), "unique") ||
		strings.Contains(strings.ToLower(err.Error()), "duplicate") {
		return GQLErr(msg)
	}
	return err
}

// rfc3339PtrOrNil formats a *time.Time as RFC3339, or nil when absent/zero.
func rfc3339PtrOrNil(t *time.Time) *string {
	if t == nil || t.IsZero() {
		return nil
	}
	s := t.Format(time.RFC3339)
	return &s
}

// patientExists reports whether the patient belongs to the tenant.
func patientExists(db *gorm.DB, ctx context.Context, tenantID, patientID string) bool {
	var n int64
	db.WithContext(ctx).Model(&models.Patient{}).
		Where("id = ? AND tenant_id = ?", patientID, tenantID).Count(&n)
	return n > 0
}

// employeeExists reports whether the employee belongs to the tenant.
func employeeExists(db *gorm.DB, ctx context.Context, tenantID, employeeID string) bool {
	var n int64
	db.WithContext(ctx).Model(&models.Employee{}).
		Where("id = ? AND tenant_id = ?", employeeID, tenantID).Count(&n)
	return n > 0
}

// employeeName renders an employee's display name, tolerating a missing user.
func employeeName(e models.Employee) string {
	return strings.TrimSpace(e.User.Name)
}

// computeLabFlag derives the normal/high/low/abnormal flag for a result.
// Qualitative tests (both bounds 0) never auto-flag.
func computeLabFlag(value string, low, high float64) string {
	v := strings.TrimSpace(value)
	if v == "" {
		return ""
	}
	if low == 0 && high == 0 {
		return models.LabFlagNormal
	}
	f, err := parseFloat(v)
	if err != nil {
		return models.LabFlagAbnormal
	}
	if high > 0 && f > high {
		return models.LabFlagHigh
	}
	if f < low {
		return models.LabFlagLow
	}
	return models.LabFlagNormal
}

func labTestToModel(t models.LabTest) *model.LabTest {
	return &model.LabTest{
		ID:         t.ID,
		Code:       t.Code,
		Name:       t.Name,
		Category:   toStrPtr(t.Category),
		Panel:      toStrPtr(t.Panel),
		Method:     toStrPtr(t.Method),
		SampleType: t.SampleType,
		Unit:       toStrPtr(t.Unit),
		RefLow:     t.RefLow,
		RefHigh:    t.RefHigh,
		RefText:    toStrPtr(t.RefText),
		Price:      t.Price,
		Active:     t.Active,
		CreatedAt:  rfc3339OrNil(t.CreatedAt),
	}
}

func labOrderItemToModel(i models.LabOrderItem) *model.LabOrderItem {
	return &model.LabOrderItem{
		ID:          i.ID,
		TestID:      i.TestID,
		TestCode:    i.TestCode,
		TestName:    i.TestName,
		Unit:        toStrPtr(i.Unit),
		RefLow:      i.RefLow,
		RefHigh:     i.RefHigh,
		RefText:     toStrPtr(i.RefText),
		Price:       i.Price,
		ResultValue: toStrPtr(i.ResultValue),
		Flag:        toStrPtr(i.Flag),
		ResultedAt:  rfc3339PtrOrNil(i.ResultedAt),
	}
}

func labOrderToModel(o models.LabOrder) *model.LabOrder {
	items := make([]*model.LabOrderItem, len(o.Items))
	var total float64
	for idx, it := range o.Items {
		items[idx] = labOrderItemToModel(it)
		total += it.Price
	}
	m := &model.LabOrder{
		ID:          o.ID,
		PatientID:   o.PatientID,
		PatientName: patientDisplayName(o.Patient),
		PatientMrn:  o.Patient.MRN,
		EncounterID: toStrPtr(o.EncounterID),
		OrderedByID: toStrPtr(o.OrderedByID),
		OrderDate:   o.OrderDate,
		Status:      o.Status,
		Notes:       toStrPtr(o.Notes),
		Items:       items,
		TotalPrice:  total,
		CreatedAt:   rfc3339OrNil(o.CreatedAt),
	}
	if o.OrderedByID != "" {
		m.OrderedByName = toStrPtr(employeeName(o.OrderedBy))
	}
	return m
}

func radiologyStudyToModel(s models.RadiologyStudy) *model.RadiologyStudy {
	return &model.RadiologyStudy{
		ID:        s.ID,
		Code:      s.Code,
		Name:      s.Name,
		Modality:  s.Modality,
		BodyPart:  toStrPtr(s.BodyPart),
		Price:     s.Price,
		Active:    s.Active,
		CreatedAt: rfc3339OrNil(s.CreatedAt),
	}
}

func radiologyOrderToModel(o models.RadiologyOrder) *model.RadiologyOrder {
	m := &model.RadiologyOrder{
		ID:           o.ID,
		PatientID:    o.PatientID,
		PatientName:  patientDisplayName(o.Patient),
		PatientMrn:   o.Patient.MRN,
		EncounterID:  toStrPtr(o.EncounterID),
		OrderedByID:  toStrPtr(o.OrderedByID),
		StudyID:      o.StudyID,
		StudyCode:    o.StudyCode,
		StudyName:    o.StudyName,
		Modality:     o.Modality,
		BodyPart:     toStrPtr(o.BodyPart),
		Price:        o.Price,
		OrderDate:    o.OrderDate,
		Status:       o.Status,
		Notes:        toStrPtr(o.Notes),
		Findings:     toStrPtr(o.Findings),
		Impression:   toStrPtr(o.Impression),
		ReportedByID: toStrPtr(o.ReportedByID),
		ReportedAt:   rfc3339PtrOrNil(o.ReportedAt),
		CreatedAt:    rfc3339OrNil(o.CreatedAt),
	}
	if o.OrderedByID != "" {
		m.OrderedByName = toStrPtr(employeeName(o.OrderedBy))
	}
	if o.ReportedByID != "" {
		m.ReportedByName = toStrPtr(employeeName(o.ReportedBy))
	}
	return m
}
