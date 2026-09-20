import { gql } from "@apollo/client";

// ── Goal mutations ───────────────────────────────────────────────────────

export const CREATE_LEARNING_GOAL = gql`
  mutation CreateLearningGoal($input: CreateLearningGoalInput!) {
    createLearningGoal(input: $input) {
      id
      title
      description
      dueDate
      isMandatory
      createdAt
    }
  }
`;

export const UPDATE_LEARNING_GOAL = gql`
  mutation UpdateLearningGoal($id: ID!, $input: UpdateLearningGoalInput!) {
    updateLearningGoal(id: $id, input: $input) {
      id
      title
      description
      dueDate
      isMandatory
    }
  }
`;

export const DELETE_LEARNING_GOAL = gql`
  mutation DeleteLearningGoal($id: ID!) {
    deleteLearningGoal(id: $id)
  }
`;

// ── Section mutations ────────────────────────────────────────────────────

export const CREATE_LEARNING_SECTION = gql`
  mutation CreateLearningSection($input: CreateLearningSectionInput!) {
    createLearningSection(input: $input) {
      id
      goalId
      title
      orderIndex
    }
  }
`;

export const UPDATE_LEARNING_SECTION = gql`
  mutation UpdateLearningSection($id: ID!, $input: UpdateLearningSectionInput!) {
    updateLearningSection(id: $id, input: $input) {
      id
      title
      orderIndex
    }
  }
`;

export const DELETE_LEARNING_SECTION = gql`
  mutation DeleteLearningSection($id: ID!) {
    deleteLearningSection(id: $id)
  }
`;

// ── Unit mutations ───────────────────────────────────────────────────────

export const CREATE_LEARNING_UNIT = gql`
  mutation CreateLearningUnit($input: CreateLearningUnitInput!) {
    createLearningUnit(input: $input) {
      id
      sectionId
      itemType
      orderIndex
      title
      description
      videoType
      videoUrl
      content
    }
  }
`;

export const UPDATE_LEARNING_UNIT = gql`
  mutation UpdateLearningUnit($id: ID!, $input: UpdateLearningUnitInput!) {
    updateLearningUnit(id: $id, input: $input) {
      id
      title
      description
      orderIndex
      videoType
      videoUrl
      content
    }
  }
`;

export const DELETE_LEARNING_UNIT = gql`
  mutation DeleteLearningUnit($id: ID!) {
    deleteLearningUnit(id: $id)
  }
`;

export const UPLOAD_UNIT_VIDEO = gql`
  mutation UploadUnitVideo($unitId: ID!, $filename: String!, $contentType: String!) {
    uploadUnitVideo(unitId: $unitId, filename: $filename, contentType: $contentType) {
      unitId
      uploadUrl
      videoStoragePath
    }
  }
`;

// ── Assignment mutations ─────────────────────────────────────────────────

export const CREATE_LEARNING_ASSIGNMENT = gql`
  mutation CreateLearningAssignment($input: CreateLearningAssignmentInput!) {
    createLearningAssignment(input: $input) {
      id
      sectionId
      itemType
      orderIndex
      title
      description
      assessmentType
      passScore
    }
  }
`;

export const UPDATE_LEARNING_ASSIGNMENT = gql`
  mutation UpdateLearningAssignment($id: ID!, $input: UpdateLearningAssignmentInput!) {
    updateLearningAssignment(id: $id, input: $input) {
      id
      title
      description
      orderIndex
      assessmentType
      passScore
    }
  }
`;

export const DELETE_LEARNING_ASSIGNMENT = gql`
  mutation DeleteLearningAssignment($id: ID!) {
    deleteLearningAssignment(id: $id)
  }
`;

// ── Department assignment ────────────────────────────────────────────────

export const ASSIGN_GOAL_TO_DEPARTMENT = gql`
  mutation AssignGoalToDepartment($goalId: ID!, $departmentId: ID!) {
    assignGoalToDepartment(goalId: $goalId, departmentId: $departmentId) {
      id
      goalId
      departmentId
      createdAt
    }
  }
`;

export const REMOVE_GOAL_ASSIGNMENT = gql`
  mutation RemoveGoalAssignment($assignmentId: ID!) {
    removeGoalAssignment(assignmentId: $assignmentId)
  }
`;

// ── Progress ─────────────────────────────────────────────────────────────

export const UPDATE_ITEM_PROGRESS = gql`
  mutation UpdateItemProgress($input: UpdateItemProgressInput!) {
    updateItemProgress(input: $input) {
      id
      itemId
      itemType
      status
      score
      completedAt
    }
  }
`;

// ── Quiz builder & submission ────────────────────────────────────────────

export const CREATE_LEARNING_QUESTION = gql`
  mutation CreateLearningQuestion($input: CreateLearningQuestionInput!) {
    createLearningQuestion(input: $input) {
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

export const UPDATE_LEARNING_QUESTION = gql`
  mutation UpdateLearningQuestion($id: ID!, $input: UpdateLearningQuestionInput!) {
    updateLearningQuestion(id: $id, input: $input) {
      id
      kind
      prompt
      options
      correctAnswers
      points
      orderIndex
    }
  }
`;

export const DELETE_LEARNING_QUESTION = gql`
  mutation DeleteLearningQuestion($id: ID!) {
    deleteLearningQuestion(id: $id)
  }
`;

export const SUBMIT_QUIZ = gql`
  mutation SubmitQuiz(
    $employeeGoalProgressId: ID!
    $assignmentId: ID!
    $answers: [QuizAnswerInput!]!
  ) {
    submitQuiz(
      employeeGoalProgressId: $employeeGoalProgressId
      assignmentId: $assignmentId
      answers: $answers
    ) {
      score
      maxScore
      percentage
      passed
      progress {
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
