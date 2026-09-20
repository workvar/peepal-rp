// Centralized env reads. Defaults match the dev-seeded admin in CLAUDE.md.

export const env = {
  baseURL:        process.env.TEST_BASE_URL || "http://localhost:3000",
  apiURL:         process.env.TEST_API_URL  || "http://localhost:3001",
  orgSlug:        process.env.TEST_ORG_SLUG || "demo",

  admin: {
    email:    process.env.TEST_ADMIN_EMAIL    || "admin@testcollege.edu",
    password: process.env.TEST_ADMIN_PASSWORD || "Admin@test.123",
  },
  teacher: {
    email:    process.env.TEST_TEACHER_EMAIL    || "teacher@testcollege.edu",
    password: process.env.TEST_TEACHER_PASSWORD || "Teacher@test123",
  },
  student: {
    email:    process.env.TEST_STUDENT_EMAIL    || "student@testcollege.edu",
    password: process.env.TEST_STUDENT_PASSWORD || "Student@test123",
  },
  superAdmin: {
    email:    process.env.TEST_SUPER_EMAIL    || "superadmin@platform.com",
    password: process.env.TEST_SUPER_PASSWORD || "SuperAdmin@123",
  },
};

export type Role = "admin" | "teacher" | "student" | "superAdmin";

export function credsFor(role: Role) {
  return env[role];
}
