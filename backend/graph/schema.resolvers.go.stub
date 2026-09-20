package graph

// schema.resolvers.go — the gqlgen stub.
//
// This project keeps every real resolver in a per-module graph/<module>.resolvers.go
// file. gqlgen's follow-schema layout does not know that: on each run it re-dumps
// every resolver here, which then collides with the module files. regen.sh resets
// this file back to the two resolvers that genuinely have nowhere else to live.
//
// Keep it that way. When you add a resolver, implement it in a module file.

import (
	"context"
)

// Placeholder backs `_placeholder`, a field that exists only so the root
// Mutation type is never empty (an empty type is invalid GraphQL). Nothing
// calls it; it returns nil rather than panicking so an introspection tool or a
// stray client query cannot take the server down.
func (r *mutationResolver) Placeholder(ctx context.Context) (*bool, error) {
	return nil, nil
}

// Health is the unauthenticated liveness probe: reaching a resolver at all
// means the HTTP stack, the GraphQL executor and the schema are up.
func (r *queryResolver) Health(ctx context.Context) (bool, error) {
	return true, nil
}
