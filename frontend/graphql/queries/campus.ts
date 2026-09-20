import { gql } from "@apollo/client";

// Phase 6 — Student Life & Campus Ops reads:
// assignments (teacher + student), mess, live transport.

export const LIST_STUDENT_ASSIGNMENTS = gql`
  query ListStudentAssignments($courseId: String, $subjectId: String, $semester: Int, $section: String, $status: String) {
    studentAssignments(courseId: $courseId, subjectId: $subjectId, semester: $semester, section: $section, status: $status) {
      id
      title
      description
      courseId
      courseName
      semester
      section
      subjectId
      subjectName
      teacherId
      teacherName
      maxMarks
      dueDate
      attachmentUrl
      status
      submissionCount
      gradedCount
      createdAt
    }
  }
`;

export const LIST_ASSIGNMENT_SUBMISSIONS = gql`
  query ListAssignmentSubmissions($assignmentId: ID!) {
    assignmentSubmissions(assignmentId: $assignmentId) {
      id
      assignmentId
      assignmentTitle
      maxMarks
      studentId
      studentName
      rollNumber
      submittedAt
      text
      attachmentUrl
      status
      marksAwarded
      feedback
      gradedByName
    }
  }
`;

export const LIST_MY_ASSIGNMENTS = gql`
  query ListMyAssignments($status: String) {
    myAssignments(status: $status) {
      canSubmit
      late
      assignment {
        id
        title
        description
        subjectName
        teacherName
        maxMarks
        dueDate
        attachmentUrl
        status
      }
      submission {
        id
        submittedAt
        text
        attachmentUrl
        status
        marksAwarded
        feedback
      }
    }
  }
`;

export const LIST_MESS_MENU = gql`
  query ListMessMenu($hostelBlockId: String) {
    messMenu(hostelBlockId: $hostelBlockId) {
      id
      dayOfWeek
      meal
      items
      hostelBlockId
      hostelBlockName
    }
  }
`;

export const LIST_MY_MESS_MENU = gql`
  query ListMyMessMenu {
    myMessMenu {
      id
      dayOfWeek
      meal
      items
      hostelBlockName
    }
  }
`;

export const LIST_MESS_ATTENDANCE = gql`
  query ListMessAttendance($date: String!, $meal: String!, $hostelBlockId: String) {
    messAttendance(date: $date, meal: $meal, hostelBlockId: $hostelBlockId) {
      id
      studentId
      studentName
      rollNumber
      date
      meal
      present
    }
  }
`;

export const LIST_MESS_EXPENSES = gql`
  query ListMessExpenses($from: String, $to: String, $category: String) {
    messExpenses(from: $from, to: $to, category: $category) {
      id
      date
      category
      description
      amount
      vendorId
      vendorName
      purchaseOrderId
      poNumber
    }
  }
`;

export const MESS_EXPENSE_SUMMARY = gql`
  query MessExpenseSummary($from: String, $to: String) {
    messExpenseSummary(from: $from, to: $to) {
      total
      byCategory {
        category
        total
      }
    }
  }
`;

export const LIST_LIVE_VEHICLES = gql`
  query ListLiveVehicles {
    liveVehicles {
      id
      vehicleNumber
      vehicleType
      capacity
      status
      routeId
      routeName
      latitude
      longitude
      lastPingAt
      driverEmployeeId
      driverName
      driverPhone
    }
  }
`;

export const LIST_DRIVER_ATTENDANCE = gql`
  query ListDriverAttendance($date: String, $from: String, $to: String, $employeeId: String, $vehicleId: String) {
    driverAttendance(date: $date, from: $from, to: $to, employeeId: $employeeId, vehicleId: $vehicleId) {
      id
      employeeId
      employeeName
      vehicleId
      vehicleNumber
      date
      checkInAt
      checkOutAt
      status
    }
  }
`;
