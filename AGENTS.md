# CollERP / Peepal Project Conventions

## Prefer GraphQL over REST (always)

The backend exposes two APIs side by side: a GraphQL API (`backend/graph/`,
gqlgen, served at `POST /api/v1/graphql`) and older REST routes
(`backend/routes/routes.go` + `backend/handlers/`). Default all new work to
GraphQL.

- **Backend:** add features as gqlgen resolvers in a per-module
  `graph/<module>.resolvers.go` file. Do not add new REST routes or handlers
  unless GraphQL genuinely cannot serve the case (file streaming, third-party
  webhooks, etc.). The existing REST endpoints (auth/login, terminology,
  super-admin, bulk upload) stay as they are.
- **Frontend:** call GraphQL queries/mutations, not REST via axios.
- When extending an existing feature, match the API it already uses; default
  any net-new surface area to GraphQL.
