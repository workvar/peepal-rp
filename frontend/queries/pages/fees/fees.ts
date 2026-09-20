import { gql } from "@apollo/client";

export { LIST_STUDENTS } from "@/graphql/queries/students";
export { LIST_COURSES, LIST_COURSE_BATCHES } from "@/graphql/queries/academic";

// ── Fragments ────────────────────────────────────────────────────────────────

export const FEE_STRUCTURE_FIELDS = gql`
  fragment FeeStructureFields on FeeStructure {
    id
    courseId
    name
    code
    batchId
    description
    isActive
    totalAmount
    allocationCount
    yearTotals { yearNumber amount }
    items {
      id
      feeCategoryId
      yearNumber
      amount
      feeCategory { id name code }
    }
    course { id name code durationYears totalSemesters }
    batch { id name }
  }
`;

export const FEE_ALLOCATION_FIELDS = gql`
  fragment FeeAllocationFields on FeeAllocation {
    id
    feeStructureId
    name
    frequency
    targetType
    targetId
    targetName
    totalAmount
    isActive
    studentCount
    installments { id sequence label yearNumber dueDate amount }
    feeStructure { id name code course { id name } }
  }
`;

export const STUDENT_FEE_FIELDS = gql`
  fragment StudentFeeFields on StudentFee {
    id
    studentId
    feeAllocationId
    grossAmount
    discountAmount
    netAmount
    paidAmount
    status
    discounts { id label discountType value amount remarks }
    addOns { id feeAddOnId yearNumber amount feeAddOn { id name code } }
    installments { id sequence label dueDate amount paidAmount status isOverdue }
    student { id rollNumber user { id name } course { id name } }
    feeAllocation { id name frequency feeStructure { id name course { id name durationYears } } }
  }
`;

// ── Queries ──────────────────────────────────────────────────────────────────

export const LIST_FEE_CATEGORIES = gql`
  query ListFeeCategories {
    feeCategories {
      id
      name
      code
      description
      isActive
    }
  }
`;

export const LIST_FEE_STRUCTURES = gql`
  query ListFeeStructures($courseId: String) {
    feeStructures(courseId: $courseId) {
      ...FeeStructureFields
    }
  }
  ${FEE_STRUCTURE_FIELDS}
`;

export const LIST_FEE_ALLOCATIONS = gql`
  query ListFeeAllocations($feeStructureId: String, $courseId: String) {
    feeAllocations(feeStructureId: $feeStructureId, courseId: $courseId) {
      ...FeeAllocationFields
    }
  }
  ${FEE_ALLOCATION_FIELDS}
`;

export const LIST_STUDENT_FEES = gql`
  query ListStudentFees($studentId: String, $feeAllocationId: String, $status: String, $courseId: String) {
    studentFees(studentId: $studentId, feeAllocationId: $feeAllocationId, status: $status, courseId: $courseId) {
      ...StudentFeeFields
    }
  }
  ${STUDENT_FEE_FIELDS}
`;

export const MY_STUDENT_FEES = gql`
  query MyStudentFees {
    myStudentFees {
      ...StudentFeeFields
    }
  }
  ${STUDENT_FEE_FIELDS}
`;

export const LIST_FEE_PAYMENTS = gql`
  query ListFeePayments($studentId: String, $studentFeeId: String, $status: String) {
    feePayments(studentId: $studentId, studentFeeId: $studentFeeId, status: $status) {
      id
      studentFeeId
      studentId
      installmentId
      amount
      paymentDate
      paymentMode
      transactionRef
      status
      remarks
      receiptNumber
      student { id rollNumber user { id name } }
      studentFee { id feeAllocation { id name } }
    }
  }
`;

export const MY_FEE_PAYMENTS = gql`
  query MyFeePayments {
    myFeePayments {
      id
      amount
      paymentDate
      paymentMode
      status
      receiptNumber
      transactionRef
      remarks
      installmentId
      studentFee { id feeAllocation { id name } }
    }
  }
`;

export const FEE_OVERVIEW = gql`
  query FeeOverview {
    feeOverview {
      summary {
        totalCollected
        paymentCount
        pendingDues
        totalExpected
      }
      byCourse { courseId courseName expected collected pending studentCount }
      byMode { mode amount count }
      byMonth { month amount count }
      recentPayments {
        id
        amount
        paymentDate
        paymentMode
        receiptNumber
        student { id rollNumber user { id name } }
      }
    }
  }
`;

export const LIST_FEE_ADDONS = gql`
  query ListFeeAddOns {
    feeAddOns {
      id
      name
      code
      kind
      feeCategoryId
      amountPerYear
      description
      isActive
      studentCount
      feeCategory { id name code }
    }
  }
`;

// ── Add-on Mutations ─────────────────────────────────────────────────────────

export const CREATE_FEE_ADDON = gql`
  mutation CreateFeeAddOn($input: CreateFeeAddOnInput!) {
    createFeeAddOn(input: $input) { id }
  }
`;

export const UPDATE_FEE_ADDON = gql`
  mutation UpdateFeeAddOn($id: ID!, $input: UpdateFeeAddOnInput!) {
    updateFeeAddOn(id: $id, input: $input) { id }
  }
`;

export const DELETE_FEE_ADDON = gql`
  mutation DeleteFeeAddOn($id: ID!) {
    deleteFeeAddOn(id: $id)
  }
`;

export const RESYNC_FACILITY_FEES = gql`
  mutation ResyncFacilityFees {
    resyncFacilityFees
  }
`;

export const ADD_STUDENT_FEE_ADDON = gql`
  mutation AddStudentFeeAddOn($input: AddStudentFeeAddOnInput!) {
    addStudentFeeAddOn(input: $input) { id netAmount }
  }
`;

export const REMOVE_STUDENT_FEE_ADDON = gql`
  mutation RemoveStudentFeeAddOn($id: ID!) {
    removeStudentFeeAddOn(id: $id) { id netAmount }
  }
`;

// ── Category Mutations ───────────────────────────────────────────────────────

export const CREATE_FEE_CATEGORY = gql`
  mutation CreateFeeCategory($input: CreateFeeCategoryInput!) {
    createFeeCategory(input: $input) { id }
  }
`;

export const UPDATE_FEE_CATEGORY = gql`
  mutation UpdateFeeCategory($id: ID!, $input: UpdateFeeCategoryInput!) {
    updateFeeCategory(id: $id, input: $input) { id }
  }
`;

export const DELETE_FEE_CATEGORY = gql`
  mutation DeleteFeeCategory($id: ID!) {
    deleteFeeCategory(id: $id)
  }
`;

// ── Structure Mutations ──────────────────────────────────────────────────────

export const CREATE_FEE_STRUCTURE = gql`
  mutation CreateFeeStructure($input: CreateFeeStructureInput!) {
    createFeeStructure(input: $input) { id }
  }
`;

export const UPDATE_FEE_STRUCTURE = gql`
  mutation UpdateFeeStructure($id: ID!, $input: UpdateFeeStructureInput!) {
    updateFeeStructure(id: $id, input: $input) { id }
  }
`;

export const DELETE_FEE_STRUCTURE = gql`
  mutation DeleteFeeStructure($id: ID!) {
    deleteFeeStructure(id: $id)
  }
`;

export const CLONE_FEE_STRUCTURE = gql`
  mutation CloneFeeStructure($id: ID!, $name: String!, $code: String!) {
    cloneFeeStructure(id: $id, name: $name, code: $code) { id }
  }
`;

// ── Allocation Mutations ─────────────────────────────────────────────────────

export const CREATE_FEE_ALLOCATION = gql`
  mutation CreateFeeAllocation($input: CreateFeeAllocationInput!) {
    createFeeAllocation(input: $input) { id studentCount }
  }
`;

export const UPDATE_FEE_ALLOCATION = gql`
  mutation UpdateFeeAllocation($id: ID!, $input: UpdateFeeAllocationInput!) {
    updateFeeAllocation(id: $id, input: $input) { id }
  }
`;

export const DELETE_FEE_ALLOCATION = gql`
  mutation DeleteFeeAllocation($id: ID!) {
    deleteFeeAllocation(id: $id)
  }
`;

export const SYNC_FEE_ALLOCATION = gql`
  mutation SyncFeeAllocation($id: ID!) {
    syncFeeAllocation(id: $id)
  }
`;

// ── Discount & Payment Mutations ─────────────────────────────────────────────

export const ADD_STUDENT_FEE_DISCOUNT = gql`
  mutation AddStudentFeeDiscount($input: AddStudentFeeDiscountInput!) {
    addStudentFeeDiscount(input: $input) { id }
  }
`;

export const REMOVE_STUDENT_FEE_DISCOUNT = gql`
  mutation RemoveStudentFeeDiscount($id: ID!) {
    removeStudentFeeDiscount(id: $id) { id }
  }
`;

export const RECORD_FEE_PAYMENT = gql`
  mutation RecordFeePayment($input: RecordFeePaymentInput!) {
    recordFeePayment(input: $input) { id receiptNumber }
  }
`;

export const CANCEL_FEE_PAYMENT = gql`
  mutation CancelFeePayment($id: ID!) {
    cancelFeePayment(id: $id) { id status }
  }
`;
