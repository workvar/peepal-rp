# Identity Modes: Email vs Employee ID / Roll Number

Some organisations have no email accounts for staff and/or students. They run
purely on Employee ID and Roll Number, and only the tenant admin has an email.
This document describes how that is modelled and what changes when a tenant
turns email off for a population.

## Summary

Each tenant carries two independent flags:

- `staff_email_required` (default `true`): when `false`, teachers/staff can be
  created without an email and sign in with their **Employee ID**.
- `student_email_required` (default `true`): when `false`, students can be
  created without an email and sign in with their **Roll Number**.

Admins (and super admins) always require an email. Defaults are `true`, so every
existing tenant stays exactly as it was.

## Data model

`models.Tenant` gains `StaffEmailRequired` and `StudentEmailRequired`
(`bool`, `NOT NULL DEFAULT true`). The helper `Tenant.EmailRequiredForRole(role)`
centralises the rule: admins/super-admins always `true`; teachers/staff follow
`StaffEmailRequired`; students follow `StudentEmailRequired`.

`models.User.Email` is now optional. The old `NOT NULL` + unique
`(tenant_id, email)` index is replaced by a **partial unique index**:

```
CREATE UNIQUE INDEX idx_user_tenant_email
  ON users (tenant_id, email) WHERE email <> '' AND email IS NOT NULL
```

Blank emails are allowed and never collide with each other, while real emails
stay unique per tenant. This mirrors the partial-index pattern already used for
transport allocations and library ISBNs.

## Login

Login is unchanged in shape. `handlers/auth.go::resolveUserByIdentifier` already
resolves an identifier in this order, scoped to the tenant:

1. `email` match
2. `employee_id` match (via the employee profile) -> user
3. `roll_number` match (via the student profile) -> user

So an emailless staff member signs in with their Employee ID and an emailless
student with their Roll Number. The login key for these accounts lives on the
employee/student **profile**, so an emailless account can sign in once its
profile exists (which is the normal onboarding step).

The tenant policy is returned from `/auth/login`, `/auth/me`, and the public
`/api/v1/tenants/lookup/:subdomain` so the UI can adapt its labels.

## Creating accounts

All creation paths enforce the policy with `Tenant.EmailRequiredForRole`:

- GraphQL `createUser`: email may be blank for ID-based roles; admins still need
  one. (`email` stays a non-null GraphQL String; the client sends `""`.)
- Bulk `users` CSV: `email` is no longer always required; uniqueness is checked
  only for non-blank emails.
- Bulk `employees` / `students` CSV: can create an account inline from
  `user_name` + `user_password` with a blank email when the policy allows; the
  Employee ID / Roll Number is the login key.

## Configuration (who sets the policy)

- **Super admin**, at or after tenant creation: `POST/PUT /super/tenants`
  accept `staff_email_required` / `student_email_required`. The create-tenant
  modal has two checkboxes.
- **Tenant admin**, in Org Settings: a "Login & Identity" section saved via the
  GraphQL `updateOrgProfile` mutation (the policy is mirrored onto `OrgProfile`).

## Frontend behaviour

- The tenant login page relabels the identifier field: fully email-based tenants
  show "Email"; tenants with any ID-based population show
  "Employee ID, Roll Number, or Email" (the admin still uses email).
- The Users create form makes email optional for ID-based roles and explains
  that the user will sign in with their Roll Number / Employee ID.

## Operational steps

The core (tenant flags, optional email, ID login, creation paths) is plain Go +
a migration, so it is live after:

```
cd backend && go run main.go --migrate
```

The migration adds the two tenant columns, drops `NOT NULL` on `users.email`,
and swaps the unique index for the partial one.

The tenant-admin Org Settings toggle uses two **additive** GraphQL fields
(`OrgProfile.staffEmailRequired/studentEmailRequired` and the matching
`UpdateOrgProfileInput` fields). Because gqlgen serves the schema embedded in
`graph/generated.go`, regenerate before that toggle works:

```
cd backend && ./regen.sh
```

The additions are additive, so the existing build keeps compiling before regen;
only the new Org Settings toggle stays inert until it runs.

## Backward compatibility

- Defaults are `true`, so existing tenants are unchanged.
- Existing users keep their emails and per-tenant uniqueness.
- No existing GraphQL operation changed shape; the identity toggle uses a new,
  separate operation so branding saves keep working pre-regen.
