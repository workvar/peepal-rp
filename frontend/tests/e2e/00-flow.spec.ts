// Master flow. Hierarchy mirrors the outline from the user's notes app:
//
//   Landing page
//   Admin signin
//     Login
//     Create admin users with various roles
//       Login to new admin user
//       Check if access works and not allowed accesses not work
//       Logout of all accounts
//     Delete additional accounts
//     Create new tenant
//     Create various plans - each having different modules
//     Create subscriptions - loop over each subscription to test what features they have
//       Login to tenant
//       Check all modules if they are visible that were assigned
//       Check if any extra module is visible
//     From admin module, delete tenant
//   Logout
//
// All cleanup happens in globalTeardown in LIFO order.

import { test } from "@playwright/test";

import { landingFlow } from "./flows/landing";

import { superLoginFlow }             from "./flows/admin/super-login";
import { createAdminsFlow }           from "./flows/admin/create-admins";
import { loginNewAdminFlow }          from "./flows/admin/login-new-admin";
import { accessCheckFlow }            from "./flows/admin/access-check";
import { logoutAllFlow }              from "./flows/admin/logout-all";
import { deleteAdminsFlow }           from "./flows/admin/delete-admins";
import { newTenantFlow }              from "./flows/admin/new-tenant";
import { variousPlansFlow }           from "./flows/admin/various-plans";
import { createSubscriptionsFlow }    from "./flows/admin/create-subscriptions";
import { tenantLoginFlow }            from "./flows/admin/tenant-login";
import { checkAssignedModulesFlow }   from "./flows/admin/check-modules";
import { checkNoExtrasFlow }          from "./flows/admin/check-no-extras";
import { deleteTenantFromAdminFlow }  from "./flows/admin/delete-tenant";
import { superLogoutFlow }            from "./flows/admin/logout";

test.describe.configure({ mode: "serial" });

test.describe("Landing page", () => {
  landingFlow();
});

test.describe("Admin signin", () => {
  superLoginFlow();

  test.describe("Create admin users with various roles", () => {
    createAdminsFlow();
    loginNewAdminFlow();
    accessCheckFlow();
    logoutAllFlow();
  });

  deleteAdminsFlow();
  newTenantFlow();
  variousPlansFlow();

  test.describe("Create subscriptions - loop over each subscription to test what features they have", () => {
    createSubscriptionsFlow();
    tenantLoginFlow();
    checkAssignedModulesFlow();
    checkNoExtrasFlow();
  });

  deleteTenantFromAdminFlow();
});

test.describe("Logout", () => {
  superLogoutFlow();
});
