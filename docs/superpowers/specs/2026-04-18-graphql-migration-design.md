# GraphQL Migration Design
**Date:** 2026-04-18  
**Status:** Approved  
**Scope:** Full replacement of REST API with GraphQL (gqlgen) + Apollo Client frontend

---

## Overview

Replace all ~60 REST endpoints in StepElly's Go/Fiber backend with a single `/graphql` endpoint using gqlgen (schema-first, code-generated). Replace the axios-based `api.ts` frontend layer with Apollo Client. Migration is phased in 9 domain batches — REST routes are deleted only after the corresponding frontend batch is verified working.

**Primary driver:** Developer ergonomics — every new screen currently requires a new REST route, handler, and TypeScript API wrapper. GraphQL eliminates this. Secondary benefits: fewer sequential fetches on dashboard/list pages (a), and overfetching reduction (b).

---

## Architecture

### Backend: New Directory Structure

```
backend/
  graph/
    schema.graphqls          # single source-of-truth schema
    resolver.go              # root resolver struct (holds *gorm.DB)
    generated.go             # gqlgen-generated — never hand-edit
    resolvers/
      employees.go
      payroll.go
      students.go
      academic.go
      attendance.go
      fees.go
      reports.go
      events.go
      hostel.go
      transport.go
      library.go
      org.go
      auth.go
      super_admin.go
  gqlgen.yml                 # codegen config
```

### Backend: Server Wiring

A single `/graphql` route is added in `routes/routes.go`. The existing `middleware.Authenticate` runs before the gqlgen handler. A thin Fiber-to-context adapter reads `c.Locals("user")` and `c.Locals("tenantID")` set by the auth middleware and injects them into the Go `context.Context` using typed keys, making them available to every resolver.

```go
// routes/routes.go (addition)
api.Post("/graphql", middleware.Authenticate, graphqlHandler())
api.Get("/graphql", graphqlPlayground()) // disabled in production
```

### Backend: Schema

One `schema.graphqls` file with `Query` and `Mutation` root types. GORM models are mirrored as GraphQL types — only the fields each type needs to expose. Relationships (`Employee.user`, `Payroll.employee`, etc.) are expressed as nested GraphQL types so the frontend can request exactly what it needs in a single query.

### Backend: Role Enforcement

Role checks move from route-level middleware into resolver functions. Every mutation resolver that previously used `middleware.RequireRole("admin")` calls `auth.UserFromCtx(ctx)` and returns `ErrForbidden` if the role check fails. Every query resolver filters all DB queries by `tenant_id` from context.

```go
func (r *mutationResolver) CreateEmployee(ctx context.Context, input model.CreateEmployeeInput) (*model.Employee, error) {
    user := auth.UserFromCtx(ctx)
    if user.Role != "admin" {
        return nil, ErrForbidden
    }
    // DB logic here
}
```

### Backend: Error Handling

Resolvers return typed sentinel errors (`ErrForbidden`, `ErrNotFound`, `ErrValidation`). A custom gqlgen `ErrorPresenter` maps these to GraphQL error extensions:

```json
{
  "errors": [{ "message": "forbidden", "extensions": { "code": "FORBIDDEN" } }]
}
```

The frontend checks `error.graphQLErrors[0].extensions.code` — same pattern as checking HTTP status codes today.

---

## Frontend

### New Directory Structure

```
frontend/
  lib/
    apollo.ts               # ApolloClient singleton (replaces api.ts)
  graphql/
    queries/
      employees.ts          # gql`query ListEmployees { ... }`
      payroll.ts
      students.ts
      ...
    mutations/
      employees.ts          # gql`mutation CreateEmployee { ... }`
      payroll.ts
      ...
```

### Apollo Client Setup

`apollo.ts` replaces `api.ts`. An `authLink` reads JWT + `X-Tenant-ID` from localStorage and attaches them to every request — same behaviour as the current axios interceptor.

```ts
// lib/apollo.ts
const authLink = setContext((_, { headers }) => ({
  headers: {
    ...headers,
    Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
    "X-Tenant-ID": localStorage.getItem("tenantId") ?? "",
  },
}));

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

### Page Component Migration

Per batch, page components swap from:
```ts
useEffect(() => { api.get("/employees").then(setEmployees) }, [])
```
to:
```ts
const { data, loading, error } = useQuery(LIST_EMPLOYEES);
```

### Redux

Server-state Redux slices (employees, payroll, students, etc.) are removed as each batch migrates — Apollo's normalized `InMemoryCache` replaces them. UI-only state (modal open/closed, selected rows) stays in local component state.

### TypeScript Types

`types/index.ts` interfaces for migrated domains are replaced by gqlgen-generated types. Optionally, `graphql-codegen` on the frontend generates typed hooks (`useListEmployeesQuery`) for full end-to-end type safety.

---

## Migration Batches

REST routes are deleted only after the frontend for that batch is verified working (all pages in the batch render correct data in development, no console errors, no broken mutations). Each batch is independently shippable.

| Batch | Domains | REST routes deleted |
|-------|---------|-------------------|
| 1 | Employees + Departments + Users | `/employees`, `/departments`, `/users` |
| 2 | Payroll + Salary Structures | `/payroll`, `/salary-structures` |
| 3 | Students + Academic (subjects, exams, marks, results) | `/students`, `/subjects`, `/exams`, `/marks` |
| 4 | Attendance + Leaves + Leave Types + Leave Balances | `/attendance`, `/leaves`, `/leave-types`, `/leave-balances` |
| 5 | Fees (categories, structures, payments) | `/fee-categories`, `/fee-structures`, `/fee-payments` |
| 6 | Reports + Dashboard Charts | `/reports` |
| 7 | Timetable + Events + Announcements + Notifications | `/timetable`, `/events`, `/announcements`, `/notifications` |
| 8 | Hostel + Transport + Library | `/hostels`, `/transport`, `/library` |
| 9 | Auth + Org + Super Admin | `/auth`, `/org`, `/super` |

Auth (`/auth/login`, `/auth/me`) stays REST until Batch 9 — the frontend keeps using `authAPI` until then.

---

## Testing

Each `resolvers/*.go` file gets a `_test.go` counterpart. Tests call resolvers directly with a mock context carrying a test user and tenant — no HTTP layer needed, simpler than testing Fiber handlers.

GraphiQL playground is available at `GET /graphql` in development (disabled in production via `APP_ENV` env flag).

---

## Rollback Safety

Because REST routes are deleted per batch only after verification, any batch can be halted. The `/graphql` endpoint and remaining REST routes coexist without conflict throughout the migration.

---

## Dependencies to Add

**Backend:**
- `github.com/99designs/gqlgen`
- `github.com/vektah/gqlparser/v2`

**Frontend:**
- `@apollo/client`
- `graphql`
- (optional) `@graphql-codegen/cli` + `@graphql-codegen/typescript-react-apollo`
