import apiClient from "@/api/client";

// Organisation hierarchy REST service — org structure and manager assignment
// have been migrated to GraphQL:
//   • orgUsers query / orgStructure query
//   • assignUserManager mutation
//
// This file is kept as a placeholder so existing imports don't break.
// Remove it once no pages import from here.

/**
 * @deprecated Use GraphQL queries/mutations from @/graphql/queries/org.ts
 * and @/graphql/mutations/org.ts instead.
 */
export const organizationAPI = {
  // Kept for backward compat during transition — pages should switch to
  // the GET_ORG_USERS GraphQL query.
  listUsers: () => apiClient.get("/organization/users"),
  getStructure: (departmentId?: string) =>
    apiClient.get("/organization/structure", {
      params: departmentId ? { department: departmentId } : undefined,
    }),
};
