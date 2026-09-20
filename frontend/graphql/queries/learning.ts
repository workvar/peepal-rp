import { gql } from "@apollo/client";

// ── Admin queries ────────────────────────────────────────────────────────

export const LIST_LEARNING_GOALS = gql`
  query ListLearningGoals {
    learningGoals {
      id
      title
      description
      dueDate
      isMandatory
      createdAt
      sections {
        id
        title
        orderIndex
        items {
          id
          itemType
          orderIndex
          title
          description
          videoType
          videoUrl
          content
          assessmentType
          passScore
          questions {
            id
            assignmentID
            kind
            prompt
            options
            correctAnswers
            points
            orderIndex
          }
        }
      }
    }
  }
`;

export const GET_LEARNING_GOAL = gql`
  query GetLearningGoal($id: ID!) {
    learningGoal(id: $id) {
      id
      title
      description
      dueDate
      isMandatory
      createdAt
      sections {
        id
        goalId
        title
        orderIndex
        items {
          id
          sectionId
          itemType
          orderIndex
          title
          description
          videoType
          videoUrl
          content
          assessmentType
          passScore
          questions {
            id
            assignmentID
            kind
            prompt
            options
            correctAnswers
            points
            orderIndex
          }
        }
      }
    }
  }
`;

export const GOAL_ASSIGNMENTS = gql`
  query GoalAssignments($goalId: ID!) {
    goalAssignments(goalId: $goalId) {
      id
      goalId
      departmentId
      createdAt
      department { id name }
      goal { id title }
    }
  }
`;

export const DEPARTMENT_LEARNING_PROGRESS = gql`
  query DepartmentLearningProgress($deptId: ID!) {
    departmentLearningProgress(deptId: $deptId) {
      id
      employeeId
      goalId
      status
      completedAt
      goal {
        id
        title
        dueDate
        isMandatory
      }
      itemProgress {
        id
        itemId
        itemType
        status
        score
        completedAt
      }
    }
  }
`;

// ── Employee queries ─────────────────────────────────────────────────────

export const MY_LEARNING_GOALS = gql`
  query MyLearningGoals {
    myLearningGoals {
      id
      employeeId
      goalId
      status
      completedAt
      goal {
        id
        title
        description
        dueDate
        isMandatory
        sections {
          id
          title
          orderIndex
          items {
            id
            itemType
            orderIndex
            title
            description
            videoType
            videoUrl
            content
            assessmentType
            passScore
            questions {
              id
              assignmentID
              kind
              prompt
              options
              correctAnswers
              points
              orderIndex
            }
          }
        }
      }
      itemProgress {
        id
        itemId
        itemType
        status
        score
        completedAt
      }
    }
  }
`;

export const ASSIGNMENT_QUESTIONS = gql`
  query AssignmentQuestions($assignmentId: ID!) {
    assignmentQuestions(assignmentId: $assignmentId) {
      id
      assignmentID
      kind
      prompt
      options
      correctAnswers
      points
      orderIndex
    }
  }
`;

export const EMPLOYEE_LEARNING_GOALS = gql`
  query EmployeeLearningGoals($employeeId: ID!) {
    employeeLearningGoals(employeeId: $employeeId) {
      id
      employeeId
      goalId
      status
      completedAt
      goal {
        id
        title
        description
        dueDate
        isMandatory
        sections {
          id
          title
          orderIndex
          items {
            id
            itemType
            orderIndex
            title
            description
            videoType
            videoUrl
            content
            assessmentType
            passScore
            questions {
              id
              assignmentID
              kind
              prompt
              options
              correctAnswers
              points
              orderIndex
            }
          }
        }
      }
      itemProgress {
        id
        itemId
        itemType
        status
        score
        completedAt
      }
    }
  }
`;
