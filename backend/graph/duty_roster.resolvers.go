package graph

import (
	"context"
	"strconv"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
)

// Resolvers for the General Staff Duty Roster (Phase 4; cross-industry HR).
// A dated-shift roster for any employee role, generalised from
// ClinicianSchedule (which stays healthcare-only, feeding appointment
// booking — see schedules.resolvers.go).

// DutyRoster lists shifts in a date range, optionally scoped to one employee
// or department. Non-admins (and non-staff, since staff manage the roster
// too) are always scoped to their own shifts regardless of the employeeId
// filter — this is the same "self unless privileged" shape as MyPayrolls.
func (r *queryResolver) DutyRoster(ctx context.Context, from *string, to *string, employeeID *string, departmentID *string) ([]*model.DutyRoster, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.WithContext(ctx).Preload("Employee.User").Where("tenant_id = ?", auth.TenantID)

	if !callerIsRosterAdmin(auth) {
		var self models.Employee
		if err := r.DB.WithContext(ctx).
			Where("tenant_id = ? AND user_id = ?", auth.TenantID, auth.UserID).
			First(&self).Error; err != nil {
			return nil, GQLErr("no employee profile found for your account")
		}
		q = q.Where("employee_id = ?", self.ID)
	} else if employeeID != nil && *employeeID != "" {
		q = q.Where("employee_id = ?", *employeeID)
	}
	if departmentID != nil && *departmentID != "" {
		q = q.Joins("JOIN employees ON employees.id = duty_rosters.employee_id").
			Where("employees.department_id = ?", *departmentID)
	}
	if from != nil && *from != "" {
		q = q.Where("date >= ?", *from)
	}
	if to != nil && *to != "" {
		q = q.Where("date <= ?", *to)
	}

	var rows []models.DutyRoster
	if err := q.Order("date ASC, start_time ASC").Limit(1000).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.DutyRoster, len(rows))
	for i, row := range rows {
		out[i] = dutyRosterToModel(row)
	}
	return out, nil
}

func (r *mutationResolver) CreateDutyRoster(ctx context.Context, input model.CreateDutyRosterInput) (*model.DutyRoster, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	row, err2 := buildDutyRosterRow(r, ctx, auth.TenantID, input.EmployeeID, input.Date,
		strVal(input.ShiftName), input.StartTime, input.EndTime, strVal(input.Location), strVal(input.Notes))
	if err2 != nil {
		return nil, err2
	}
	if err := r.DB.WithContext(ctx).Create(&row).Error; err != nil {
		return nil, uniqueErr(err, "this employee already has a shift starting at that time on that date")
	}
	return loadDutyRoster(r, ctx, auth.TenantID, row.ID)
}

func (r *mutationResolver) UpdateDutyRoster(ctx context.Context, id string, input model.UpdateDutyRosterInput) (*model.DutyRoster, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	updates := map[string]interface{}{}
	if input.Date != nil {
		updates["date"] = *input.Date
	}
	setStr(updates, "shift_name", input.ShiftName)
	if input.StartTime != nil {
		if !validHHMM(*input.StartTime) {
			return nil, GQLErr("startTime must be HH:MM")
		}
		updates["start_time"] = *input.StartTime
	}
	if input.EndTime != nil {
		if !validHHMM(*input.EndTime) {
			return nil, GQLErr("endTime must be HH:MM")
		}
		updates["end_time"] = *input.EndTime
	}
	setStr(updates, "location", input.Location)
	setStr(updates, "notes", input.Notes)

	res := r.DB.WithContext(ctx).Model(&models.DutyRoster{}).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Updates(updates)
	if res.Error != nil {
		return nil, uniqueErr(res.Error, "this employee already has a shift starting at that time on that date")
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return loadDutyRoster(r, ctx, auth.TenantID, id)
}

func (r *mutationResolver) DeleteDutyRoster(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return false, err
	}
	res := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.DutyRoster{})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

// BulkSetDutyRoster writes many shifts in one transaction (roster grid
// submit). Each row is validated independently; a row that collides with an
// existing shift (or fails validation) is skipped and reported rather than
// failing the whole batch, since a grid submit typically mixes new shifts
// with slots that are already filled.
func (r *mutationResolver) BulkSetDutyRoster(ctx context.Context, input model.BulkSetDutyRosterInput) (*model.BulkDutyRosterResult, error) {
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	result := &model.BulkDutyRosterResult{}
	tx := r.DB.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}
	for i, shift := range input.Shifts {
		row, err2 := buildDutyRosterRow(r, ctx, auth.TenantID, shift.EmployeeID, shift.Date,
			strVal(shift.ShiftName), shift.StartTime, shift.EndTime, strVal(shift.Location), strVal(shift.Notes))
		if err2 != nil {
			result.Failed++
			result.Errors = append(result.Errors, rowErrLabel(i, shift.EmployeeID, shift.Date)+err2.Error())
			continue
		}
		if err := tx.Create(&row).Error; err != nil {
			result.Failed++
			result.Errors = append(result.Errors, rowErrLabel(i, shift.EmployeeID, shift.Date)+"a shift already exists at that date/time")
			continue
		}
		result.Created++
	}
	if err := tx.Commit().Error; err != nil {
		return nil, err
	}
	return result, nil
}

// ── helpers ──────────────────────────────────────────────────────────────────

// callerIsRosterAdmin reports whether the caller sees every employee's
// shifts. Mirrors DefaultSystemAccess's admin carve-out.
func callerIsRosterAdmin(auth AuthContext) bool {
	return auth.IsSuperAdmin || auth.Role == roleAdmin || auth.Role == string(models.RoleSuperAdmin)
}

func rowErrLabel(i int, employeeID, date string) string {
	return "row " + strconv.Itoa(i+1) + " (" + employeeID + " " + date + "): "
}

// buildDutyRosterRow validates a shift's fields and returns an unsaved row
// ready for Create. Shared by CreateDutyRoster and BulkSetDutyRoster so the
// two paths can't drift.
func buildDutyRosterRow(r *mutationResolver, ctx context.Context, tenantID, employeeID, date, shiftName, startTime, endTime, location, notes string) (models.DutyRoster, error) {
	if employeeID == "" || !employeeExists(r.DB, ctx, tenantID, employeeID) {
		return models.DutyRoster{}, GQLErr("employee not found")
	}
	if date == "" {
		return models.DutyRoster{}, GQLErr("date is required")
	}
	if !validHHMM(startTime) || !validHHMM(endTime) || startTime >= endTime {
		return models.DutyRoster{}, GQLErr("start/end must be HH:MM with start before end")
	}
	return models.DutyRoster{
		ID: uuid.NewString(), TenantID: tenantID, EmployeeID: employeeID,
		Date: date, ShiftName: shiftName, StartTime: startTime, EndTime: endTime,
		Location: location, Notes: notes,
	}, nil
}

func dutyRosterToModel(d models.DutyRoster) *model.DutyRoster {
	return &model.DutyRoster{
		ID: d.ID, EmployeeID: d.EmployeeID, EmployeeName: employeeName(d.Employee),
		Date: d.Date, ShiftName: toStrPtr(d.ShiftName), StartTime: d.StartTime, EndTime: d.EndTime,
		Location: toStrPtr(d.Location), Notes: toStrPtr(d.Notes), CreatedAt: rfc3339OrNil(d.CreatedAt),
	}
}

func loadDutyRoster(r *mutationResolver, ctx context.Context, tenantID, id string) (*model.DutyRoster, error) {
	var d models.DutyRoster
	if err := r.DB.WithContext(ctx).Preload("Employee.User").
		Where("id = ? AND tenant_id = ?", id, tenantID).First(&d).Error; err != nil {
		return nil, err
	}
	return dutyRosterToModel(d), nil
}
