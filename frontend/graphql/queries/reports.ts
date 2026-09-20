import { gql } from "@apollo/client";

export const DASHBOARD_STATS = gql`
  query DashboardStats {
    dashboardStats {
      students
      employees
      teachers
      users
      pendingLeaves
      pendingPayrolls
      todayPresent
      todayAbsent
    }
  }
`;

export const ATTENDANCE_REPORT = gql`
  query AttendanceReport($fromDate: String, $toDate: String, $entityType: String, $subjectId: String) {
    attendanceReport(fromDate: $fromDate, toDate: $toDate, entityType: $entityType, subjectId: $subjectId) {
      fromDate
      toDate
      entityType
      daily {
        date
        present
        absent
        late
        total
      }
    }
  }
`;

export const MARKS_REPORT = gql`
  query MarksReport($courseId: String, $semesterNumber: String, $academicYearId: String, $assessmentType: String) {
    marksReport(courseId: $courseId, semesterNumber: $semesterNumber, academicYearId: $academicYearId, assessmentType: $assessmentType) {
      gradeDistribution {
        grade
        count
      }
      subjectAverages {
        subjectId
        subjectName
        avgMarks
        maxMarks
        passCount
        failCount
        totalCount
      }
    }
  }
`;

export const LEAVE_REPORT = gql`
  query LeaveReport($year: String, $department: String) {
    leaveReport(year: $year, department: $department) {
      year
      total
      approved
      statusBreakdown { status count }
      monthlyTrend { month count }
      byDepartment { department count }
    }
  }
`;

export const FEE_REPORT = gql`
  query FeeReport($academicYearId: String) {
    feeReport(academicYearId: $academicYearId) {
      totalCollected
      paymentCount
      monthlyTrend { month amount count }
      byPaymentMode { mode amount count }
      byPlan { plan amount count }
    }
  }
`;

export const PAYROLL_REPORT = gql`
  query PayrollReport($year: String) {
    payrollReport(year: $year) {
      year
      totalGross
      totalNet
      totalEmployees
      monthlyTrend {
        month
        grossSalary
        netSalary
        totalDeductions
        employeeCount
      }
    }
  }
`;
