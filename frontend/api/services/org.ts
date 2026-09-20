import apiClient from "@/api/client";

// Org REST service — remaining REST-only calls after GraphQL migration:
//   • listDepartments / createDepartment — used by several pages, update/delete now GraphQL
//   • listAcademicYears — still REST (list is from academic.resolvers, mutations moved to GraphQL)
//   • listUsersCustomRoles — returns flat user list with custom_role_id, stays REST
//
// Migrated to GraphQL:
//   • getProfile / updateProfile → orgProfile query + updateOrgProfile mutation
//   • getSetupStatus → orgSetupStatus query
//   • updateDepartment / deleteDepartment → updateDepartment / deleteDepartment mutations
//   • createAcademicYear / updateAcademicYear / setCurrentAcademicYear → GraphQL mutations
//   • listSemesters / createSemester → semesters query + createSemester mutation
//   • listRoles / createRole / updateRole / deleteRole → customRoles query + mutations
//   • assignUserCustomRole → assignUserCustomRole mutation

export const orgAdminAPI = {
  listDepartments: () => apiClient.get("/org/departments"),
  createDepartment: (data: object) => apiClient.post("/org/departments", data),

  listAcademicYears: () => apiClient.get("/org/academic-years"),

  // User ↔ CustomRole listing stays REST (returns user list with role IDs).
  listUsersCustomRoles: () => apiClient.get("/org/users/custom-roles"),
};
