# GraphQL Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working `/api/v1/graphql` endpoint using gqlgen on the Go/Fiber backend, and wire Apollo Client on the Next.js frontend — with no domain types yet, just the skeleton every subsequent batch plan builds on.

**Architecture:** gqlgen generates type-safe Go resolvers from a GraphQL schema file. The gqlgen HTTP handler is wrapped with `gofiber/adaptor/v2` to fit the Fiber server. A gqlgen `AroundOperations` middleware reads JWT claims stored by the existing `middleware.Authenticate` Fiber middleware (accessible via `fasthttp.RequestCtx` values) and re-injects them as a typed `AuthContext` struct used by all resolvers. Apollo Client on the frontend replaces `axios` for GraphQL queries/mutations as each batch migrates.

**Tech Stack:** Go 1.25 / Fiber v2 / gqlgen / gofiber-adaptor v2 / GORM / Next.js 14 / @apollo/client

**Spec:** `docs/superpowers/specs/2026-04-18-graphql-migration-design.md`

**Note — batch plans:** This plan covers infrastructure only. After it is complete, implement each migration batch using its own plan:
- Plan 2: Batch 1 — Employees + Departments + Users
- Plan 3: Batch 2 — Payroll + Salary Structures
- *(and so on per spec batch table)*

---

**Working directory note:** All `go` commands in this plan must be run from `Peepal/backend/`. All `npm` commands must be run from `Peepal/frontend/`. `git` commands can be run from the repo root.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `backend/graph/schema.graphqls` | Single source-of-truth GraphQL schema |
| Create | `backend/graph/resolver.go` | Root `Resolver` struct with `*gorm.DB` |
| Create | `backend/graph/auth_context.go` | Fiber→gqlgen context bridge + `AuthContext` type |
| Create | `backend/graph/errors.go` | Sentinel errors + custom `ErrorPresenter` |
| Create | `backend/graph/handler.go` | Fiber-compatible gqlgen + playground handlers |
| **Generated** | `backend/graph/generated.go` | gqlgen output — never hand-edit |
| **Generated** | `backend/graph/model/models_gen.go` | gqlgen model output — never hand-edit |
| **Generated** | `backend/graph/schema.resolvers.go` | gqlgen stub output — implement stubs here |
| Create | `backend/gqlgen.yml` | gqlgen codegen config |
| Modify | `backend/config/config.go` | Add `AppEnv` field |
| Modify | `backend/routes/routes.go` | Wire `/graphql` POST + playground GET |
| Create | `frontend/lib/apollo.ts` | `ApolloClient` singleton |
| Modify | `frontend/components/layout/Providers.tsx` | Wrap tree with `ApolloProvider` |

---

## Task 1: Add Go dependencies

**Files:**
- Modify: `backend/go.mod` (via `go get`)

- [ ] **Step 1: Install gqlgen and adaptor**

```bash
cd /path/to/CollERP/backend
go get github.com/99designs/gqlgen@latest
go get github.com/vektah/gqlparser/v2@latest
go get github.com/gofiber/adaptor/v2@latest
```

Expected: `go.mod` and `go.sum` updated with three new direct dependencies. No build errors.

- [ ] **Step 2: Tidy modules**

```bash
go mod tidy
```

Expected: clean exit, no "unused dependency" warnings about the new packages.

- [ ] **Step 3: Commit**

```bash
git add go.mod go.sum
git commit -m "chore: add gqlgen, gqlparser, and gofiber-adaptor dependencies"
```

---

## Task 2: Add `AppEnv` to config

The playground must be disabled in production. `APP_ENV=production` is the gate.

**Files:**
- Modify: `backend/config/config.go`

- [ ] **Step 1: Add `AppEnv` field to the `Config` struct and `Load()` function**

Open `backend/config/config.go`. Change:

```go
type Config struct {
	Port               string
	JWTSecret          string
	DBPath             string
	SuperAdminEmail    string
	SuperAdminPassword string
}
```

to:

```go
type Config struct {
	Port               string
	JWTSecret          string
	DBPath             string
	SuperAdminEmail    string
	SuperAdminPassword string
	AppEnv             string
}
```

And in `Load()`, add one line inside the `App = Config{...}` literal:

```go
AppEnv: getEnv("APP_ENV", "development"),
```

- [ ] **Step 2: Verify it compiles**

```bash
go build ./...
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add config/config.go
git commit -m "feat: add AppEnv to config for environment-gated features"
```

---

## Task 3: Create `gqlgen.yml`

**Files:**
- Create: `backend/gqlgen.yml`

- [ ] **Step 1: Create the config file**

Create `backend/gqlgen.yml` with:

```yaml
schema:
  - graph/schema.graphqls

exec:
  filename: graph/generated.go
  package: graph

model:
  filename: graph/model/models_gen.go
  package: model

resolver:
  layout: follow-schema
  dir: graph
  package: graph
  filename_template: "{name}.resolvers.go"

autobind: []
```

**What each field does:**
- `exec` — where gqlgen writes the executable schema (never edit this file)
- `model` — where gqlgen writes generated Go types for GraphQL types (never edit)
- `resolver.layout: follow-schema` — one resolver file per schema file; our single schema produces `graph/schema.resolvers.go`
- `autobind: []` — empty for now; batch plans will add model bindings to re-use GORM structs as GraphQL types

- [ ] **Step 2: Commit**

```bash
git add gqlgen.yml
git commit -m "chore: add gqlgen.yml codegen config"
```

---

## Task 4: Create the schema skeleton

**Files:**
- Create: `backend/graph/schema.graphqls`

- [ ] **Step 1: Create the directory and schema file**

```bash
mkdir -p backend/graph
```

Create `backend/graph/schema.graphqls` with:

```graphql
type Query {
  health: Boolean!
}

type Mutation {
  _placeholder: Boolean
}
```

`health` is the smoke-test query. `_placeholder` keeps the Mutation type valid; it will be replaced by real mutations in batch plans.

- [ ] **Step 2: Commit**

```bash
git add graph/schema.graphqls
git commit -m "feat: add initial GraphQL schema skeleton with health query"
```

---

## Task 5: Create the root `Resolver` struct

**Files:**
- Create: `backend/graph/resolver.go`

- [ ] **Step 1: Create `graph/resolver.go`**

```go
package graph

import "gorm.io/gorm"

// Resolver is the root resolver for all GraphQL operations.
// Every domain resolver file in this package embeds queryResolver or mutationResolver,
// which both embed this struct, giving all resolvers access to DB.
type Resolver struct {
	DB *gorm.DB
}
```

Do NOT add `queryResolver` or `mutationResolver` here — gqlgen generates those into `schema.resolvers.go`.

- [ ] **Step 2: Commit**

```bash
git add graph/resolver.go
git commit -m "feat: add root Resolver struct for gqlgen"
```

---

## Task 6: Run `gqlgen generate`

This step creates three generated files. Run it from the `backend/` directory.

**Files generated:**
- `backend/graph/generated.go` (never edit)
- `backend/graph/model/models_gen.go` (never edit)
- `backend/graph/schema.resolvers.go` (edit to implement stubs)

- [ ] **Step 1: Run the generator**

```bash
cd backend
go run github.com/99designs/gqlgen generate
```

Expected output: no errors. Three files appear:
- `graph/generated.go` (~500–1000 lines, the executable schema machinery)
- `graph/model/models_gen.go` (minimal since schema has no custom types yet)
- `graph/schema.resolvers.go` (stubs for `Health` and `Placeholder`)

- [ ] **Step 2: Verify it compiles**

```bash
go build ./...
```

Expected: build succeeds. If it fails because `Health` / `Placeholder` methods are missing implementations (they panic by default which is valid), the build still passes — panics are runtime, not compile errors.

- [ ] **Step 3: Add generated files + commit**

```bash
git add graph/generated.go graph/model/models_gen.go graph/schema.resolvers.go
git commit -m "feat: generate initial gqlgen boilerplate from schema skeleton"
```

---

## Task 7: Implement the `Health` resolver

`schema.resolvers.go` was generated with a panic stub. Replace it with a real implementation.

**Files:**
- Modify: `backend/graph/schema.resolvers.go`

- [ ] **Step 1: Open `graph/schema.resolvers.go` and find the Health stub**

It will look like:

```go
// Health is the resolver for the health field.
func (r *queryResolver) Health(ctx context.Context) (bool, error) {
	panic(fmt.Errorf("not implemented: Health - health"))
}
```

Replace the body:

```go
// Health is the resolver for the health field.
func (r *queryResolver) Health(ctx context.Context) (bool, error) {
	return true, nil
}
```

Also find and keep (do not delete) the `Placeholder` mutation stub — it panics, which is fine until it's replaced in a batch plan.

- [ ] **Step 2: Remove unused `fmt` import if present**

If `fmt` is imported only for the panic and is now unused, remove it from the import block.

- [ ] **Step 3: Build to confirm**

```bash
go build ./...
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add graph/schema.resolvers.go
git commit -m "feat: implement health resolver stub"
```

---

## Task 8: Create `graph/auth_context.go`

This is the Fiber → gqlgen context bridge. It works because `gofiber/adaptor/v2` passes `*fasthttp.RequestCtx` as the Go `context.Context` for the converted HTTP request. `fasthttp.RequestCtx.Value(key)` checks user values set via `c.Locals()` when the key is a plain string. So `ctx.Value("userID")` in a resolver returns what `middleware.Authenticate` set via `c.Locals("userID", ...)`.

**Files:**
- Create: `backend/graph/auth_context.go`

- [ ] **Step 1: Create the file**

```go
package graph

import "context"

type contextKey string

const authKey contextKey = "gqlAuthContext"

// AuthContext holds the authenticated user's claims for a single request.
// Populated by injectAuthContext from Fiber locals set by middleware.Authenticate.
type AuthContext struct {
	UserID      string
	Email       string
	Role        string
	TenantID    string
	IsSuperAdmin bool
}

// injectAuthContext reads Fiber locals (accessible via fasthttp.RequestCtx.Value)
// and re-injects them as a typed AuthContext under a safe typed key.
// Call this inside an AroundOperations gqlgen middleware.
func injectAuthContext(ctx context.Context) context.Context {
	auth := AuthContext{
		UserID:       stringVal(ctx, "userID"),
		Email:        stringVal(ctx, "email"),
		Role:         stringVal(ctx, "role"),
		TenantID:     stringVal(ctx, "tenantID"),
		IsSuperAdmin: boolVal(ctx, "isSuperAdmin"),
	}
	return context.WithValue(ctx, authKey, auth)
}

// AuthFromCtx retrieves the AuthContext from a resolver context.
// Returns a zero-value AuthContext if not set (unauthenticated request).
func AuthFromCtx(ctx context.Context) AuthContext {
	if auth, ok := ctx.Value(authKey).(AuthContext); ok {
		return auth
	}
	return AuthContext{}
}

func stringVal(ctx context.Context, key string) string {
	if v, ok := ctx.Value(key).(string); ok {
		return v
	}
	return ""
}

func boolVal(ctx context.Context, key string) bool {
	if v, ok := ctx.Value(key).(bool); ok {
		return v
	}
	return false
}
```

- [ ] **Step 2: Build**

```bash
go build ./...
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add graph/auth_context.go
git commit -m "feat: add Fiber-to-gqlgen auth context bridge"
```

---

## Task 9: Create `graph/errors.go`

**Files:**
- Create: `backend/graph/errors.go`

- [ ] **Step 1: Create the file**

```go
package graph

import (
	"context"
	"errors"

	"github.com/99designs/gqlgen/graphql"
	"github.com/vektah/gqlparser/v2/gqlerror"
)

var (
	ErrForbidden    = errors.New("forbidden")
	ErrNotFound     = errors.New("not found")
	ErrUnauthorized = errors.New("unauthorized")
)

// errorPresenter maps sentinel errors to GraphQL errors with extension codes.
// Attach this to the gqlgen server via srv.SetErrorPresenter(errorPresenter).
func errorPresenter(ctx context.Context, err error) *gqlerror.Error {
	switch {
	case errors.Is(err, ErrForbidden):
		return &gqlerror.Error{
			Message:    "forbidden",
			Extensions: map[string]interface{}{"code": "FORBIDDEN"},
		}
	case errors.Is(err, ErrNotFound):
		return &gqlerror.Error{
			Message:    "not found",
			Extensions: map[string]interface{}{"code": "NOT_FOUND"},
		}
	case errors.Is(err, ErrUnauthorized):
		return &gqlerror.Error{
			Message:    "unauthorized",
			Extensions: map[string]interface{}{"code": "UNAUTHORIZED"},
		}
	default:
		return graphql.DefaultErrorPresenter(ctx, err)
	}
}
```

- [ ] **Step 2: Build**

```bash
go build ./...
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add graph/errors.go
git commit -m "feat: add GraphQL error sentinel types and custom ErrorPresenter"
```

---

## Task 10: Create `graph/handler.go`

This wires the gqlgen server into a Fiber-compatible handler using `gofiber/adaptor/v2`.

**Files:**
- Create: `backend/graph/handler.go`

- [ ] **Step 1: Create the file**

```go
package graph

import (
	"context"

	"collegeerp/database"

	"github.com/99designs/gqlgen/graphql"
	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gofiber/adaptor/v2"
	"github.com/gofiber/fiber/v2"
)

// NewHandler returns a Fiber handler for POST /api/v1/graphql.
// Requires middleware.Authenticate to run first (it populates Fiber locals
// that injectAuthContext reads from the fasthttp request context).
func NewHandler() fiber.Handler {
	srv := handler.NewDefaultServer(NewExecutableSchema(Config{
		Resolvers: &Resolver{DB: database.DB},
	}))

	srv.AroundOperations(func(ctx context.Context, next graphql.OperationHandler) graphql.ResponseHandler {
		return next(injectAuthContext(ctx))
	})

	srv.SetErrorPresenter(errorPresenter)

	return adaptor.HTTPHandler(srv)
}

// NewPlayground returns a Fiber handler for GET /api/v1/graphql (GraphiQL UI).
// Should only be registered when AppEnv != "production".
func NewPlayground() fiber.Handler {
	h := playground.Handler("Peepal GraphQL", "/api/v1/graphql")
	return adaptor.HTTPHandler(h)
}
```

- [ ] **Step 2: Build**

```bash
go build ./...
```

Expected: clean. `NewExecutableSchema` and `Config` come from the generated `graph/generated.go` in the same package.

- [ ] **Step 3: Commit**

```bash
git add graph/handler.go
git commit -m "feat: add Fiber-compatible gqlgen handler with auth middleware bridge"
```

---

## Task 11: Wire `/graphql` in `routes/routes.go`

**Files:**
- Modify: `backend/routes/routes.go`

- [ ] **Step 1: Add the import**

Open `backend/routes/routes.go`. Add to the import block:

```go
"collegeerp/config"
"collegeerp/graph"
```

- [ ] **Step 2: Register the GraphQL routes**

At the bottom of the `Register` function, before the closing `}`, add:

```go
// ── GraphQL ─────────────────────────────────────────────────
api.Post("/graphql", middleware.Authenticate, graph.NewHandler())
if config.App.AppEnv != "production" {
    api.Get("/graphql", graph.NewPlayground())
}
```

The playground (GET) does not need auth — it serves only the browser HTML shell that then makes authenticated POST requests.

- [ ] **Step 3: Build**

```bash
go build ./...
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add routes/routes.go
git commit -m "feat: register /api/v1/graphql endpoint in Fiber routes"
```

---

## Task 12: Backend smoke test

- [ ] **Step 1: Start the backend**

```bash
go run main.go
```

Expected: `Server starting on port 8080` (or whatever PORT is set to).

- [ ] **Step 2: Get a JWT token via the login endpoint**

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@platform.com","password":"SuperAdmin@123"}' \
  | grep -o '"token":"[^"]*"'
```

Copy the token value.

- [ ] **Step 3: Hit the health query**

Replace `<TOKEN>` with the value from Step 2:

```bash
curl -s -X POST http://localhost:8080/api/v1/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"query":"{ health }"}' | python3 -m json.tool
```

Expected response:
```json
{
  "data": {
    "health": true
  }
}
```

- [ ] **Step 4: Verify playground loads (dev only)**

Open `http://localhost:8080/api/v1/graphql` in a browser.  
Expected: GraphiQL UI loads. Run `{ health }` in the UI — returns `{"data":{"health":true}}` after adding the `Authorization: Bearer <TOKEN>` header in the playground headers panel.

- [ ] **Step 5: Verify auth gate works**

```bash
curl -s -X POST http://localhost:8080/api/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ health }"}' | python3 -m json.tool
```

Expected: HTTP 401 from `middleware.Authenticate` (not a GraphQL error, a Fiber-level rejection).

---

## Task 13: Install Apollo Client (frontend)

**Files:**
- Modify: `frontend/package.json` (via npm)

- [ ] **Step 1: Install deps**

```bash
cd frontend
npm install @apollo/client graphql
```

Expected: `package.json` and `package-lock.json` updated. No peer dependency errors — `react` ^18 satisfies Apollo Client's peer requirement.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @apollo/client and graphql frontend dependencies"
```

---

## Task 14: Create `frontend/lib/apollo.ts`

**Files:**
- Create: `frontend/lib/apollo.ts`

- [ ] **Step 1: Create the file**

```ts
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/graphql`
    : "/api/v1/graphql",
});

const authLink = setContext((_, { headers }) => {
  const token =
    typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
  const tenantId =
    typeof window !== "undefined"
      ? (localStorage.getItem("tenantId") ?? "")
      : "";
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { "X-Tenant-ID": tenantId } : {}),
    },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

The URI logic mirrors `lib/api.ts`: uses `NEXT_PUBLIC_API_URL` in production, falls through to the Next.js rewrite proxy (`/api/v1/*` → `localhost:8080`) in local dev.

- [ ] **Step 2: Commit**

```bash
git add lib/apollo.ts
git commit -m "feat: add ApolloClient singleton with JWT and tenant auth link"
```

---

## Task 15: Add `ApolloProvider` to `Providers.tsx`

**Files:**
- Modify: `frontend/components/layout/Providers.tsx`

- [ ] **Step 1: Add imports**

Open `frontend/components/layout/Providers.tsx`. Add to the top of the import list:

```ts
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "@/lib/apollo";
```

- [ ] **Step 2: Wrap the tree**

Change the return from:

```tsx
return (
  <Provider store={store}>
    <ThemeProvider>
      {children}
      <Toaster ... />
    </ThemeProvider>
  </Provider>
);
```

to:

```tsx
return (
  <ApolloProvider client={apolloClient}>
    <Provider store={store}>
      <ThemeProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "500",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            },
            duration: 3500,
          }}
        />
      </ThemeProvider>
    </Provider>
  </ApolloProvider>
);
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: zero new TypeScript errors (there are 5 pre-existing errors unrelated to this change — those are acceptable).

- [ ] **Step 4: Dev server smoke test**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: app loads normally, no console errors about Apollo. The Redux store and existing REST-based pages are unaffected.

- [ ] **Step 5: Commit**

```bash
git add components/layout/Providers.tsx
git commit -m "feat: wrap app in ApolloProvider for GraphQL client access"
```

---

## Infrastructure Complete

At this point:
- `POST /api/v1/graphql` is live, authenticated, and returns `{"data":{"health":true}}`
- `GET /api/v1/graphql` shows GraphiQL in development
- Apollo Client is wired into the frontend app tree
- All existing REST routes and Redux-based pages are unchanged

**Next step:** Implement migration batch plans starting with Plan 2 (Batch 1: Employees + Departments + Users).
