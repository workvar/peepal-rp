import apiClient from "@/api/client";

// NOTE: Users, departments, employees, courses, and most student CRUD are
// served by GraphQL — see `graphql/queries/employees.ts`,
// `graphql/mutations/employees.ts`, and the students/* files. The two
// endpoints below stay REST because they don't fit GraphQL cleanly:
//   • /students/me — composite portal payload (profile + attendance% +
//     recent marks) that the student self-service page reads in one shot.
//   • /students/bulk-import — raw CSV (text/plain) upload.
export const studentsAPI = {
  bulkImport: (csvText: string) =>
    apiClient.post("/students/bulk-import", csvText, {
      headers: { "Content-Type": "text/plain" },
    }),
  myProfile: () => apiClient.get("/students/me"),
};
