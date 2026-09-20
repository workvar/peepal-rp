// Test data factories. Each call returns a fresh object with unique fields
// so reruns don't collide on the backend.

let counter = 0;
function uniq() {
  counter += 1;
  return `${Date.now().toString(36)}${counter}`;
}

export function newUser(overrides: Partial<Record<string, string>> = {}) {
  const id = uniq();
  return {
    name:     `Test User ${id}`,
    email:    `user_${id}@example.test`,
    password: "Test@1234",
    role:     "staff",
    ...overrides,
  };
}

export function newStudent(overrides: Partial<Record<string, string>> = {}) {
  const id = uniq();
  return {
    name:        `Student ${id}`,
    rollNumber:  `R${id.toUpperCase()}`,
    email:       `student_${id}@example.test`,
    course:      "BTech",
    ...overrides,
  };
}

export function newEmployee(overrides: Partial<Record<string, string>> = {}) {
  const id = uniq();
  return {
    name:        `Employee ${id}`,
    employeeId:  `E${id.toUpperCase()}`,
    email:       `emp_${id}@example.test`,
    department:  "Computer Science",
    designation: "Lecturer",
    ...overrides,
  };
}
