package bulk

import (
	"collegeerp/database"
	"collegeerp/models"
	"errors"
	"strings"
)

var leaveTypesSchema = &Schema{
	Resource:    "leave-types",
	Title:       "Leave Types",
	Description: "Configure leave policies in bulk — casual leave, sick leave, earned leave, etc. Each code must be unique within your organisation.",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "name", Label: "Name", Type: FieldString, Required: true,
			Description: "Human-readable name of the leave type.",
			Example:     "Casual Leave",
		},
		{
			Name: "code", Label: "Code", Type: FieldString, Required: true,
			Description: "Short uppercase code (2-4 letters).",
			Example:     "CL",
		},
		{
			Name: "days_per_year", Label: "Days per Year", Type: FieldInt, Required: true,
			Description: "Entitled days per calendar year.",
			Example:     "12",
		},
		{
			Name: "carry_forward", Label: "Allow Carry Forward", Type: FieldBool,
			Description: "Whether unused days roll into the next year.",
			Example:     "false",
		},
		{
			Name: "max_carry_forward", Label: "Max Carry Forward Days", Type: FieldInt,
			Description: "Maximum days that can roll over. Ignored when carry_forward is false.",
			Example:     "0",
		},
		{
			Name: "applicable_to", Label: "Applicable To", Type: FieldEnum, Required: true,
			// Role-based audience. Stored values are fixed role ids; the UI shows
			// them with the tenant's terminology labels (e.g. Clinician / Support
			// Staff / Trainee for a hospital). "employee" is accepted for
			// backward compatibility with older uploads.
			AllowedValues: []string{"all", "teacher", "staff", "student", "employee"},
			Description:   "Role this leave type applies to (or 'all').",
			Example:       "all",
		},
	},
	Create: createLeaveTypeRow,
}

func createLeaveTypeRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}
	lt := models.LeaveTypeConfig{
		TenantID:        ctx.TenantID,
		Name:            strings.TrimSpace(row["name"]),
		Code:            strings.ToUpper(strings.TrimSpace(row["code"])),
		DaysPerYear:     ParseInt(row["days_per_year"]),
		CarryForward:    ParseBool(row["carry_forward"]),
		MaxCarryForward: ParseInt(row["max_carry_forward"]),
		ApplicableTo:    strings.ToLower(strings.TrimSpace(row["applicable_to"])),
		IsActive:        true,
	}
	if lt.ApplicableTo == "" {
		lt.ApplicableTo = "all"
	}
	if err := database.DB.Create(&lt).Error; err != nil {
		return "", errors.New("could not create leave type — code may already exist")
	}
	return lt.ID, nil
}

func init() { Register(leaveTypesSchema) }
