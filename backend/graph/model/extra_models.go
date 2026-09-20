package model

// ── Hostel ────────────────────────────────────────────────────────────────────

type HostelBlock struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Type   string `json:"type"`
	Floors int    `json:"floors"`
}

type HostelRoom struct {
	ID         string       `json:"id"`
	BlockID    string       `json:"blockId"`
	RoomNumber string       `json:"roomNumber"`
	Floor      int          `json:"floor"`
	Capacity   int          `json:"capacity"`
	Occupied   int          `json:"occupied"`
	RoomType   string       `json:"roomType"`
	Status     string       `json:"status"`
	MonthlyFee float64      `json:"monthlyFee"`
	Block      *HostelBlock `json:"block,omitempty"`
	// Class-based pricing.
	RoomClassID *string    `json:"roomClassId,omitempty"`
	RoomClass   *RoomClass `json:"roomClass,omitempty"`
	RateType    *string    `json:"rateType,omitempty"`
	RateAmount  *float64   `json:"rateAmount,omitempty"`
	// Effective rate: resolved override -> class -> legacy monthly fee, then
	// normalised with the current academic year's semester count.
	EffectiveRateType string  `json:"effectiveRateType"`
	SemesterRate      float64 `json:"semesterRate"`
	AnnualRate        float64 `json:"annualRate"`
	MonthlyRate       float64 `json:"monthlyRate"`
}

type HostelAllocation struct {
	ID         string      `json:"id"`
	StudentID  string      `json:"studentId"`
	RoomID     string      `json:"roomId"`
	BedNumber  int         `json:"bedNumber"`
	AllocDate  string      `json:"allocDate"`
	VacateDate *string     `json:"vacateDate,omitempty"`
	Status     string      `json:"status"`
	Student    *Student    `json:"student,omitempty"`
	Room       *HostelRoom `json:"room,omitempty"`
}

type CreateHostelBlockInput struct {
	Name   string `json:"name"`
	Type   string `json:"type"`
	Floors int    `json:"floors"`
}

type CreateHostelRoomInput struct {
	BlockID     string   `json:"blockId"`
	RoomNumber  string   `json:"roomNumber"`
	Floor       *int     `json:"floor,omitempty"`
	Capacity    int      `json:"capacity"`
	RoomType    *string  `json:"roomType,omitempty"`
	MonthlyFee  float64  `json:"monthlyFee"`
	RoomClassID *string  `json:"roomClassId,omitempty"`
	RateType    *string  `json:"rateType,omitempty"`
	RateAmount  *float64 `json:"rateAmount,omitempty"`
}

type UpdateHostelRoomInput struct {
	RoomNumber  *string  `json:"roomNumber,omitempty"`
	Floor       *int     `json:"floor,omitempty"`
	Capacity    *int     `json:"capacity,omitempty"`
	RoomType    *string  `json:"roomType,omitempty"`
	Status      *string  `json:"status,omitempty"`
	MonthlyFee  *float64 `json:"monthlyFee,omitempty"`
	RoomClassID *string  `json:"roomClassId,omitempty"`
	RateType    *string  `json:"rateType,omitempty"`
	RateAmount  *float64 `json:"rateAmount,omitempty"`
}

type AllocateHostelRoomInput struct {
	StudentID string `json:"studentId"`
	RoomID    string `json:"roomId"`
	AllocDate string `json:"allocDate"`
	BedNumber *int   `json:"bedNumber,omitempty"`
}

type VacateHostelRoomInput struct {
	VacateDate string `json:"vacateDate"`
}

type RoomClass struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	RateType    string  `json:"rateType"`
	RateAmount  float64 `json:"rateAmount"`
	// Derived from RateType/RateAmount with the current academic year's semester
	// count (0 semesters -> a semester equals the whole year).
	SemesterRate float64 `json:"semesterRate"`
	AnnualRate   float64 `json:"annualRate"`
	MonthlyRate  float64 `json:"monthlyRate"`
}

type CreateRoomClassInput struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	RateType    string  `json:"rateType"`
	RateAmount  float64 `json:"rateAmount"`
}

type UpdateRoomClassInput struct {
	Name        *string  `json:"name,omitempty"`
	Description *string  `json:"description,omitempty"`
	RateType    *string  `json:"rateType,omitempty"`
	RateAmount  *float64 `json:"rateAmount,omitempty"`
}

// ── Transport ─────────────────────────────────────────────────────────────────

type TransportRoute struct {
	ID         string  `json:"id"`
	RouteName  string  `json:"routeName"`
	StartPoint string  `json:"startPoint"`
	EndPoint   string  `json:"endPoint"`
	Stops      string  `json:"stops"`
	Distance   float64 `json:"distance"`
}

type TransportVehicle struct {
	ID            string          `json:"id"`
	VehicleNumber string          `json:"vehicleNumber"`
	VehicleType   string          `json:"vehicleType"`
	Capacity      int             `json:"capacity"`
	DriverName    string          `json:"driverName"`
	DriverPhone   string          `json:"driverPhone"`
	RouteID       string          `json:"routeId"`
	Status        string          `json:"status"`
	Route         *TransportRoute `json:"route,omitempty"`
	// Live tracking (Phase 6). Position is 0,0 until the first ping;
	// LastPingAt nil distinguishes "never tracked" from "stale".
	Latitude         float64 `json:"latitude"`
	Longitude        float64 `json:"longitude"`
	LastPingAt       *string `json:"lastPingAt,omitempty"`
	DriverEmployeeID *string `json:"driverEmployeeId,omitempty"`
}

type TransportAllocation struct {
	ID         string            `json:"id"`
	AllocType  string            `json:"allocType"`
	StudentID  string            `json:"studentId"`
	EmployeeID string            `json:"employeeId"`
	VehicleID  string            `json:"vehicleId"`
	PickupStop string            `json:"pickupStop"`
	StartDate  string            `json:"startDate"`
	EndDate    *string           `json:"endDate,omitempty"`
	Status     string            `json:"status"`
	Student    *Student          `json:"student,omitempty"`
	Employee   *Employee         `json:"employee,omitempty"`
	Vehicle    *TransportVehicle `json:"vehicle,omitempty"`
}

type CreateTransportRouteInput struct {
	RouteName  string   `json:"routeName"`
	StartPoint string   `json:"startPoint"`
	EndPoint   string   `json:"endPoint"`
	Stops      *string  `json:"stops,omitempty"`
	Distance   *float64 `json:"distance,omitempty"`
}

type UpdateTransportRouteInput struct {
	RouteName  *string  `json:"routeName,omitempty"`
	StartPoint *string  `json:"startPoint,omitempty"`
	EndPoint   *string  `json:"endPoint,omitempty"`
	Stops      *string  `json:"stops,omitempty"`
	Distance   *float64 `json:"distance,omitempty"`
}

type CreateTransportVehicleInput struct {
	VehicleNumber string  `json:"vehicleNumber"`
	VehicleType   string  `json:"vehicleType"`
	Capacity      int     `json:"capacity"`
	DriverName    *string `json:"driverName,omitempty"`
	DriverPhone   *string `json:"driverPhone,omitempty"`
	RouteID       string  `json:"routeId"`
	// Canonical driver link (Phase 6); enables driver attendance.
	DriverEmployeeID *string `json:"driverEmployeeId,omitempty"`
}

type UpdateTransportVehicleInput struct {
	VehicleNumber *string `json:"vehicleNumber,omitempty"`
	VehicleType   *string `json:"vehicleType,omitempty"`
	Capacity      *int    `json:"capacity,omitempty"`
	DriverName    *string `json:"driverName,omitempty"`
	DriverPhone   *string `json:"driverPhone,omitempty"`
	RouteID       *string `json:"routeId,omitempty"`
	Status        *string `json:"status,omitempty"`
	// Pass "" to unlink the driver.
	DriverEmployeeID *string `json:"driverEmployeeId,omitempty"`
}

type AllocateTransportInput struct {
	StudentID  *string `json:"studentId,omitempty"`
	EmployeeID *string `json:"employeeId,omitempty"`
	VehicleID  string  `json:"vehicleId"`
	StartDate  string  `json:"startDate"`
	PickupStop *string `json:"pickupStop,omitempty"`
}

type RemoveTransportAllocationInput struct {
	EndDate string `json:"endDate"`
}

// ── Library ───────────────────────────────────────────────────────────────────

type LibraryBook struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	Author          string `json:"author"`
	ISBN            string `json:"isbn"`
	Publisher       string `json:"publisher"`
	PublishYear     int    `json:"publishYear"`
	Category        string `json:"category"`
	TotalCopies     int    `json:"totalCopies"`
	AvailableCopies int    `json:"availableCopies"`
	Rack            string `json:"rack"`
	Shelf           string `json:"shelf"`
}

type LibraryIssue struct {
	ID         string       `json:"id"`
	BookID     string       `json:"bookId"`
	UserID     string       `json:"userId"`
	IssueDate  string       `json:"issueDate"`
	DueDate    string       `json:"dueDate"`
	ReturnDate *string      `json:"returnDate,omitempty"`
	Status     string       `json:"status"`
	FineAmount float64      `json:"fineAmount"`
	Book       *LibraryBook `json:"book,omitempty"`
	User       *User        `json:"user,omitempty"`
}

type CreateLibraryBookInput struct {
	Title           string  `json:"title"`
	Author          string  `json:"author"`
	TotalCopies     int     `json:"totalCopies"`
	ISBN            *string `json:"isbn,omitempty"`
	Publisher       *string `json:"publisher,omitempty"`
	PublishYear     *int    `json:"publishYear,omitempty"`
	Category        *string `json:"category,omitempty"`
	AvailableCopies *int    `json:"availableCopies,omitempty"`
	Rack            *string `json:"rack,omitempty"`
	Shelf           *string `json:"shelf,omitempty"`
}

type UpdateLibraryBookInput struct {
	Title           *string `json:"title,omitempty"`
	Author          *string `json:"author,omitempty"`
	ISBN            *string `json:"isbn,omitempty"`
	Publisher       *string `json:"publisher,omitempty"`
	PublishYear     *int    `json:"publishYear,omitempty"`
	Category        *string `json:"category,omitempty"`
	TotalCopies     *int    `json:"totalCopies,omitempty"`
	AvailableCopies *int    `json:"availableCopies,omitempty"`
	Rack            *string `json:"rack,omitempty"`
	Shelf           *string `json:"shelf,omitempty"`
}

type IssueLibraryBookInput struct {
	BookID  string `json:"bookId"`
	UserID  string `json:"userId"`
	DueDate string `json:"dueDate"`
}

type ReturnLibraryBookInput struct {
	ReturnDate string   `json:"returnDate"`
	FineAmount *float64 `json:"fineAmount,omitempty"`
}

// ── Holidays ──────────────────────────────────────────────────────────────────

type Holiday struct {
	ID             string `json:"id"`
	AcademicYearID string `json:"academicYearId"`
	Name           string `json:"name"`
	Date           string `json:"date"`
	Type           string `json:"type"`
	AutoGen        bool   `json:"autoGen"`
}

type CreateHolidayInput struct {
	Name           string  `json:"name"`
	Type           *string `json:"type,omitempty"`
	AcademicYearID *string `json:"academicYearId,omitempty"`
	Date           *string `json:"date,omitempty"`
	StartDate      *string `json:"startDate,omitempty"`
	EndDate        *string `json:"endDate,omitempty"`
}

type CopyResult struct {
	Copied int `json:"copied"`
}

// ── Calendar ──────────────────────────────────────────────────────────────────

type CalendarSettings struct {
	ID             string `json:"id"`
	SundayOff      bool   `json:"sundayOff"`
	SaturdayRule   string `json:"saturdayRule"`
	SaturdayWeeks  string `json:"saturdayWeeks"`
	DefaultWorking int    `json:"defaultWorking"`
}

type CalendarDay struct {
	Date    string `json:"date"`
	Weekday int    `json:"weekday"`
	Type    string `json:"type"`
	Name    string `json:"name"`
	AutoGen bool   `json:"autoGen"`
}

type CalendarMonth struct {
	Year      int            `json:"year"`
	Month     int            `json:"month"`
	Days      []*CalendarDay `json:"days"`
	Working   int            `json:"working"`
	TotalDays int            `json:"totalDays"`
}

type UpdateCalendarSettingsInput struct {
	SundayOff      *bool   `json:"sundayOff,omitempty"`
	SaturdayRule   *string `json:"saturdayRule,omitempty"`
	SaturdayWeeks  *string `json:"saturdayWeeks,omitempty"`
	DefaultWorking *int    `json:"defaultWorking,omitempty"`
}

type GenerateCalendarResult struct {
	Year    int `json:"year"`
	Created int `json:"created"`
}

type UpsertCalendarDayInput struct {
	Date string  `json:"date"`
	Type string  `json:"type"`
	Name *string `json:"name,omitempty"`
}

type AttendanceSettings struct {
	ID                 string  `json:"id"`
	MinAttendancePct   float64 `json:"minAttendancePct"`
	GracePeriodMinutes int     `json:"gracePeriodMinutes"`
	LockAfterHours     int     `json:"lockAfterHours"`
}

type UpdateAttendanceSettingsInput struct {
	MinAttendancePct   *float64 `json:"minAttendancePct,omitempty"`
	GracePeriodMinutes *int     `json:"gracePeriodMinutes,omitempty"`
	LockAfterHours     *int     `json:"lockAfterHours,omitempty"`
}

// ── Org ───────────────────────────────────────────────────────────────────────

type OrgProfile struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	LogoURL       string `json:"logoUrl"`
	Tagline       string `json:"tagline"`
	PrimaryColor  string `json:"primaryColor"`
	AccentColor   string `json:"accentColor"`
	Accreditation string `json:"accreditation"`
	// Identity policy mirrored from the tenant: do staff / students need an
	// email? When false, that population signs in by Employee ID / Roll Number.
	StaffEmailRequired   bool `json:"staffEmailRequired"`
	StudentEmailRequired bool `json:"studentEmailRequired"`
}

type OrgSetupStatus struct {
	OrgProfile   bool `json:"orgProfile"`
	Departments  bool `json:"departments"`
	AcademicYear bool `json:"academicYear"`
	FirstUser    bool `json:"firstUser"`
}

type UpdateOrgProfileInput struct {
	Name                 *string `json:"name,omitempty"`
	LogoURL              *string `json:"logoUrl,omitempty"`
	Tagline              *string `json:"tagline,omitempty"`
	PrimaryColor         *string `json:"primaryColor,omitempty"`
	AccentColor          *string `json:"accentColor,omitempty"`
	Accreditation        *string `json:"accreditation,omitempty"`
	StaffEmailRequired   *bool   `json:"staffEmailRequired,omitempty"`
	StudentEmailRequired *bool   `json:"studentEmailRequired,omitempty"`
}

type Semester struct {
	ID             string `json:"id"`
	AcademicYearID string `json:"academicYearId"`
	Number         int    `json:"number"`
	Name           string `json:"name"`
	StartDate      string `json:"startDate"`
	EndDate        string `json:"endDate"`
}

type CreateAcademicYearInput struct {
	Name      string `json:"name"`
	StartDate string `json:"startDate"`
	EndDate   string `json:"endDate"`
	IsCurrent *bool  `json:"isCurrent,omitempty"`
}

type UpdateAcademicYearInput struct {
	Name      *string `json:"name,omitempty"`
	StartDate *string `json:"startDate,omitempty"`
	EndDate   *string `json:"endDate,omitempty"`
	IsCurrent *bool   `json:"isCurrent,omitempty"`
}

type CreateSemesterInput struct {
	AcademicYearID string  `json:"academicYearId"`
	Name           string  `json:"name"`
	Number         *int    `json:"number,omitempty"`
	StartDate      *string `json:"startDate,omitempty"`
	EndDate        *string `json:"endDate,omitempty"`
}

type CustomRole struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Permissions string `json:"permissions"`
}

type CreateCustomRoleInput struct {
	Name        string  `json:"name"`
	Permissions *string `json:"permissions,omitempty"`
}

type UpdateCustomRoleInput struct {
	Name        *string `json:"name,omitempty"`
	Permissions *string `json:"permissions,omitempty"`
}

type UpdateDepartmentInput struct {
	Name *string `json:"name,omitempty"`
	Code *string `json:"code,omitempty"`
	// Employee UUID to designate as Head of Department.
	HeadEmployeeId *string `json:"headEmployeeId,omitempty"`
	// Set to true to explicitly clear the current HOD.
	ClearHead *bool `json:"clearHead,omitempty"`
}

// ── Org Structure ─────────────────────────────────────────────────────────────

type OrgUser struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Email        string  `json:"email"`
	Role         string  `json:"role"`
	PhotoUrl     string  `json:"photoUrl"`
	ManagerID    *string `json:"managerId,omitempty"`
	DepartmentID *string `json:"departmentId,omitempty"`
	Designation  string  `json:"designation"`
}

type OrgNode struct {
	ID           string     `json:"id"`
	Name         string     `json:"name"`
	Email        string     `json:"email"`
	Role         string     `json:"role"`
	PhotoUrl     string     `json:"photoUrl"`
	ManagerID    *string    `json:"managerId,omitempty"`
	DepartmentID *string    `json:"departmentId,omitempty"`
	Designation  string     `json:"designation"`
	Children     []*OrgNode `json:"children"`
}

type OrgStructure struct {
	Roots []*OrgNode `json:"roots"`
	Users []*OrgUser `json:"users"`
}

// ── Salary ────────────────────────────────────────────────────────────────────

type SalaryTemplate struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Description      string  `json:"description"`
	BasicSalary      float64 `json:"basicSalary"`
	Hra              float64 `json:"hra"`
	Da               float64 `json:"da"`
	Ta               float64 `json:"ta"`
	MedicalAllowance float64 `json:"medicalAllowance"`
	OtherAllowances  float64 `json:"otherAllowances"`
	Pf               float64 `json:"pf"`
	Esi              float64 `json:"esi"`
	Tds              float64 `json:"tds"`
	OtherDeductions  float64 `json:"otherDeductions"`
	IsActive         bool    `json:"isActive"`
}

type SalaryAssignment struct {
	ID             string          `json:"id"`
	EmployeeID     string          `json:"employeeId"`
	TemplateID     string          `json:"templateId"`
	ExtraAllowance float64         `json:"extraAllowance"`
	ExtraDeduction float64         `json:"extraDeduction"`
	EffectiveFrom  string          `json:"effectiveFrom"`
	EffectiveTo    *string         `json:"effectiveTo,omitempty"`
	IsActive       bool            `json:"isActive"`
	Notes          string          `json:"notes"`
	Employee       *Employee       `json:"employee,omitempty"`
	Template       *SalaryTemplate `json:"template,omitempty"`
}

type CreateSalaryTemplateInput struct {
	Name             string   `json:"name"`
	BasicSalary      float64  `json:"basicSalary"`
	Description      *string  `json:"description,omitempty"`
	Hra              *float64 `json:"hra,omitempty"`
	Da               *float64 `json:"da,omitempty"`
	Ta               *float64 `json:"ta,omitempty"`
	MedicalAllowance *float64 `json:"medicalAllowance,omitempty"`
	OtherAllowances  *float64 `json:"otherAllowances,omitempty"`
	Pf               *float64 `json:"pf,omitempty"`
	Esi              *float64 `json:"esi,omitempty"`
	Tds              *float64 `json:"tds,omitempty"`
	OtherDeductions  *float64 `json:"otherDeductions,omitempty"`
}

type UpdateSalaryTemplateInput struct {
	Name             *string  `json:"name,omitempty"`
	Description      *string  `json:"description,omitempty"`
	BasicSalary      *float64 `json:"basicSalary,omitempty"`
	Hra              *float64 `json:"hra,omitempty"`
	Da               *float64 `json:"da,omitempty"`
	Ta               *float64 `json:"ta,omitempty"`
	MedicalAllowance *float64 `json:"medicalAllowance,omitempty"`
	OtherAllowances  *float64 `json:"otherAllowances,omitempty"`
	Pf               *float64 `json:"pf,omitempty"`
	Esi              *float64 `json:"esi,omitempty"`
	Tds              *float64 `json:"tds,omitempty"`
	OtherDeductions  *float64 `json:"otherDeductions,omitempty"`
}

type AssignSalaryTemplateInput struct {
	EmployeeID     string   `json:"employeeId"`
	TemplateID     string   `json:"templateId"`
	EffectiveFrom  *string  `json:"effectiveFrom,omitempty"`
	ExtraAllowance *float64 `json:"extraAllowance,omitempty"`
	ExtraDeduction *float64 `json:"extraDeduction,omitempty"`
	Notes          *string  `json:"notes,omitempty"`
}

type BulkAssignSalaryTemplateInput struct {
	TemplateID     string   `json:"templateId"`
	EmployeeIds    []string `json:"employeeIds"`
	EffectiveFrom  *string  `json:"effectiveFrom,omitempty"`
	ExtraAllowance *float64 `json:"extraAllowance,omitempty"`
	ExtraDeduction *float64 `json:"extraDeduction,omitempty"`
	Notes          *string  `json:"notes,omitempty"`
}

type BulkAssignResult struct {
	AssignedCount int `json:"assignedCount"`
}

type UpdateSalaryAssignmentInput struct {
	TemplateID     *string  `json:"templateId,omitempty"`
	ExtraAllowance *float64 `json:"extraAllowance,omitempty"`
	ExtraDeduction *float64 `json:"extraDeduction,omitempty"`
	Notes          *string  `json:"notes,omitempty"`
}

// ── Terminology ───────────────────────────────────────────────────────────────

type TerminologyLabels struct {
	Organization       string `json:"organization"`
	OrganizationPlural string `json:"organizationPlural"`
	Member             string `json:"member"`
	MemberPlural       string `json:"memberPlural"`
	Staff              string `json:"staff"`
	StaffPlural        string `json:"staffPlural"`
	Department         string `json:"department"`
	DepartmentPlural   string `json:"departmentPlural"`
	Course             string `json:"course"`
	CoursePlural       string `json:"coursePlural"`
	Attendance         string `json:"attendance"`
	Marks              string `json:"marks"`
	Leave              string `json:"leave"`
}

type TerminologyPayload struct {
	Type   string             `json:"type"`
	Labels *TerminologyLabels `json:"labels,omitempty"`
}

// ── Approvals ─────────────────────────────────────────────────────────────────

type ApprovalRequest struct {
	ID          string `json:"id"`
	FlowID      string `json:"flowId"`
	Process     string `json:"process"`
	ReferenceID string `json:"referenceId"`
	RequesterID string `json:"requesterId"`
	Title       string `json:"title"`
	CurrentStep int    `json:"currentStep"`
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt"`
}
