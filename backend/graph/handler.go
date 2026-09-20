package graph

import (
	"context"

	"collegeerp/agentclient"
	"collegeerp/config"
	"collegeerp/database"
	"collegeerp/presence"

	"github.com/99designs/gqlgen/graphql"
	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/lru"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gofiber/adaptor/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/vektah/gqlparser/v2/ast"
)

// Shared deps for system-update resolvers; set from routes.Register.
var (
	presenceHub *presence.Hub
	agentClient *agentclient.Client
)

// ConfigureUpdateDeps wires the presence hub and peepal-agent client used by
// systemUpdateStatus / snooze / apply resolvers.
func ConfigureUpdateDeps(hub *presence.Hub, agent *agentclient.Client) {
	presenceHub = hub
	agentClient = agent
}

// NewHandler returns a Fiber handler for POST /api/v1/graphql.
// Requires middleware.Authenticate to run first (it populates Fiber locals
// that injectAuthContext reads from the fasthttp request context).
//
// The server is configured explicitly (instead of handler.NewDefaultServer)
// so that schema introspection can be disabled in production.
func NewHandler() fiber.Handler {
	srv := handler.New(NewExecutableSchema(Config{
		Resolvers: &Resolver{
			DB:       database.DB,
			Presence: presenceHub,
			Agent:    agentClient,
		},
	}))

	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.POST{})
	srv.AddTransport(transport.MultipartForm{})
	srv.SetQueryCache(lru.New[*ast.QueryDocument](1000))
	srv.Use(extension.AutomaticPersistedQuery{Cache: lru.New[string](100)})

	// Introspection lets clients enumerate the whole schema; keep it as a
	// dev convenience only.
	if config.App.AppEnv != "production" {
		srv.Use(extension.Introspection{})
	}

	srv.AroundOperations(func(ctx context.Context, next graphql.OperationHandler) graphql.ResponseHandler {
		return next(injectAuthContext(ctx))
	})

	// Enforce the per-tenant role access matrix on every root query/mutation.
	// Runs after injectAuthContext (above) so auth claims are present.
	srv.AroundFields(accessFieldMiddleware)

	srv.SetErrorPresenter(errorPresenter)

	return adaptor.HTTPHandler(srv)
}

// NewPlayground returns a Fiber handler for GET /api/v1/graphql (GraphiQL UI).
// Should only be registered when AppEnv != "production".
func NewPlayground() fiber.Handler {
	h := playground.Handler("Peepal GraphQL", "/api/v1/graphql")
	return adaptor.HTTPHandler(h)
}
